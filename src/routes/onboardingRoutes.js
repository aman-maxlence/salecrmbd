import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import OnboardingService from '../modules/onboarding/service/OnboardingService.js';
import OnboardingController from '../modules/onboarding/controller/OnboardingController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/onboarding. Every screen is shown to every invited user
 * (design doc §4.1) so these routes only require AuthMiddleware by default -
 * the four routes below that gate a specific action (company/invites/
 * import/preferences) also carry the matching `PermissionMiddleware` as a
 * route-level defense-in-depth layer, on top of (not instead of) each
 * service method's own `_requirePermission` check - a crafted request from
 * a role that can't act on a step is rejected at the router before it ever
 * reaches the service, not just inside it (Security & Access Control
 * checklist item #2 - previously single-layer).
 */
export async function initializeOnboardingRoutes() {
    try {
        const models = Database.getModels();
        const onboardingService = new OnboardingService(models);
        const onboardingController = new OnboardingController(onboardingService);

        router.get('/state', AuthMiddleware, (req, res, next) => onboardingController.getState(req, res, next));
        router.put('/welcome', AuthMiddleware, (req, res, next) => onboardingController.saveWelcome(req, res, next));
        router.put('/profile', AuthMiddleware, (req, res, next) => onboardingController.saveProfile(req, res, next));
        router.put('/company', AuthMiddleware, PermissionMiddleware('manage_organization_settings'), (req, res, next) => onboardingController.saveCompany(req, res, next));
        router.post('/invites', AuthMiddleware, PermissionMiddleware('invite_users'), (req, res, next) => onboardingController.saveInvites(req, res, next));
        router.post('/import', AuthMiddleware, PermissionMiddleware('import_leads'), (req, res, next) => onboardingController.saveImport(req, res, next));
        router.put('/preferences', AuthMiddleware, PermissionMiddleware('manage_organization_settings'), (req, res, next) => onboardingController.savePreferences(req, res, next));
        router.post('/skip', AuthMiddleware, (req, res, next) => onboardingController.skip(req, res, next));
        router.post('/crm-basics/ack', AuthMiddleware, (req, res, next) => onboardingController.acknowledgeCrmBasics(req, res, next));
        router.post('/integrations/ack', AuthMiddleware, (req, res, next) => onboardingController.acknowledgeIntegrations(req, res, next));
        router.get('/review', AuthMiddleware, (req, res, next) => onboardingController.getReview(req, res, next));
        router.post('/review/confirm', AuthMiddleware, (req, res, next) => onboardingController.confirmReview(req, res, next));
        router.post('/complete', AuthMiddleware, (req, res, next) => onboardingController.complete(req, res, next));
        router.post('/track', AuthMiddleware, (req, res, next) => onboardingController.trackScreenViewed(req, res, next));
        router.post('/track-resumed', AuthMiddleware, (req, res, next) => onboardingController.trackResumed(req, res, next));

        Logger.info('Onboarding routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing onboarding routes:', err);
        throw err;
    }
}

export default initializeOnboardingRoutes;
