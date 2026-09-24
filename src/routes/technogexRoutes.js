import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import TechnogexCatalogService from '../modules/technogex/service/TechnogexCatalogService.js';
import TechnogexSyncService from '../modules/technogex/service/TechnogexSyncService.js';
import TechnogexController from '../modules/technogex/controller/TechnogexController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializeTechnogexRoutes() {
    try {
        const models = Database.getModels();
        const catalogService = new TechnogexCatalogService(models);
        const syncService = new TechnogexSyncService(models);
        const controller = new TechnogexController({ catalogService, syncService, models });

        const view = PermissionMiddleware(['view_technogex_catalog', 'manage_technogex_sync']);
        const manageSync = PermissionMiddleware('manage_technogex_sync');

        router.get('/products', AuthMiddleware, view, (req, res, next) => controller.searchProducts(req, res, next));
        router.get('/design-items', AuthMiddleware, view, (req, res, next) => controller.searchDesignItems(req, res, next));
        router.get('/value-packs', AuthMiddleware, view, (req, res, next) => controller.searchValuePacks(req, res, next));

        router.get('/sync-runs', AuthMiddleware, manageSync, (req, res, next) => controller.listSyncRuns(req, res, next));
        router.post('/sync-runs/run', AuthMiddleware, manageSync, (req, res, next) => controller.triggerSync(req, res, next));

        Logger.info('Technogex routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing Technogex routes:', err);
        throw err;
    }
}

export default initializeTechnogexRoutes;
