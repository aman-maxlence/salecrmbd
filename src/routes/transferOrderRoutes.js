import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import TransferOrderService from '../modules/transferOrder/service/TransferOrderService.js';
import TransferOrderController from '../modules/transferOrder/controller/TransferOrderController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/**
 * A transfer order is a structured/tracked version of the existing ad hoc
 * stock-transfer (`POST /inventory/stock/adjust` with type:'transfer') - so
 * it's gated by the same permissions that already govern stock movement,
 * not new ones.
 */
export async function initializeTransferOrderRoutes() {
    try {
        const models = Database.getModels();
        const transferOrderService = new TransferOrderService(models);
        const controller = new TransferOrderController(transferOrderService);

        const view = PermissionMiddleware(['view_inventory', 'manage_inventory', 'adjust_stock']);
        const manage = PermissionMiddleware('manage_inventory');
        const move = PermissionMiddleware('adjust_stock');

        router.get('/', AuthMiddleware, view, (req, res, next) => controller.list(req, res, next));
        router.post('/', AuthMiddleware, manage, (req, res, next) => controller.create(req, res, next));
        router.get('/:id', AuthMiddleware, view, (req, res, next) => controller.getById(req, res, next));
        router.post('/:id/cancel', AuthMiddleware, manage, (req, res, next) => controller.cancel(req, res, next));
        router.post('/:id/ship', AuthMiddleware, move, (req, res, next) => controller.ship(req, res, next));
        router.post('/:id/receive', AuthMiddleware, move, (req, res, next) => controller.receive(req, res, next));

        Logger.info('Transfer order routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing transfer order routes:', err);
        throw err;
    }
}

export default initializeTransferOrderRoutes;
