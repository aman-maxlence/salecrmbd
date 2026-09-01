import { Logger } from '../../../utils/index.js';
import { SUPER_ADMIN_ROLE_NAME } from '../../../constants/roles.js';
import SalesRepService from '../../salesRep/service/SalesRepService.js';
import OrgRoleService from '../../orgRole/service/OrgRoleService.js';
import PortalUserService from '../../portalUser/service/PortalUserService.js';
import InvitationService from '../../invitation/service/InvitationService.js';

/**
 * Handles webhooks pushed from userbd. Each event findOrCreate's a local
 * SalesRep row (see ../../salesRep) - the local mirror every other module's
 * foreign keys point at, the same way maxpmbd mirrors users into
 * `portal_users` on the same two events.
 *
 * Also drives the Roles & Permissions / Onboarding provisioning added on
 * top of that (design doc §4.4): SETUP_ADMIN_USER seeds the org's default
 * roles and creates a Super Admin PortalUser; USER_INVITE_ACCEPTED matches
 * the pending Invitation and creates a PortalUser with the invited role.
 * Both are idempotent - safe against userbd's best-effort, fire-and-log,
 * possibly-duplicate delivery.
 */
export class WebhookService {
    constructor(models) {
        this.models = models;
        this.salesRepService = new SalesRepService(models);
        this.orgRoleService = new OrgRoleService(models);
        this.portalUserService = new PortalUserService(models);
        this.invitationService = new InvitationService(models);
    }

    _sequelize() {
        return this.models.SalesRep.sequelize;
    }

    /**
     * SETUP_ADMIN_USER - fired once, right after an org self-registers.
     * That user is the org's admin.
     */
    async handleAdminSetup(payload) {
        const { userId, orgId } = payload;

        return this._sequelize().transaction(async (transaction) => {
            const rep = await this.salesRepService.createOrGet(userId, orgId, { role: 'admin', transaction });

            const rolesByName = await this.orgRoleService.seedDefaultRolesForOrg(orgId, transaction);
            const superAdminRole = rolesByName[SUPER_ADMIN_ROLE_NAME];

            const portalUser = await this.portalUserService.createFromWebhook(
                { userId, orgId, roleId: superAdminRole.id, isDualAccess: true },
                transaction
            );

            const { default: InventorySettingsService } = await import('../../inventory/service/InventorySettingsService.js');
            const inventorySettingsService = new InventorySettingsService(this.models);
            await inventorySettingsService.ensureDefaults(orgId, transaction);

            Logger.info(`[WebhookService] SalesRep + Super Admin PortalUser ready for org ${orgId}, user ${userId} (salesRepId=${rep.id}, portalUserId=${portalUser.id})`);
            return { success: true, data: { userId, orgId, salesRepId: rep.id, portalUserId: portalUser.id } };
        });
    }

    /**
     * USER_INVITE_ACCEPTED - fired when an invited teammate accepts and sets
     * their password. They're a regular member, not the org admin. Their
     * PortalUser role comes from the matching pending Invitation, not a
     * hardcoded 'member' - the whole point of Roles & Permissions is that
     * an invitee can be any of the org's roles, not just admin/member.
     */
    async handleUserServiceInviteAccepted({ userId, orgId, emailId }) {
        const rep = await this.salesRepService.createOrGetMember(userId, orgId);

        const result = await this.invitationService.acceptInvitationFromWebhook(orgId, emailId, userId);
        if (!result) {
            Logger.warn(`[WebhookService] No matching pending invitation for org ${orgId} <${emailId}> - PortalUser was not created.`);
        }

        Logger.info(`[WebhookService] SalesRep ready for org ${orgId}, user ${userId} <${emailId}> (id=${rep.id}, role=member)`);
        return {
            success: true,
            data: { userId, orgId, emailId, salesRepId: rep.id, portalUserId: result?.portalUser?.id ?? null },
        };
    }

    /**
     * ORG_INVITE_LINK_JOINED - fired when someone joins via the org's
     * standing invite link (as opposed to a per-email invite). There's no
     * pending Invitation row to match against here - the role/territory
     * come straight off the matching local InviteLink row instead.
     */
    async handleOrgInviteLinkJoined({ userId, orgId, emailId, linkToken }) {
        const rep = await this.salesRepService.createOrGetMember(userId, orgId);

        const inviteLink = await this.models.InviteLink.findOne({
            where: { org_id: orgId, user_service_link_token: linkToken, status: 'active' },
        });

        let portalUser = null;
        if (!inviteLink) {
            Logger.warn(`[WebhookService] No matching active invite link for org ${orgId} (token ${linkToken}) - PortalUser was not created.`);
        } else {
            portalUser = await this.portalUserService.createFromWebhook({
                userId,
                orgId,
                roleId: inviteLink.role_id,
                territoryId: inviteLink.territory_id,
            });
        }

        Logger.info(`[WebhookService] SalesRep ready for org ${orgId}, user ${userId} <${emailId}> via invite link (id=${rep.id}, role=member)`);
        return {
            success: true,
            data: { userId, orgId, emailId, salesRepId: rep.id, portalUserId: portalUser?.id ?? null },
        };
    }

    async logWebhookEvent(type, payload, status, extra = {}) {
        // Swap for a persisted audit-log table if this needs to survive
        // process restarts (maxpmbd has one - see its errorLog module).
        if (status === 'success') {
            Logger.info(`[Webhook:${type}] ${status}`, payload);
        } else {
            Logger.error(`[Webhook:${type}] ${status}`, { payload, ...extra });
        }
    }
}

export default WebhookService;
