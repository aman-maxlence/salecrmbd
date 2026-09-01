import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import OnboardingService from '../modules/onboarding/service/OnboardingService.js';
import OnboardingController from '../modules/onboarding/controller/OnboardingController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/onboarding. Every screen is shown to every invited user
 * (design doc §4.1) so these routes only require AuthMiddleware - the
 * write endpoints re-check the relevant permission themselves inside
 * OnboardingService (company/invites/import/preferences), so a crafted
 * request from a role that can't act on a step is still rejected
 * server-side even if the UI were bypassed (design doc §4.3/§4/security §6).
 */
export async function initializeOnboardingRoutes() {
    try {
        const models = Database.getModels();
        const onboardingService = new OnboardingService(models);
        const onboardingController = new OnboardingController(onboardingService);

        router.get('/state', AuthMiddleware, (req, res, next) => onboardingController.getState(req, res, next));
        router.put('/profile', AuthMiddleware, (req, res, next) => onboardingController.saveProfile(req, res, next));
        router.put('/company', AuthMiddleware, (req, res, next) => onboardingController.saveCompany(req, res, next));
        router.post('/invites', AuthMiddleware, (req, res, next) => onboardingController.saveInvites(req, res, next));
        router.post('/import', AuthMiddleware, (req, res, next) => onboardingController.saveImport(req, res, next));
        router.put('/preferences', AuthMiddleware, (req, res, next) => onboardingController.savePreferences(req, res, next));
        router.post('/complete', AuthMiddleware, (req, res, next) => onboardingController.complete(req, res, next));

        Logger.info('Onboarding routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing onboarding routes:', err);
        throw err;
    }
}

export default initializeOnboardingRoutes;
