import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import PortalUserService from '../modules/portalUser/service/PortalUserService.js';
import PortalUserController from '../modules/portalUser/controller/PortalUserController.js';
import OnboardingService from '../modules/onboarding/service/OnboardingService.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/users. GET /me has no permission gate beyond
 * auth - every user can see their own role/permissions - list/update are
 * gated by manage_users (design doc §3.4).
 */
export async function initializePortalUserRoutes() {
    try {
        const models = Database.getModels();
        const portalUserService = new PortalUserService(models);
        const onboardingService = new OnboardingService(models);
        const portalUserController = new PortalUserController(portalUserService, onboardingService);

        router.get('/me', AuthMiddleware, (req, res, next) => portalUserController.getMyProfile(req, res, next));
        router.patch('/me/context', AuthMiddleware, (req, res, next) => portalUserController.switchContext(req, res, next));
        router.get('/', AuthMiddleware, PermissionMiddleware('manage_users'), (req, res, next) => portalUserController.listUsers(req, res, next));
        router.patch('/:userId/role', AuthMiddleware, PermissionMiddleware('manage_users'), (req, res, next) => portalUserController.updateUserRoleOrTerritory(req, res, next));
        router.patch('/:userId/territory', AuthMiddleware, PermissionMiddleware('manage_users'), (req, res, next) => portalUserController.updateUserRoleOrTerritory(req, res, next));
        router.patch('/:userId/team', AuthMiddleware, PermissionMiddleware('manage_users'), (req, res, next) => portalUserController.updateUserRoleOrTerritory(req, res, next));
        router.patch('/:userId/manager', AuthMiddleware, PermissionMiddleware('manage_users'), (req, res, next) => portalUserController.updateUserRoleOrTerritory(req, res, next));
        router.patch('/:userId/onboarding/restart', AuthMiddleware, PermissionMiddleware('manage_users'), (req, res, next) => portalUserController.restartOnboarding(req, res, next));
        router.get('/:userId/onboarding', AuthMiddleware, PermissionMiddleware('manage_users'), (req, res, next) => portalUserController.getOnboardingDetail(req, res, next));
        router.post('/:userId/onboarding/steps/:step/reset', AuthMiddleware, PermissionMiddleware('manage_users'), (req, res, next) => portalUserController.resetOnboardingStep(req, res, next));
        router.post('/:userId/onboarding/force-complete', AuthMiddleware, PermissionMiddleware('manage_users'), (req, res, next) => portalUserController.forceCompleteOnboarding(req, res, next));
        router.delete('/:userId', AuthMiddleware, PermissionMiddleware('manage_users'), (req, res, next) => portalUserController.removeUser(req, res, next));

        Logger.info('Portal user routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing portal user routes:', err);
        throw err;
    }
}

export default initializePortalUserRoutes;
