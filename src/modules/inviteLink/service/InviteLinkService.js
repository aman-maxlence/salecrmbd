import axios from 'axios';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import config from '../../../config/config.js';

class InviteLinkService {
    constructor(models) {
        this.models = models;
    }

    /**
     * The three admin-triggered userbd calls, mirroring
     * InvitationService's _requestUserServiceInvite - same ApiSecret +
     * ?user_id= pattern, just against the invite-link endpoints instead.
     */
    async _requestUserServiceLink(orgId, actingUserId) {
        const url = `${config.userService.url}/api/users/organizations/${orgId}/invite-link`;
        return this._callUserService('get', url, actingUserId);
    }

    async _requestUserServiceRegenerate(orgId, actingUserId) {
        const url = `${config.userService.url}/api/users/organizations/${orgId}/invite-link/regenerate`;
        return this._callUserService('post', url, actingUserId);
    }

    async _requestUserServiceRevoke(orgId, actingUserId) {
        const url = `${config.userService.url}/api/users/organizations/${orgId}/invite-link/revoke`;
        return this._callUserService('post', url, actingUserId);
    }

    async _callUserService(method, url, actingUserId) {
        try {
            const response = await axios.request({
                method,
                url,
                params: { user_id: actingUserId },
                headers: { Authorization: `Bearer ${config.userService.apiToken}` },
            });
            return response.data?.data ?? null;
        } catch (err) {
            if (err.response) {
                throw new AppError(
                    err.response.data?.message || 'User service rejected the invite-link request',
                    err.response.status,
                    err.response.data?.code || ErrorCode.VALIDATION_ERROR
                );
            }
            throw new AppError(`Failed to reach user service: ${err.message}`, 502, ErrorCode.SERVICE_UNAVAILABLE);
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

    async _defaultRoleId(orgId) {
        const { OrgRole } = this.models;
        const role = await OrgRole.findOne({
            where: { org_id: orgId, is_admin: false, is_default: true },
            order: [['id', 'ASC']],
        });
        if (!role) {
            throw new AppError('No default role configured for this org yet.', 409, ErrorCode.CONFLICT);
        }
        return role.id;
    }

    /**
     * Builds the shareable join URL from the locally-stored userbd token -
     * avoids needing a userbd round-trip just to redisplay an unchanged link.
     */
    _withUrl(inviteLink) {
        const plain = inviteLink.toJSON ? inviteLink.toJSON() : inviteLink;
        const token = plain.user_service_link_token;
        return {
            ...plain,
            url: token ? `${config.emailConfig.SHELL_FRONTEND_URL}/join/${token}` : null,
        };
    }

    /**
     * Get the org's link settings, creating the local row (and the userbd
     * token behind it) on first use.
     */
    async getOrCreateLink(orgId, actingUserId) {
        const { InviteLink, OrgRole, Territory } = this.models;

        let inviteLink = await InviteLink.findOne({
            where: { org_id: orgId },
            include: [{ model: OrgRole, as: 'role' }, { model: Territory, as: 'territory' }],
        });

        if (!inviteLink) {
            const roleId = await this._defaultRoleId(orgId);
            inviteLink = await InviteLink.create({
                org_id: orgId,
                role_id: roleId,
                territory_id: null,
                status: 'active',
                created_by: actingUserId,
            });
            inviteLink = await InviteLink.findOne({
                where: { id: inviteLink.id },
                include: [{ model: OrgRole, as: 'role' }, { model: Territory, as: 'territory' }],
            });
        }

        const userServiceLink = await this._requestUserServiceLink(orgId, actingUserId);
        if (userServiceLink?.token && userServiceLink.token !== inviteLink.user_service_link_token) {
            inviteLink.user_service_link_token = userServiceLink.token;
            await inviteLink.save();
        }

        return this._withUrl(inviteLink);
    }

    /**
     * Update the role/territory a link-joiner is assigned - purely local,
     * userbd has no concept of CRM roles/territories.
     */
    async updateLinkSettings(orgId, { roleId, territoryId }, actingUserId) {
        await this._validateRoleAndTerritory(orgId, roleId, territoryId);

        const { InviteLink, OrgRole, Territory } = this.models;
        let inviteLink = await InviteLink.findOne({ where: { org_id: orgId } });
        if (!inviteLink) {
            // Ensure the link (and its userbd token) exists before settings can be saved.
            await this.getOrCreateLink(orgId, actingUserId);
            inviteLink = await InviteLink.findOne({ where: { org_id: orgId } });
        }

        inviteLink.role_id = roleId;
        inviteLink.territory_id = territoryId ?? null;
        await inviteLink.save();

        const withAssociations = await InviteLink.findOne({
            where: { id: inviteLink.id },
            include: [{ model: OrgRole, as: 'role' }, { model: Territory, as: 'territory' }],
        });
        return this._withUrl(withAssociations);
    }

    async regenerateLink(orgId, actingUserId) {
        const userServiceLink = await this._requestUserServiceRegenerate(orgId, actingUserId);

        const { InviteLink, OrgRole, Territory } = this.models;
        let inviteLink = await InviteLink.findOne({ where: { org_id: orgId } });
        if (!inviteLink) {
            const roleId = await this._defaultRoleId(orgId);
            inviteLink = await InviteLink.create({
                org_id: orgId,
                role_id: roleId,
                territory_id: null,
                status: 'active',
                created_by: actingUserId,
            });
        }

        inviteLink.user_service_link_token = userServiceLink?.token ?? inviteLink.user_service_link_token;
        inviteLink.status = 'active';
        await inviteLink.save();

        const withAssociations = await InviteLink.findOne({
            where: { id: inviteLink.id },
            include: [{ model: OrgRole, as: 'role' }, { model: Territory, as: 'territory' }],
        });
        return this._withUrl(withAssociations);
    }

    async revokeLink(orgId, actingUserId) {
        await this._requestUserServiceRevoke(orgId, actingUserId);

        const { InviteLink, OrgRole, Territory } = this.models;
        const inviteLink = await InviteLink.findOne({ where: { org_id: orgId } });
        if (!inviteLink) {
            throw new AppError('No invite link exists for this org yet.', 404, ErrorCode.NOT_FOUND);
        }

        inviteLink.status = 'revoked';
        await inviteLink.save();

        const withAssociations = await InviteLink.findOne({
            where: { id: inviteLink.id },
            include: [{ model: OrgRole, as: 'role' }, { model: Territory, as: 'territory' }],
        });
        return this._withUrl(withAssociations);
    }
}

export default InviteLinkService;
