import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import PackageService from '../modules/salesOrder/service/PackageService.js';
import PackageController from '../modules/salesOrder/controller/PackageController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

/** A package is a sub-concept of its Sales Order, so it reuses the Sales Order permissions rather than minting new ones. */
export async function initializePackageRoutes() {
    try {
        const models = Database.getModels();
        const packageService = new PackageService(models);
        const controller = new PackageController(packageService);

        const view = PermissionMiddleware(['view_sales_orders', 'manage_sales_orders']);
        const manage = PermissionMiddleware(['manage_sales_orders', 'fulfill_sales_orders']);

        router.get('/', AuthMiddleware, view, (req, res, next) => controller.list(req, res, next));
        router.post('/', AuthMiddleware, manage, (req, res, next) => controller.create(req, res, next));
        router.get('/:id', AuthMiddleware, view, (req, res, next) => controller.getById(req, res, next));
        router.put('/:id/status', AuthMiddleware, manage, (req, res, next) => controller.updateStatus(req, res, next));

        Logger.info('Package routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing package routes:', err);
        throw err;
    }
}

export default initializePackageRoutes;
