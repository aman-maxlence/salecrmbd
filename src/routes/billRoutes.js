import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import BillService from '../modules/purchasing/service/BillService.js';
import BillController from '../modules/purchasing/controller/BillController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializeBillRoutes() {
    try {
        const models = Database.getModels();
        const billService = new BillService(models);
        const controller = new BillController(billService);

        const view = PermissionMiddleware(['view_bills', 'manage_bills', 'record_bill_payments']);
        const manage = PermissionMiddleware('manage_bills');
        const pay = PermissionMiddleware('record_bill_payments');

        router.get('/', AuthMiddleware, view, (req, res, next) => controller.list(req, res, next));
        router.get('/:id', AuthMiddleware, view, (req, res, next) => controller.getById(req, res, next));
        router.put('/:id', AuthMiddleware, manage, (req, res, next) => controller.update(req, res, next));
        router.post('/:id/payments', AuthMiddleware, pay, (req, res, next) => controller.recordPayment(req, res, next));
        router.post('/:id/void', AuthMiddleware, manage, (req, res, next) => controller.void(req, res, next));

        Logger.info('Bill routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing bill routes:', err);
        throw err;
    }
}

export default initializeBillRoutes;
