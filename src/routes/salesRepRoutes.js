import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import SalesRepService from '../modules/salesRep/service/SalesRepService.js';
import SalesRepController from '../modules/salesRep/controller/SalesRepController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializeSalesRepRoutes() {
    try {
        const models = Database.getModels();

        const salesRepService = new SalesRepService(models);
        const salesRepController = new SalesRepController(salesRepService);

        /**
         * @swagger
         * /sales-reps:
         *   get:
         *     summary: List active sales reps in the current organization
         *     tags: [SalesReps]
         *     responses:
         *       200:
         *         description: Sales reps fetched successfully
         */
        router.get('/', AuthMiddleware, (req, res, next) => salesRepController.listReps(req, res, next));

        Logger.info('Sales rep routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing sales rep routes:', err);
        throw err;
    }
}

export default initializeSalesRepRoutes;
