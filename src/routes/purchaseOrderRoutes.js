import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import PurchaseOrderService from '../modules/purchasing/service/PurchaseOrderService.js';
import PurchaseOrderController from '../modules/purchasing/controller/PurchaseOrderController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializePurchaseOrderRoutes() {
    try {
        const models = Database.getModels();
        const purchaseOrderService = new PurchaseOrderService(models);
        const controller = new PurchaseOrderController(purchaseOrderService);

        const view = PermissionMiddleware(['view_purchase_orders', 'manage_purchase_orders']);
        const manage = PermissionMiddleware('manage_purchase_orders');
        const receive = PermissionMiddleware('receive_purchase_orders');

        router.get('/', AuthMiddleware, view, (req, res, next) => controller.list(req, res, next));
        router.post('/', AuthMiddleware, manage, (req, res, next) => controller.create(req, res, next));
        router.get('/:id', AuthMiddleware, view, (req, res, next) => controller.getById(req, res, next));
        router.post('/:id/cancel', AuthMiddleware, manage, (req, res, next) => controller.cancel(req, res, next));
        router.post('/:id/receive', AuthMiddleware, receive, (req, res, next) => controller.receive(req, res, next));

        Logger.info('Purchase order routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing purchase order routes:', err);
        throw err;
    }
}

export default initializePurchaseOrderRoutes;
