import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import UserPreferencesService from '../modules/userPreferences/service/UserPreferencesService.js';
import UserPreferencesController from '../modules/userPreferences/controller/UserPreferencesController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/user-preferences. No PermissionMiddleware on
 * either route - unlike company-details/workspace-settings (org-wide, admin
 * gated), this is always scoped to the caller's own (org_id, user_id) via
 * the session, the same self-scoping pattern as portalUserRoutes' /me -
 * there's no "manage someone else's preferences" concept to gate.
 */
export async function initializeUserPreferencesRoutes() {
    try {
        const models = Database.getModels();
        const userPreferencesService = new UserPreferencesService(models);
        const userPreferencesController = new UserPreferencesController(userPreferencesService);

        router.get('/', AuthMiddleware, (req, res, next) => userPreferencesController.getPreferences(req, res, next));
        router.put('/', AuthMiddleware, (req, res, next) => userPreferencesController.updatePreferences(req, res, next));

        Logger.info('User preferences routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing user preferences routes:', err);
        throw err;
    }
}

export default initializeUserPreferencesRoutes;
