import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import 'dotenv/config';

import config from './config/config.js';
import swaggerSpec from './config/swagger.js';
import { Database } from './models/index.js';
import { RequestLogger, ErrorHandler } from './middleware/index.js';
import { Logger } from './utils/index.js';

const app = express();

app.use(helmet());
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(RequestLogger);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Sale CRM API Documentation',
}));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Root endpoint
 *     description: Basic service info. Not under the /api prefix.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service information
 */
app.get('/', (req, res) => {
    res.json({
        service: 'Sale CRM',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
    });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Sale CRM' });
});

async function startServer() {
    try {
        Logger.info('Initializing Sale CRM Service...');

        await Database.initialize();
        Logger.info('SQL and Redis databases initialized');

        await Database.sync();
        Logger.info('Database models synchronized');

        const { initializeAllRoutes } = await import('./routes/index.js');
        const allRoutes = await initializeAllRoutes();
        app.use('/api', allRoutes);
        Logger.info('All routes initialized');

        const { default: LowStockAlertService } = await import('./modules/inventory/service/LowStockAlertService.js');
        const alertIntervalMs = Number.parseInt(process.env.INVENTORY_ALERT_INTERVAL_MS, 10) || 5 * 60 * 1000;
        const runLowStockJob = async () => {
            try {
                const models = Database.getModels();
                const result = await new LowStockAlertService(models).runNotificationJob();
                Logger.info(`Low-stock alert job finished: orgs=${result.orgs} newlyNotified=${result.newlyNotified}`);
            } catch (err) {
                Logger.error('Low-stock alert job failed:', err);
            }
        };
        setTimeout(runLowStockJob, 15_000);
        setInterval(runLowStockJob, alertIntervalMs);
        Logger.info(`Low-stock alert job scheduled every ${alertIntervalMs}ms`);

        const { default: InvitationService } = await import('./modules/invitation/service/InvitationService.js');
        const invitationReminderIntervalMs = Number.parseInt(process.env.INVITATION_REMINDER_INTERVAL_MS, 10) || 6 * 60 * 60 * 1000;
        const runInvitationReminderJob = async () => {
            try {
                const models = Database.getModels();
                const result = await new InvitationService(models).runReminderJob();
                Logger.info(`Invitation reminder job finished: checked=${result.checked} remindersSent=${result.remindersSent}`);
            } catch (err) {
                Logger.error('Invitation reminder job failed:', err);
            }
        };
        setTimeout(runInvitationReminderJob, 25_000);
        setInterval(runInvitationReminderJob, invitationReminderIntervalMs);
        Logger.info(`Invitation reminder job scheduled every ${invitationReminderIntervalMs}ms`);

        const { default: OnboardingService } = await import('./modules/onboarding/service/OnboardingService.js');
        const abandonmentSweepIntervalMs = Number.parseInt(process.env.ONBOARDING_ABANDONMENT_SWEEP_INTERVAL_MS, 10) || 12 * 60 * 60 * 1000;
        const abandonmentThresholdDays = Number.parseInt(process.env.ONBOARDING_ABANDONMENT_THRESHOLD_DAYS, 10) || 7;
        const runAbandonmentSweepJob = async () => {
            try {
                const models = Database.getModels();
                const result = await new OnboardingService(models).runAbandonmentSweep({ thresholdDays: abandonmentThresholdDays });
                Logger.info(`Onboarding abandonment sweep finished: checked=${result.checked} tracked=${result.tracked}`);
            } catch (err) {
                Logger.error('Onboarding abandonment sweep failed:', err);
            }
        };
        setTimeout(runAbandonmentSweepJob, 30_000);
        setInterval(runAbandonmentSweepJob, abandonmentSweepIntervalMs);
        Logger.info(`Onboarding abandonment sweep scheduled every ${abandonmentSweepIntervalMs}ms`);

        const { default: TechnogexSyncService } = await import('./modules/technogex/service/TechnogexSyncService.js');
        const technogexSyncIntervalMs = Number.parseInt(process.env.TECHNOGEX_SYNC_INTERVAL_MS, 10) || 15 * 60 * 1000;
        const technogexFullResyncIntervalMs = Number.parseInt(process.env.TECHNOGEX_FULL_RESYNC_INTERVAL_MS, 10) || 24 * 60 * 60 * 1000;
        let lastTechnogexFullResync = 0;
        const runTechnogexSyncJob = async () => {
            try {
                const models = Database.getModels();
                const syncService = new TechnogexSyncService(models);
                const fullResync = Date.now() - lastTechnogexFullResync >= technogexFullResyncIntervalMs;
                if (fullResync) lastTechnogexFullResync = Date.now();
                const runs = await syncService.runSync('all', { fullResync });
                Logger.info(`Technogex sync job finished (fullResync=${fullResync}): ${runs.map((r) => `${r.family}=${r.status}`).join(', ')}`);
            } catch (err) {
                Logger.error('Technogex sync job failed:', err);
            }
        };
        setTimeout(runTechnogexSyncJob, 20_000);
        setInterval(runTechnogexSyncJob, technogexSyncIntervalMs);
        Logger.info(`Technogex sync job scheduled every ${technogexSyncIntervalMs}ms`);

        app.use((req, res) => {
            res.status(404).json({
                success: false,
                message: 'Route not found',
                statusCode: 404,
            });
        });

        app.use(ErrorHandler);

        const PORT = config.app.port || 3003;
        app.listen(PORT, () => {
            Logger.info(`Sale CRM Service running on port ${PORT}`);
            Logger.info(`Environment: ${config.app.env}`);
            Logger.info(`Swagger docs: http://localhost:${PORT}/api-docs`);
            Logger.info(`Database: ${config.database.database}@${config.database.host}`);
            Logger.info(`Redis: ${config.redis.host}:${config.redis.port}`);
        });
    } catch (error) {
        Logger.error('Failed to start Sale CRM Service:', error);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    Logger.info('Shutting down Sale CRM Service...');
    await Database.close();
    process.exit(0);
});

startServer();

export default app;
