import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import VendorService from '../modules/purchasing/service/VendorService.js';
import VendorController from '../modules/purchasing/controller/VendorController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializeVendorRoutes() {
    try {
        const models = Database.getModels();
        const vendorService = new VendorService(models);
        const controller = new VendorController(vendorService);

        const view = PermissionMiddleware(['view_vendors', 'manage_vendors']);
        const manage = PermissionMiddleware('manage_vendors');

        router.get('/', AuthMiddleware, view, (req, res, next) => controller.list(req, res, next));
        router.post('/', AuthMiddleware, manage, (req, res, next) => controller.create(req, res, next));
        router.get('/:id', AuthMiddleware, view, (req, res, next) => controller.getById(req, res, next));
        router.put('/:id', AuthMiddleware, manage, (req, res, next) => controller.update(req, res, next));
        router.delete('/:id', AuthMiddleware, manage, (req, res, next) => controller.delete(req, res, next));

        Logger.info('Vendor routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing vendor routes:', err);
        throw err;
    }
}

export default initializeVendorRoutes;
