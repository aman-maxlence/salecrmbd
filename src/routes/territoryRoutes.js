import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import TerritoryService from '../modules/territory/service/TerritoryService.js';
import TerritoryController from '../modules/territory/controller/TerritoryController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializeTerritoryRoutes() {
    try {
        const models = Database.getModels();
        const territoryService = new TerritoryService(models);
        const territoryController = new TerritoryController(territoryService);

        router.post('/', AuthMiddleware, PermissionMiddleware('manage_territories'), (req, res, next) => territoryController.createTerritory(req, res, next));
        router.get('/', AuthMiddleware, PermissionMiddleware('manage_territories'), (req, res, next) => territoryController.listTerritories(req, res, next));
        router.get('/:id', AuthMiddleware, PermissionMiddleware('manage_territories'), (req, res, next) => territoryController.getTerritory(req, res, next));
        router.put('/:id', AuthMiddleware, PermissionMiddleware('manage_territories'), (req, res, next) => territoryController.updateTerritory(req, res, next));
        router.delete('/:id', AuthMiddleware, PermissionMiddleware('manage_territories'), (req, res, next) => territoryController.deleteTerritory(req, res, next));

        Logger.info('Territory routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing territory routes:', err);
        throw err;
    }
}

export default initializeTerritoryRoutes;
