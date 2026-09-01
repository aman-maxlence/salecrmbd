import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import WorkspaceSettingsService from '../modules/workspaceSettings/service/WorkspaceSettingsService.js';
import WorkspaceSettingsController from '../modules/workspaceSettings/controller/WorkspaceSettingsController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/workspace-settings. GET has no permission gate
 * beyond auth - every member needs to read the theme/font/start-page to
 * render the app correctly, not just admins. Only the write needs
 * manage_organization_settings.
 */
export async function initializeWorkspaceSettingsRoutes() {
    try {
        const models = Database.getModels();
        const workspaceSettingsService = new WorkspaceSettingsService(models);
        const workspaceSettingsController = new WorkspaceSettingsController(workspaceSettingsService);

        router.get('/', AuthMiddleware, (req, res, next) => workspaceSettingsController.getSettings(req, res, next));
        router.put('/', AuthMiddleware, PermissionMiddleware('manage_organization_settings'), (req, res, next) => workspaceSettingsController.updateSettings(req, res, next));

        Logger.info('Workspace settings routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing workspace settings routes:', err);
        throw err;
    }
}

export default initializeWorkspaceSettingsRoutes;
