import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import OrgRoleService from '../modules/orgRole/service/OrgRoleService.js';
import OrgRoleController from '../modules/orgRole/controller/OrgRoleController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/roles - orgId in the path is informational
 * only (matches the doc's URL shape); the actual org scope always comes
 * from req.user.org.id, never a client-supplied param, so Org A can never
 * touch Org B's roles by id-guessing (design doc §5/§6).
 */
export async function initializeOrgRoleRoutes() {
    try {
        const models = Database.getModels();
        const orgRoleService = new OrgRoleService(models);
        const orgRoleController = new OrgRoleController(orgRoleService);

        router.post('/', AuthMiddleware, PermissionMiddleware('manage_roles'), (req, res, next) => orgRoleController.createRole(req, res, next));
        router.get('/', AuthMiddleware, PermissionMiddleware(['view_roles', 'manage_roles']), (req, res, next) => orgRoleController.listRoles(req, res, next));
        router.get('/:id', AuthMiddleware, PermissionMiddleware(['view_roles', 'manage_roles']), (req, res, next) => orgRoleController.getRole(req, res, next));
        router.put('/:id', AuthMiddleware, PermissionMiddleware('manage_roles'), (req, res, next) => orgRoleController.updateRole(req, res, next));
        router.patch('/:id/permissions', AuthMiddleware, PermissionMiddleware('manage_roles'), (req, res, next) => orgRoleController.updatePermissions(req, res, next));
        router.delete('/:id', AuthMiddleware, PermissionMiddleware('manage_roles'), (req, res, next) => orgRoleController.deleteRole(req, res, next));
        router.get('/:id/audit-log', AuthMiddleware, PermissionMiddleware('manage_roles'), (req, res, next) => orgRoleController.getAuditLog(req, res, next));

        Logger.info('Org role routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing org role routes:', err);
        throw err;
    }
}

export default initializeOrgRoleRoutes;
