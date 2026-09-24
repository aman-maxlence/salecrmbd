import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import IntegrationService from '../modules/integrations/service/IntegrationService.js';
import IntegrationController from '../modules/integrations/controller/IntegrationController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/integrations. GET has no permission gate
 * beyond auth (every member can see what's connected), same reasoning as
 * business-preferences/company-details - only connect/disconnect need
 * manage_organization_settings.
 */
export async function initializeIntegrationRoutes() {
    try {
        const models = Database.getModels();
        const integrationService = new IntegrationService(models);
        const integrationController = new IntegrationController(integrationService);

        router.get('/', AuthMiddleware, (req, res, next) => integrationController.listProviders(req, res, next));
        router.post('/:providerKey/connect', AuthMiddleware, PermissionMiddleware('manage_organization_settings'), (req, res, next) => integrationController.connect(req, res, next));
        router.post('/:providerKey/disconnect', AuthMiddleware, PermissionMiddleware('manage_organization_settings'), (req, res, next) => integrationController.disconnect(req, res, next));

        Logger.info('Integration routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing integration routes:', err);
        throw err;
    }
}

export default initializeIntegrationRoutes;
