import express from 'express';
import { Database } from '../models/index.js';
import { WebhookController } from '../modules/webhook/controller/WebhookController.js';
import { WebhookService } from '../modules/webhook/service/WebhookService.js';
import { WebhookVerificationMiddleware } from '../middleware/WebhookVerificationMiddleware.js';
import {
    adminSetupValidation,
    inviteAcceptanceValidation,
    handleWebhookValidationErrors,
} from '../modules/webhook/validation/rules.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Receives events userbd fires on invite acceptance / registration, so this
 * product can react (currently just acknowledges - see WebhookService for why).
 */
export async function initializeWebhookRoutes() {
    try {
        const models = Database.getModels();

        const webhookService = new WebhookService(models);
        const webhookController = new WebhookController(webhookService);

        router.post(
            '/setup-admin-portal-user',
            WebhookVerificationMiddleware.verifyWebhookSignature,
            adminSetupValidation,
            handleWebhookValidationErrors,
            (req, res) => webhookController.handleAdminSetup(req, res)
        );

        router.post(
            '/user-service-invite-accepted',
            WebhookVerificationMiddleware.verifyWebhookSignature,
            inviteAcceptanceValidation,
            handleWebhookValidationErrors,
            (req, res) => webhookController.handleInviteAccepted(req, res)
        );

        Logger.info('Webhook routes registered');
        return router;
    } catch (error) {
        Logger.error('Error initializing webhook routes:', error);
        throw error;
    }
}

export default initializeWebhookRoutes;
