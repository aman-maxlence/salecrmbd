import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import BusinessPreferencesService from '../modules/businessPreferences/service/BusinessPreferencesService.js';
import BusinessPreferencesController from '../modules/businessPreferences/controller/BusinessPreferencesController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/business-preferences. GET has no permission
 * gate beyond auth - same reasoning as company-details/workspace-settings
 * (every member needs to read org-wide config, e.g. to know which modules
 * are enabled). Only the write needs manage_organization_settings.
 */
export async function initializeBusinessPreferencesRoutes() {
    try {
        const models = Database.getModels();
        const businessPreferencesService = new BusinessPreferencesService(models);
        const businessPreferencesController = new BusinessPreferencesController(businessPreferencesService);

        router.get('/', AuthMiddleware, (req, res, next) => businessPreferencesController.getPreferences(req, res, next));
        router.put('/', AuthMiddleware, PermissionMiddleware('manage_organization_settings'), (req, res, next) => businessPreferencesController.updatePreferences(req, res, next));

        Logger.info('Business preferences routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing business preferences routes:', err);
        throw err;
    }
}

export default initializeBusinessPreferencesRoutes;
