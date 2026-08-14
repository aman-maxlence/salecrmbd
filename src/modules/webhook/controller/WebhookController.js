import { Logger } from '../../../utils/index.js';

export class WebhookController {
    constructor(webhookService) {
        this.webhookService = webhookService;
    }

    /**
     * POST /webhooks/setup-admin-portal-user
     */
    async handleAdminSetup(req, res) {
        try {
            const payload = req.body;
            const result = await this.webhookService.handleAdminSetup(payload);

            await this.webhookService.logWebhookEvent('ADMIN_SETUP', { userId: payload.userId, orgId: payload.orgId }, 'success');

            return res.status(200).json({
                success: true,
                message: 'Admin setup acknowledged',
                data: result.data,
            });
        } catch (error) {
            Logger.error('[WebhookController] Error in handleAdminSetup:', error.message);
            await this.webhookService.logWebhookEvent('ADMIN_SETUP', req.body, 'error', { error: error.message });
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.code || 'ADMIN_SETUP_FAILED',
                message: error.message || 'Failed to process admin setup webhook',
            });
        }
    }

    /**
     * POST /webhooks/user-service-invite-accepted
     */
    async handleInviteAccepted(req, res) {
        try {
            const { userId, orgId, emailId } = req.body;
            const result = await this.webhookService.handleUserServiceInviteAccepted({ userId, orgId, emailId });

            await this.webhookService.logWebhookEvent('INVITE_ACCEPTED', { userId, orgId, emailId }, 'success');

            return res.status(200).json({
                success: true,
                message: 'Invite acceptance acknowledged',
                data: result.data,
            });
        } catch (error) {
            Logger.error('[WebhookController] Error in handleInviteAccepted:', error.message);
            await this.webhookService.logWebhookEvent('INVITE_ACCEPTED', req.body, 'error', { error: error.message });
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to process webhook',
            });
        }
    }
}

export default WebhookController;
