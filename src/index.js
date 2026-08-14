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
