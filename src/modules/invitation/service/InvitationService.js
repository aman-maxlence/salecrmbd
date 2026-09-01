import axios from 'axios';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import config from '../../../config/config.js';
import { Logger } from '../../../utils/index.js';
import PortalUserService from '../../portalUser/service/PortalUserService.js';

const MAX_BULK_INVITES = 100;

class InvitationService {
    constructor(models) {
        this.models = models;
        this.portalUserService = new PortalUserService(models);
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

    async _validateRoleAndTerritory(orgId, roleId, territoryId) {
        const { OrgRole, Territory } = this.models;
        const role = await OrgRole.findOne({ where: { id: roleId, org_id: orgId } });
        if (!role) {
            throw new AppError('Role not found in this org.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (territoryId) {
            const territory = await Territory.findOne({ where: { id: territoryId, org_id: orgId } });
            if (!territory) {
                throw new AppError('Territory not found in this org.', 400, ErrorCode.VALIDATION_ERROR);
            }
        }
    }

    /**
     * Creates one Invitation row + calls out to userbd, all in a transaction
     * that rolls back the local row if the remote call fails (mirrors
     * maxpmbd's InviteService.createInvitation ordering).
     */
    async createInvitation(orgId, { email, roleId, territoryId, message }, createdByUserId) {
        const { Invitation } = this.models;
        const sequelize = Invitation.sequelize;

        return sequelize.transaction(async (transaction) => {
            await this._validateRoleAndTerritory(orgId, roleId, territoryId);

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
                    territory_id: territoryId ?? null,
                    status: 'pending',
                    created_by: createdByUserId,
                },
                { transaction }
            );

            const userServiceInviteId = await this._requestUserServiceInvite(orgId, email, createdByUserId, message);
            invitation.user_service_invite_id = userServiceInviteId ? String(userServiceInviteId) : null;
            await invitation.save({ transaction });

            return invitation;
        });
    }

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
        for (const row of invites) {
            created.push(await this.createInvitation(orgId, {
                email: row.email.trim().toLowerCase(),
                roleId: row.roleId,
                territoryId: row.territoryId,
                message: row.message,
            }, createdByUserId));
        }
        return created;
    }

    async listInvitations(orgId, status) {
        const { Invitation, OrgRole, Territory } = this.models;
        return Invitation.findAll({
            where: { org_id: orgId, ...(status && { status }) },
            include: [
                { model: OrgRole, as: 'role' },
                { model: Territory, as: 'territory' },
            ],
            order: [['created_at', 'DESC']],
        });
    }

    async getInvitationById(orgId, invitationId) {
        const { Invitation } = this.models;
        const invitation = await Invitation.findOne({ where: { id: invitationId, org_id: orgId } });
        if (!invitation) {
            throw new AppError('Invitation not found.', 404, ErrorCode.NOT_FOUND);
        }
        return invitation;
    }

    async revokeInvitation(orgId, invitationId) {
        const invitation = await this.getInvitationById(orgId, invitationId);
        if (invitation.status !== 'pending') {
            throw new AppError('Only pending invitations can be revoked.', 409, ErrorCode.CONFLICT);
        }
        invitation.status = 'revoked';
        await invitation.save();
        return invitation;
    }

    async resendInvitation(orgId, invitationId) {
        const invitation = await this.getInvitationById(orgId, invitationId);
        if (invitation.status !== 'pending') {
            throw new AppError('Only pending invitations can be resent.', 409, ErrorCode.CONFLICT);
        }
        if (!invitation.user_service_invite_id) {
            throw new AppError('This invite has no user-service reference to resend.', 409, ErrorCode.CONFLICT);
        }
        await this._requestUserServiceResend(invitation.user_service_invite_id, orgId);
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

        return sequelize.transaction(async (transaction) => {
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
                },
                transaction
            );

            invitation.status = 'accepted';
            invitation.user_id = userId;
            await invitation.save({ transaction });

            return { invitation, portalUser };
        });
    }
}

export default InvitationService;
