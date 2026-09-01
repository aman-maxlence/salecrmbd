import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import DealService from '../modules/deal/service/DealService.js';
import DealController from '../modules/deal/controller/DealController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializeDealRoutes() {
    try {
        const models = Database.getModels();
        const dealService = new DealService(models);
        const dealController = new DealController(dealService);

        const viewDeals = PermissionMiddleware(['view_all_deals', 'manage_pipeline']);
        const manageDeals = PermissionMiddleware(['view_all_deals', 'manage_pipeline']);
        const attachItem = PermissionMiddleware(['view_inventory', 'manage_inventory']);

        router.get('/', AuthMiddleware, viewDeals, (req, res, next) => dealController.listDeals(req, res, next));
        router.post('/', AuthMiddleware, manageDeals, (req, res, next) => dealController.createDeal(req, res, next));
        router.get('/:id', AuthMiddleware, viewDeals, (req, res, next) => dealController.getDeal(req, res, next));
        router.post('/:id/line-items', AuthMiddleware, viewDeals, attachItem, (req, res, next) => dealController.addLineItem(req, res, next));
        router.delete('/:id/line-items/:lineId', AuthMiddleware, viewDeals, attachItem, (req, res, next) => dealController.removeLineItem(req, res, next));

        Logger.info('Deal routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing deal routes:', err);
        throw err;
    }
}

export default initializeDealRoutes;
