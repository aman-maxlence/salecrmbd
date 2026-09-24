import express from 'express';
import { Database } from '../models/index.js';
import IntegrationService from '../modules/integrations/service/IntegrationService.js';
import IntegrationController from '../modules/integrations/controller/IntegrationController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/integrations/callback - deliberately NOT behind
 * AuthMiddleware. This is loaded by the third-party provider's own
 * redirect (a plain top-level browser navigation after the user approves
 * access on Google/Slack's own consent screen), which carries no bearer
 * token of ours - the signed `state` param (verified inside
 * IntegrationService.handleCallback) is the actual security boundary here,
 * the same role a CSRF token would play.
 */
export async function initializeIntegrationCallbackRoutes() {
    try {
        const models = Database.getModels();
        const integrationService = new IntegrationService(models);
        const integrationController = new IntegrationController(integrationService);

        router.get('/:providerKey', (req, res) => integrationController.callback(req, res));

        Logger.info('Integration callback route registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing integration callback route:', err);
        throw err;
    }
}

export default initializeIntegrationCallbackRoutes;
