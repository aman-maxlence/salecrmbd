import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PushService from '../modules/push/service/PushService.js';
import PushController from '../modules/push/controller/PushController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/push. Same self-scoping pattern as
 * userPreferencesRoutes - always the caller's own (org_id, user_id) via the
 * session, no "manage someone else's subscriptions" concept to gate.
 */
export async function initializePushRoutes() {
    try {
        const models = Database.getModels();
        const pushService = new PushService(models);
        const pushController = new PushController(pushService);

        router.get('/public-key', AuthMiddleware, (req, res, next) => pushController.getPublicKey(req, res, next));
        router.post('/subscribe', AuthMiddleware, (req, res, next) => pushController.subscribe(req, res, next));
        router.post('/unsubscribe', AuthMiddleware, (req, res, next) => pushController.unsubscribe(req, res, next));

        Logger.info('Push routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing push routes:', err);
        throw err;
    }
}

export default initializePushRoutes;
