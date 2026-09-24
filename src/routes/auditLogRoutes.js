import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import AuditLogService from '../modules/auditLog/service/AuditLogService.js';
import AuditLogController from '../modules/auditLog/controller/AuditLogController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/audit-log. Admin-only org-wide "Audit History"
 * view - AuditLogService.record has been writing rows for every tracked
 * action across the app (onboarding, invitations, integrations, role/team
 * assignments, admin overrides) but the only prior read path was a 50-row,
 * single-user-filtered slice buried inside one onboarding detail modal.
 */
export async function initializeAuditLogRoutes() {
    try {
        const models = Database.getModels();
        const auditLogService = new AuditLogService(models);
        const auditLogController = new AuditLogController(auditLogService);

        router.get(
            '/',
            AuthMiddleware,
            PermissionMiddleware('manage_organization_settings'),
            (req, res, next) => auditLogController.list(req, res, next)
        );

        Logger.info('Audit log routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing audit log routes:', err);
        throw err;
    }
}

export default initializeAuditLogRoutes;
