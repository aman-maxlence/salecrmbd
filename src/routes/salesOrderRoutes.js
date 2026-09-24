import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import SalesOrderService from '../modules/salesOrder/service/SalesOrderService.js';
import SalesOrderController from '../modules/salesOrder/controller/SalesOrderController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializeSalesOrderRoutes() {
    try {
        const models = Database.getModels();
        const salesOrderService = new SalesOrderService(models);
        const controller = new SalesOrderController(salesOrderService);

        const view = PermissionMiddleware(['view_sales_orders', 'manage_sales_orders']);
        const manage = PermissionMiddleware('manage_sales_orders');
        const fulfill = PermissionMiddleware('fulfill_sales_orders');

        router.get('/', AuthMiddleware, view, (req, res, next) => controller.list(req, res, next));
        router.post('/', AuthMiddleware, manage, (req, res, next) => controller.create(req, res, next));
        router.get('/:id', AuthMiddleware, view, (req, res, next) => controller.getById(req, res, next));
        router.post('/:id/cancel', AuthMiddleware, manage, (req, res, next) => controller.cancel(req, res, next));
        router.post('/:id/fulfill', AuthMiddleware, fulfill, (req, res, next) => controller.fulfill(req, res, next));

        Logger.info('Sales order routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing sales order routes:', err);
        throw err;
    }
}

export default initializeSalesOrderRoutes;
