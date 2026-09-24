import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import NotificationService from '../modules/notifications/service/NotificationService.js';
import NotificationTemplateService from '../modules/notifications/service/NotificationTemplateService.js';
import NotificationController from '../modules/notifications/controller/NotificationController.js';
import NotificationTemplateController from '../modules/notifications/controller/NotificationTemplateController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/notifications. Admin-only "Email Activity" view -
 * NotificationLog was already written on every send (welcome/invite-accepted/
 * completion/deal-update/territory-update emails) but nothing ever read it
 * back before this - not even an API route existed. Also serves the
 * "Notification Templates" admin CRUD (subject/heading/body overrides).
 */
export async function initializeNotificationRoutes() {
    try {
        const models = Database.getModels();
        const notificationService = new NotificationService(models);
        const notificationController = new NotificationController(notificationService);
        const templateService = new NotificationTemplateService(models);
        const templateController = new NotificationTemplateController(templateService);

        router.get(
            '/log',
            AuthMiddleware,
            PermissionMiddleware('manage_organization_settings'),
            (req, res, next) => notificationController.listLog(req, res, next)
        );

        router.get(
            '/templates',
            AuthMiddleware,
            PermissionMiddleware('manage_organization_settings'),
            (req, res, next) => templateController.list(req, res, next)
        );
        router.put(
            '/templates/:type',
            AuthMiddleware,
            PermissionMiddleware('manage_organization_settings'),
            (req, res, next) => templateController.upsert(req, res, next)
        );
        router.delete(
            '/templates/:type',
            AuthMiddleware,
            PermissionMiddleware('manage_organization_settings'),
            (req, res, next) => templateController.reset(req, res, next)
        );

        Logger.info('Notification routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing notification routes:', err);
        throw err;
    }
}

export default initializeNotificationRoutes;
