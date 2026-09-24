import axios from 'axios';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import config from '../../../config/config.js';
import { Logger } from '../../../utils/index.js';
import PortalUserService from '../../portalUser/service/PortalUserService.js';
import AuditLogService from '../../auditLog/service/AuditLogService.js';
import AnalyticsService from '../../analytics/service/AnalyticsService.js';
import NotificationService from '../../notifications/service/NotificationService.js';
import CompanyDetailsService from '../../companyDetails/service/CompanyDetailsService.js';
import { stripTags } from '../../../utils/sanitizeText.js';

const MAX_BULK_INVITES = 100;

// Mirrors the 7-day token expiry userbd owns (see Invitation.js's own
// comment) - this local flag is purely a display convenience so a stale
// pending invite doesn't just sit there looking identical to a fresh one;
// it doesn't change what userbd itself does with an expired token.
const INVITE_EXPIRY_DAYS = 7;

// "Send invitation reminders where applicable" - a pending invite gets
// nudged every REMINDER_INTERVAL_DAYS, up to MAX_REMINDERS times, and never
// once it's past INVITE_EXPIRY_DAYS (nudging about a dead token helps no
// one - the admin should resend instead, which issues a fresh token).
const REMINDER_INTERVAL_DAYS = 3;
const MAX_REMINDERS = 2;

class InvitationService {
    constructor(models) {
        this.models = models;
        this.portalUserService = new PortalUserService(models);
        this.auditLogService = new AuditLogService(models);
        this.analyticsService = new AnalyticsService(models);
        this.notificationService = new NotificationService(models);
        this.companyDetailsService = new CompanyDetailsService(models);
    }

    /**
     * Notifies userbd of a new invite so it can issue the token, send the
     * invite email, and enforce seat limits - the same call maxpmbd's
     * InviteService.requestUserServiceInvite makes. Returns userbd's invite id.
     */
    async _requestUserServiceInvite(orgId, email, invitingUserId, message) {
        const url = `${config.userService.url}/api/users/organizations/${orgId}/invites`;
        try {
            const response = await axios.post(
                url,
                { email, message: message || undefined },
                {
                    params: { product_id: config.productId, user_id: invitingUserId },
                    headers: { Authorization: `Bearer ${config.userService.apiToken}` },
                }
            );
            return response.data?.data?.inviteId ?? response.data?.data?.invite?.id ?? null;
        } catch (err) {
            if (err.response) {
                throw new AppError(
                    err.response.data?.message || 'User service rejected the invite',
                    err.response.status,
                    err.response.data?.code || ErrorCode.VALIDATION_ERROR
                );
            }
            throw new AppError(`Failed to create invite in user service: ${err.message}`, 502, ErrorCode.SERVICE_UNAVAILABLE);
        }
    }

    async _requestUserServiceResend(inviteId, orgId) {
        const url = `${config.userService.url}/api/users/invites/${inviteId}/resend`;
        try {
            await axios.post(
                url,
                { org_id: orgId },
                { headers: { Authorization: `Bearer ${config.userService.apiToken}` } }
            );
        } catch (err) {
            if (err.response) {
                throw new AppError(
                    err.response.data?.message || 'User service rejected the resend',
                    err.response.status,
                    err.response.data?.code || ErrorCode.VALIDATION_ERROR
                );
            }
            throw new AppError(`Failed to resend invite: ${err.message}`, 502, ErrorCode.SERVICE_UNAVAILABLE);
        }
    }

    /**
     * Validates role/territory/team all belong to this org, and that
     * territory+team are mutually consistent (a team only accepts members
     * from its own territory - same rule TeamService/updateRoleOrTerritory
     * enforce). Returns the resolved territoryId - if only a teamId is
     * given, the territory is derived from the team rather than left null.
     */
    async _validateRoleTerritoryTeam(orgId, roleId, territoryId, teamId) {
        const { OrgRole, Territory, Team } = this.models;
        const role = await OrgRole.findOne({ where: { id: roleId, org_id: orgId } });
        if (!role) {
            throw new AppError('Role not found in this org.', 400, ErrorCode.VALIDATION_ERROR);
        }

        let resolvedTerritoryId = territoryId ?? null;
        let team = null;
        if (teamId) {
            team = await Team.findOne({ where: { id: teamId, org_id: orgId } });
            if (!team) {
                throw new AppError('Team not found in this org.', 400, ErrorCode.VALIDATION_ERROR);
            }
            if (territoryId && String(territoryId) !== String(team.territory_id)) {
                throw new AppError(`"${team.name}" only accepts members from its own territory.`, 400, ErrorCode.VALIDATION_ERROR);
            }
            resolvedTerritoryId = team.territory_id;
        } else if (territoryId) {
            const territory = await Territory.findOne({ where: { id: territoryId, org_id: orgId } });
            if (!territory) {
                throw new AppError('Territory not found in this org.', 400, ErrorCode.VALIDATION_ERROR);
            }
        }

        return { role, resolvedTerritoryId };
    }

    /**
     * Prevents assigning a role more privileged than the inviter's own -
     * concretely, only an existing Super Admin can invite someone in as
     * another Super Admin (the schema's only hierarchy signal is the
     * boolean `is_admin` flag - Admin/Manager/Sales Rep/custom roles are
     * otherwise unranked, so this is the one enforceable rule today).
     */
    async _assertCanAssignRole(orgId, createdByUserId, targetRole) {
        if (!targetRole.is_admin) return;
        const actor = await this.portalUserService.getWithRole(createdByUserId, orgId);
        if (actor.role?.is_admin !== true) {
            throw new AppError('Only a Super Admin can invite someone in as a Super Admin.', 403, ErrorCode.FORBIDDEN);
        }
    }

    /**
     * Creates one Invitation row + calls out to userbd, all in a transaction
     * that rolls back the local row if the remote call fails (mirrors
     * maxpmbd's InviteService.createInvitation ordering).
     */
    async createInvitation(orgId, { email, roleId, territoryId, teamId, name, message }, createdByUserId) {
        const { Invitation } = this.models;
        const sequelize = Invitation.sequelize;

        return sequelize.transaction(async (transaction) => {
            const { role, resolvedTerritoryId } = await this._validateRoleTerritoryTeam(orgId, roleId, territoryId, teamId);
            await this._assertCanAssignRole(orgId, createdByUserId, role);

            const existing = await Invitation.findOne({
                where: { org_id: orgId, email, status: 'pending' },
                transaction,
            });
            if (existing) {
                throw new AppError(`An invite is already pending for ${email}.`, 409, ErrorCode.CONFLICT);
            }

            const invitation = await Invitation.create(
                {
                    org_id: orgId,
                    email,
                    role_id: roleId,
                    territory_id: resolvedTerritoryId,
                    team_id: teamId ?? null,
                    invitee_name: stripTags(name) || null,
                    status: 'pending',
                    created_by: createdByUserId,
                },
                { transaction }
            );

            const userServiceInviteId = await this._requestUserServiceInvite(orgId, email, createdByUserId, message);
            invitation.user_service_invite_id = userServiceInviteId ? String(userServiceInviteId) : null;
            await invitation.save({ transaction });

            return invitation;
        }).then(async (invitation) => {
            await this.auditLogService.record(orgId, createdByUserId, 'invitation.created', {
                entityType: 'invitation',
                entityId: invitation.id,
                details: { email: invitation.email, roleId: invitation.role_id, teamId: invitation.team_id },
            });
            await this.analyticsService.track(orgId, createdByUserId, 'invitation_created', {
                details: { roleId: invitation.role_id, teamId: invitation.team_id },
            });
            return invitation;
        });
    }

    /**
     * Each row is attempted independently - one row failing (e.g. already
     * pending, role not permitted) no longer aborts the whole batch, so
     * inviting 5 people where 1 email already has a pending invite still
     * creates the other 4 instead of creating none. Structural problems
     * with the request itself (empty batch, over the size cap, a row
     * missing email/roleId, an in-batch duplicate) still reject the whole
     * call - those aren't "this one invite failed," they're "this request
     * is malformed."
     */
    async createInvitationsBulk(orgId, invites, createdByUserId) {
        if (!Array.isArray(invites) || invites.length === 0) {
            throw new AppError('At least one invite is required.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (invites.length > MAX_BULK_INVITES) {
            throw new AppError(
                `Cannot invite more than ${MAX_BULK_INVITES} people at once (received ${invites.length}).`,
                400,
                ErrorCode.VALIDATION_ERROR
            );
        }

        const seen = new Set();
        for (const row of invites) {
            const email = (row.email || '').trim().toLowerCase();
            if (!email || !row.roleId) {
                throw new AppError('Every invite row requires an email and a roleId.', 400, ErrorCode.VALIDATION_ERROR);
            }
            if (seen.has(email)) {
                throw new AppError(`Duplicate email in the same batch: ${email}.`, 400, ErrorCode.VALIDATION_ERROR);
            }
            seen.add(email);
        }

        const created = [];
        const failed = [];
        for (const row of invites) {
            const email = row.email.trim().toLowerCase();
            try {
                created.push(await this.createInvitation(orgId, {
                    email,
                    roleId: row.roleId,
                    territoryId: row.territoryId,
                    teamId: row.teamId,
                    name: row.name,
                    message: row.message,
                }, createdByUserId));
            } catch (err) {
                failed.push({ email, message: err.message || 'Failed to create invite' });
            }
        }
        return { created, failed };
    }

    /** Display-only: flags a still-pending invite whose userbd token has likely expired (see INVITE_EXPIRY_DAYS). */
    _withComputedStatus(invitation) {
        const plain = invitation.toJSON ? invitation.toJSON() : invitation;
        const ageMs = Date.now() - new Date(plain.created_at).getTime();
        plain.is_expired = plain.status === 'pending' && ageMs > INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        return plain;
    }

    async listInvitations(orgId, status) {
        const { Invitation, OrgRole, Territory, Team } = this.models;
        const invitations = await Invitation.findAll({
            where: { org_id: orgId, ...(status && { status }) },
            include: [
                { model: OrgRole, as: 'role' },
                { model: Territory, as: 'territory' },
                { model: Team, as: 'team' },
            ],
            order: [['created_at', 'DESC']],
        });
        return invitations.map((i) => this._withComputedStatus(i));
    }

    async getInvitationById(orgId, invitationId) {
        const { Invitation } = this.models;
        const invitation = await Invitation.findOne({ where: { id: invitationId, org_id: orgId } });
        if (!invitation) {
            throw new AppError('Invitation not found.', 404, ErrorCode.NOT_FOUND);
        }
        return invitation;
    }

    async revokeInvitation(orgId, invitationId, actorUserId = null) {
        const invitation = await this.getInvitationById(orgId, invitationId);
        if (invitation.status !== 'pending') {
            throw new AppError('Only pending invitations can be revoked.', 409, ErrorCode.CONFLICT);
        }
        invitation.status = 'revoked';
        await invitation.save();
        await this.auditLogService.record(orgId, actorUserId, 'invitation.revoked', {
            entityType: 'invitation', entityId: invitation.id, details: { email: invitation.email },
        });
        return invitation;
    }

    _isReminderDue(invitation) {
        if (invitation.status !== 'pending') return false;
        const ageMs = Date.now() - new Date(invitation.created_at).getTime();
        if (ageMs > INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) return false;
        if ((invitation.reminder_count ?? 0) >= MAX_REMINDERS) return false;
        const sinceLastMs = Date.now() - new Date(invitation.last_reminder_sent_at ?? invitation.created_at).getTime();
        return sinceLastMs >= REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
    }

    /** Sends the reminder email and records the nudge on the invitation row - shared by the auto job and the manual action. */
    async _sendReminder(invitation) {
        const [inviter, companyDetails] = await Promise.all([
            this.portalUserService.getUserProfile(invitation.created_by).catch(() => ({ name: null })),
            this.companyDetailsService.getForOrg(invitation.org_id).catch(() => null),
        ]);

        const result = await this.notificationService.sendInvitationReminderEmail(invitation.org_id, {
            inviteeEmail: invitation.email,
            inviteeName: invitation.invitee_name,
            inviterName: inviter?.name || 'Someone at your organization',
            orgName: companyDetails?.companyName || 'the organization',
            acceptUrl: config.emailConfig.SALE_CRM_FRONTEND_URL,
        });

        invitation.reminder_count = (invitation.reminder_count ?? 0) + 1;
        invitation.last_reminder_sent_at = new Date();
        await invitation.save();
        return result;
    }

    /**
     * Periodic job (registered in src/index.js, mirrors LowStockAlertService's
     * runNotificationJob pattern): scans every still-pending invite across
     * every org and nudges whichever ones are due.
     */
    async runReminderJob() {
        const { Invitation } = this.models;
        const pending = await Invitation.findAll({ where: { status: 'pending' } });

        let remindersSent = 0;
        for (const invitation of pending) {
            if (!this._isReminderDue(invitation)) continue;
            try {
                await this._sendReminder(invitation);
                remindersSent += 1;
            } catch (err) {
                Logger.error(`[InvitationService] Failed to send reminder for invitation ${invitation.id}:`, err);
            }
        }
        return { checked: pending.length, remindersSent };
    }

    /** Manual "Send reminder now" action - ignores the interval cooldown/cap, but still refuses a revoked/accepted/expired invite. */
    async sendManualReminder(orgId, invitationId, actorUserId = null) {
        const invitation = await this.getInvitationById(orgId, invitationId);
        if (invitation.status !== 'pending') {
            throw new AppError('Only pending invitations can be reminded.', 409, ErrorCode.CONFLICT);
        }
        const ageMs = Date.now() - new Date(invitation.created_at).getTime();
        if (ageMs > INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
            throw new AppError('This invite has expired - resend it instead of sending a reminder.', 409, ErrorCode.CONFLICT);
        }

        await this._sendReminder(invitation);
        await this.auditLogService.record(orgId, actorUserId, 'invitation.reminder_sent', {
            entityType: 'invitation', entityId: invitation.id, details: { email: invitation.email },
        });
        return invitation;
    }

    async resendInvitation(orgId, invitationId, actorUserId = null) {
        const invitation = await this.getInvitationById(orgId, invitationId);
        if (invitation.status !== 'pending') {
            throw new AppError('Only pending invitations can be resent.', 409, ErrorCode.CONFLICT);
        }
        if (!invitation.user_service_invite_id) {
            throw new AppError('This invite has no user-service reference to resend.', 409, ErrorCode.CONFLICT);
        }
        await this._requestUserServiceResend(invitation.user_service_invite_id, orgId);
        await this.auditLogService.record(orgId, actorUserId, 'invitation.resent', {
            entityType: 'invitation', entityId: invitation.id, details: { email: invitation.email },
        });
        return invitation;
    }

    /**
     * Fired from the user-service-invite-accepted webhook. Idempotent
     * against duplicate delivery: if the invitation is already accepted (or
     * the PortalUser row already exists), this is a no-op success.
     */
    async acceptInvitationFromWebhook(orgId, email, userId) {
        const { Invitation } = this.models;
        const sequelize = Invitation.sequelize;

        const result = await sequelize.transaction(async (transaction) => {
            const invitation = await Invitation.findOne({
                where: { org_id: orgId, email, status: 'pending' },
                transaction,
            });

            if (!invitation) {
                Logger.warn(`[InvitationService] No pending invitation found for org ${orgId} <${email}> - webhook may be a duplicate delivery.`);
                return null;
            }

            const portalUser = await this.portalUserService.createFromWebhook(
                {
                    userId,
                    orgId,
                    roleId: invitation.role_id,
                    territoryId: invitation.territory_id,
                    teamId: invitation.team_id,
                    invitedByUserId: invitation.created_by,
                },
                transaction
            );

            invitation.status = 'accepted';
            invitation.user_id = userId;
            await invitation.save({ transaction });

            return { invitation, portalUser };
        });

        if (result) {
            // Notifications checklist #4 "notify users when invitations are
            // accepted" - tells the inviter, not the invitee (the invitee
            // already gets userbd's own acceptance flow). Also records the
            // real role/team assignment for Audit & History (item #4/#5) -
            // distinct from invitation.created's audit entry, which only
            // recorded the *intended* role/team at invite time.
            const { invitation } = result;
            await this.auditLogService.record(orgId, invitation.created_by, 'invitation.accepted', {
                entityType: 'invitation', entityId: invitation.id,
                details: { email, userId, roleId: invitation.role_id, teamId: invitation.team_id },
            });
            await this.analyticsService.track(orgId, userId, 'invitation_accepted', { details: { invitationId: invitation.id } });

            const companyDetails = await this.companyDetailsService.getForOrg(orgId).catch(() => null);
            this.notificationService
                .sendInvitationAcceptedEmail(orgId, invitation.created_by, {
                    inviteeName: invitation.invitee_name,
                    inviteeEmail: email,
                    orgName: companyDetails?.companyName || 'your organization',
                })
                .catch((err) => Logger.error('[InvitationService] invitation-accepted email failed:', err));
        }

        return result;
    }
}

export default InvitationService;
