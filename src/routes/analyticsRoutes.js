import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import AnalyticsService from '../modules/analytics/service/AnalyticsService.js';
import AnalyticsController from '../modules/analytics/controller/AnalyticsController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * Mounted at /api/org/:orgId/analytics. Admin-only read side of the
 * Analytics & Tracking checklist - every onboarding event was already being
 * captured into analytics_events, but nothing anywhere ever queried it back
 * before this (no route, no controller, no admin view existed at all).
 */
export async function initializeAnalyticsRoutes() {
    try {
        const models = Database.getModels();
        const analyticsService = new AnalyticsService(models);
        const analyticsController = new AnalyticsController(analyticsService);

        router.get(
            '/onboarding-summary',
            AuthMiddleware,
            PermissionMiddleware('manage_organization_settings'),
            (req, res, next) => analyticsController.getOnboardingSummary(req, res, next)
        );

        Logger.info('Analytics routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing analytics routes:', err);
        throw err;
    }
}

export default initializeAnalyticsRoutes;
