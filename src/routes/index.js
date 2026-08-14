import express from 'express';
import { Logger } from '../utils/index.js';

const router = express.Router();

/**
 * Mounts every module's routes under /api. Add each new module here as it's
 * built out (Deals, Tasks, Meetings, Incentive, Tickets, Reports, Dashboard),
 * following the Sales Rep routes pattern below.
 */
export async function initializeAllRoutes() {
    try {
        const { default: initializeWebhookRoutes } = await import('./webhookRoutes.js');
        const webhookRoutes = await initializeWebhookRoutes();
        router.use('/webhooks', webhookRoutes);
        Logger.info('Webhook routes initialized');

        const { default: initializeSalesRepRoutes } = await import('./salesRepRoutes.js');
        const salesRepRoutes = await initializeSalesRepRoutes();
        router.use('/sales-reps', salesRepRoutes);
        Logger.info('Sales rep routes initialized');

        // Example for the next module to add:
        // const { default: initializeDealRoutes } = await import('./dealRoutes.js');
        // const dealRoutes = await initializeDealRoutes();
        // router.use('/deals', dealRoutes);

        return router;
    } catch (err) {
        Logger.error('Error initializing routes:', err);
        throw err;
    }
}

export default initializeAllRoutes;
