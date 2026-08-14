import { Logger } from '../../../utils/index.js';
import SalesRepService from '../../salesRep/service/SalesRepService.js';

/**
 * Handles webhooks pushed from userbd. Each event findOrCreate's a local
 * SalesRep row (see ../../salesRep) - the local mirror every other module's
 * foreign keys point at, the same way maxpmbd mirrors users into
 * `portal_users` on the same two events.
 */
export class WebhookService {
    constructor(models) {
        this.models = models;
        this.salesRepService = new SalesRepService(models);
    }

    /**
     * SETUP_ADMIN_USER - fired once, right after an org self-registers.
     * That user is the org's admin.
     */
    async handleAdminSetup(payload) {
        const { userId, orgId } = payload;
        const rep = await this.salesRepService.createOrGetAdmin(userId, orgId);
        Logger.info(`[WebhookService] SalesRep ready for org ${orgId}, user ${userId} (id=${rep.id}, role=admin)`);
        return { success: true, data: { userId, orgId, salesRepId: rep.id } };
    }

    /**
     * USER_INVITE_ACCEPTED - fired when an invited teammate accepts and sets
     * their password. They're a regular member, not the org admin.
     */
    async handleUserServiceInviteAccepted({ userId, orgId, emailId }) {
        const rep = await this.salesRepService.createOrGetMember(userId, orgId);
        Logger.info(`[WebhookService] SalesRep ready for org ${orgId}, user ${userId} <${emailId}> (id=${rep.id}, role=member)`);
        return { success: true, data: { userId, orgId, emailId, salesRepId: rep.id } };
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
