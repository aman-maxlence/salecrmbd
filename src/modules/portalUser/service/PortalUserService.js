import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { Redis } from '../../redis/Redis.js';
import AuditLogService from '../../auditLog/service/AuditLogService.js';

class PortalUserService {
    constructor(models) {
        this.models = models;
        this.auditLogService = new AuditLogService(models);
    }

    /**
     * Name/email aren't stored locally (PortalUser only holds userbd's
     * user_id) - userbd writes the full profile to the shared Redis cache
     * at `users:<id>` on every login/update (see its RedisSyncService),
     * so that's read here instead of round-tripping to userbd over HTTP.
     * Best-effort: a cache miss (never logged in, Redis flushed) just
     * leaves name/email null rather than failing the whole list.
     */
    async _attachUserProfiles(portalUsers) {
        const redisClient = Redis.getClient();
        const plain = portalUsers.map((pu) => (pu.toJSON ? pu.toJSON() : pu));

        await Promise.all(
            plain.map(async (pu) => {
                try {
                    const raw = await redisClient.get(`users:${pu.user_id}`);
                    const profile = raw ? JSON.parse(raw) : null;
                    pu.name = profile?.name ?? null;
                    pu.email = profile?.email ?? null;
                } catch {
                    pu.name = null;
                    pu.email = null;
                }
            })
        );

        return plain;
    }

    /** Single-user version of _attachUserProfiles' Redis lookup - for anything that just needs one user's name/email (e.g. NotificationService resolving who to email). Best-effort: returns nulls on a cache miss rather than throwing. */
    async getUserProfile(userId) {
        try {
            const redisClient = Redis.getClient();
            const raw = await redisClient.get(`users:${userId}`);
            const profile = raw ? JSON.parse(raw) : null;
            return { name: profile?.name ?? null, email: profile?.email ?? null };
        } catch {
            return { name: null, email: null };
        }
    }

    /**
     * Idempotent upsert used by both webhook handlers (SETUP_ADMIN_USER and
     * USER_INVITE_ACCEPTED) - safe against duplicate webhook delivery.
     * Always starts has_onboarded: false (design doc §4.1/§4.4).
     */
    async createFromWebhook({ userId, orgId, roleId, territoryId = null, teamId = null, isDualAccess = false, invitedByUserId = null }, transaction) {
        const { PortalUser } = this.models;
        const [portalUser] = await PortalUser.findOrCreate({
            where: { user_id: userId, org_id: orgId },
            defaults: {
                user_id: userId,
                org_id: orgId,
                role_id: roleId,
                territory_id: territoryId,
                team_id: teamId,
                status: 'active',
                has_onboarded: false,
                is_dual_access: isDualAccess,
                invited_by_user_id: invitedByUserId,
            },
            ...(transaction && { transaction }),
        });
        return portalUser;
    }

    /**
     * Resolves this PortalUser's inviter to a display name for the Welcome
     * screen's "You've been invited to {org} by {inviter}" copy (design doc
     * §4.2 Screen 1). Best-effort, same as _attachUserProfiles: returns null
     * rather than failing if there's no inviter, no cache entry, or Redis is
     * unreachable.
     */
    async getInviterName(orgId, userId) {
        const { PortalUser } = this.models;
        const portalUser = await PortalUser.findOne({
            where: { user_id: userId, org_id: orgId },
            attributes: ['invited_by_user_id'],
        });
        if (!portalUser?.invited_by_user_id) return null;

        try {
            const redisClient = Redis.getClient();
            const raw = await redisClient.get(`users:${portalUser.invited_by_user_id}`);
            const profile = raw ? JSON.parse(raw) : null;
            return profile?.name ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Loads the PortalUser + its OrgRole's permissions for a given
     * (userId, orgId) - the single query PermissionMiddleware and
     * getProfile both rely on. Throws if the webhook sync hasn't created
     * the row yet (same reasoning as SalesRepService.getSalesRepId).
     *
     * When the caller is dual-access and previewing as a user (see
     * switchContext below), `role` is swapped for the preview role's
     * permissions here - the one place this needs to happen, since every
     * permission check and the frontend's usePermissions() both read
     * through this. The real role stays available as `real_role` so the UI
     * can still show "previewing as X".
     */
    async getWithRole(userId, orgId) {
        const { PortalUser, OrgRole } = this.models;
        const portalUser = await PortalUser.findOne({
            where: { user_id: userId, org_id: orgId },
            include: [{ model: OrgRole, as: 'role' }],
        });
        if (!portalUser) {
            throw new AppError(
                'Your account has not finished syncing to Sale CRM yet. Please try again shortly.',
                404,
                ErrorCode.NOT_FOUND
            );
        }

        if (portalUser.is_dual_access && portalUser.active_context === 'user') {
            let previewRole = portalUser.preview_role_id
                ? await OrgRole.findOne({ where: { id: portalUser.preview_role_id, org_id: orgId } })
                : null;
            if (!previewRole) {
                previewRole = await OrgRole.findOne({
                    where: { org_id: orgId, is_admin: false, is_default: true },
                    order: [['id', 'ASC']],
                });
            }
            const plain = portalUser.toJSON();
            plain.real_role = plain.role;
            plain.role = previewRole ? previewRole.toJSON() : plain.role;
            return plain;
        }

        return portalUser;
    }

    /**
     * Toggles a dual-access user's active_context (admin <-> user), and
     * optionally which role to preview as while in user-context. Rejects
     * non-dual-access callers outright, and rejects previewing as another
     * admin role (defeats the point - the whole feature exists to see what
     * a regular member sees).
     */
    async switchContext(orgId, userId, { activeContext, previewRoleId } = {}) {
        const { PortalUser, OrgRole } = this.models;
        const portalUser = await PortalUser.findOne({ where: { user_id: userId, org_id: orgId } });
        if (!portalUser) {
            throw new AppError('User not found in this org.', 404, ErrorCode.NOT_FOUND);
        }
        if (!portalUser.is_dual_access) {
            throw new AppError('Only dual-access users can switch context.', 403, ErrorCode.FORBIDDEN);
        }

        if (activeContext !== undefined) {
            if (!['admin', 'user'].includes(activeContext)) {
                throw new AppError("activeContext must be 'admin' or 'user'.", 400, ErrorCode.VALIDATION_ERROR);
            }
            portalUser.active_context = activeContext;
        }

        if (previewRoleId !== undefined) {
            if (previewRoleId === null) {
                portalUser.preview_role_id = null;
            } else {
                const role = await OrgRole.findOne({ where: { id: previewRoleId, org_id: orgId } });
                if (!role) {
                    throw new AppError('Role not found in this org.', 404, ErrorCode.NOT_FOUND);
                }
                if (role.is_admin) {
                    throw new AppError('Cannot preview as an admin role.', 400, ErrorCode.VALIDATION_ERROR);
                }
                portalUser.preview_role_id = previewRoleId;
            }
        }

        await portalUser.save();
        return this.getWithRole(userId, orgId);
    }

    async getProfile(userId, orgId) {
        const { Territory } = this.models;
        const portalUser = await this.getWithRole(userId, orgId);
        if (portalUser.territory_id) {
            portalUser.territory = await Territory.findByPk(portalUser.territory_id);
        }
        return portalUser;
    }

    async listByOrg(orgId) {
        const { PortalUser, OrgRole, Territory } = this.models;
        const portalUsers = await PortalUser.findAll({
            where: { org_id: orgId, status: 'active' },
            include: [
                { model: OrgRole, as: 'role' },
                { model: Territory, as: 'territory' },
            ],
            order: [['created_at', 'ASC']],
        });
        return this._attachUserProfiles(portalUsers);
    }

    async updateRoleOrTerritory(orgId, userId, { roleId, territoryId, teamId, managerId }, actorUserId = null) {
        const { PortalUser, OrgRole, Team } = this.models;
        const portalUser = await PortalUser.findOne({ where: { user_id: userId, org_id: orgId } });
        if (!portalUser) {
            throw new AppError('User not found in this org.', 404, ErrorCode.NOT_FOUND);
        }

        const previousRoleId = portalUser.role_id;
        const previousTeamId = portalUser.team_id;

        if (roleId !== undefined) {
            // The org owner (is_dual_access is only ever set true by
            // WebhookService.handleAdminSetup, for the person who actually
            // created the org - never for an invited teammate) always keeps
            // Super Admin. Without this, an org could end up with nobody
            // holding it, or the owner losing access to their own org.
            if (portalUser.is_dual_access) {
                throw new AppError("The organization owner's role cannot be changed.", 403, ErrorCode.FORBIDDEN);
            }
            const role = await OrgRole.findOne({ where: { id: roleId, org_id: orgId } });
            if (!role) {
                throw new AppError('Role not found in this org.', 404, ErrorCode.NOT_FOUND);
            }
            portalUser.role_id = roleId;
        }
        if (territoryId !== undefined) {
            portalUser.territory_id = territoryId;
        }
        if (teamId !== undefined) {
            if (teamId === null) {
                portalUser.team_id = null;
            } else {
                const team = await Team.findOne({ where: { id: teamId, org_id: orgId } });
                if (!team) {
                    throw new AppError('Team not found in this org.', 404, ErrorCode.NOT_FOUND);
                }
                // A team only has members from its own territory - the
                // effective territory is whichever this same call is setting
                // it to, or the user's current one otherwise.
                const effectiveTerritoryId = territoryId !== undefined ? territoryId : portalUser.territory_id;
                if (String(team.territory_id) !== String(effectiveTerritoryId)) {
                    throw new AppError(
                        `"${team.name}" only accepts members from its own territory.`,
                        400,
                        ErrorCode.VALIDATION_ERROR
                    );
                }
                portalUser.team_id = teamId;
            }
        }
        if (managerId !== undefined) {
            if (managerId === null) {
                portalUser.manager_id = null;
            } else {
                if (String(managerId) === String(userId)) {
                    throw new AppError('A user cannot report to themselves.', 400, ErrorCode.VALIDATION_ERROR);
                }
                const manager = await PortalUser.findOne({ where: { user_id: managerId, org_id: orgId } });
                if (!manager) {
                    throw new AppError('Manager not found in this org.', 404, ErrorCode.NOT_FOUND);
                }
                portalUser.manager_id = managerId;
            }
        }

        await portalUser.save();

        // Audit & History checklist #4 "record role assignments" - a
        // distinct action from team changes, with both the previous and new
        // value, and only fired when the value genuinely changed (invite-time
        // role/team is already captured separately on invitation.created).
        if (roleId !== undefined && String(previousRoleId) !== String(portalUser.role_id)) {
            await this.auditLogService.record(orgId, actorUserId, 'portal_user.role_changed', {
                entityType: 'portal_user', entityId: portalUser.id,
                details: { targetUserId: userId, previousRoleId, newRoleId: portalUser.role_id },
            });
        }
        // Audit & History checklist #5 "record team assignments".
        if (teamId !== undefined && String(previousTeamId) !== String(portalUser.team_id)) {
            await this.auditLogService.record(orgId, actorUserId, 'portal_user.team_changed', {
                entityType: 'portal_user', entityId: portalUser.id,
                details: { targetUserId: userId, previousTeamId, newTeamId: portalUser.team_id },
            });
        }

        return portalUser;
    }

    /**
     * Soft-remove a member from this org: marks their PortalUser inactive
     * and clears their team so they stop showing up as a team member. Their
     * underlying userbd account is untouched (they may belong to other
     * orgs/products) - this only revokes their standing in this org.
     */
    async removeUser(orgId, userId, actingUserId) {
        const { PortalUser } = this.models;

        if (String(userId) === String(actingUserId)) {
            throw new AppError('You cannot remove yourself from the organization.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const portalUser = await PortalUser.findOne({ where: { user_id: userId, org_id: orgId } });
        if (!portalUser) {
            throw new AppError('User not found in this org.', 404, ErrorCode.NOT_FOUND);
        }

        if (portalUser.is_dual_access) {
            throw new AppError('The org owner cannot be removed.', 400, ErrorCode.VALIDATION_ERROR);
        }

        portalUser.status = 'inactive';
        portalUser.team_id = null;
        await portalUser.save();
        return portalUser;
    }

    async markOnboarded(orgId, userId, transaction) {
        const { PortalUser } = this.models;
        const portalUser = await PortalUser.findOne({
            where: { user_id: userId, org_id: orgId },
            ...(transaction && { transaction }),
        });
        if (!portalUser) {
            throw new AppError('User not found in this org.', 404, ErrorCode.NOT_FOUND);
        }
        portalUser.has_onboarded = true;
        await portalUser.save({ ...(transaction && { transaction }) });
        return portalUser;
    }

    async countCompletedOnboardingsInOrg(orgId, transaction) {
        const { PortalUser } = this.models;
        return PortalUser.count({ where: { org_id: orgId, has_onboarded: true }, ...(transaction && { transaction }) });
    }

    /**
     * Admin-authorised onboarding restart (checklist item not covered by
     * design doc §4): flips has_onboarded back to false and clears the
     * user's OnboardingState so their next /api/onboarding/state call
     * starts a fresh wizard from 'welcome' rather than resuming.
     */
    async restartOnboarding(orgId, userId, actorUserId = null) {
        const { PortalUser, OnboardingState } = this.models;
        const portalUser = await PortalUser.findOne({ where: { user_id: userId, org_id: orgId } });
        if (!portalUser) {
            throw new AppError('User not found in this org.', 404, ErrorCode.NOT_FOUND);
        }

        portalUser.has_onboarded = false;
        await portalUser.save();

        await OnboardingState.destroy({ where: { org_id: orgId, user_id: userId } });

        await this.auditLogService.record(orgId, actorUserId, 'onboarding.restarted', {
            entityType: 'portal_user', entityId: portalUser.id, details: { targetUserId: userId },
        });

        return portalUser;
    }
}

export default PortalUserService;
