import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import InventorySettingsService from '../modules/inventory/service/InventorySettingsService.js';
import ItemService from '../modules/inventory/service/ItemService.js';
import StockService from '../modules/inventory/service/StockService.js';
import LowStockAlertService from '../modules/inventory/service/LowStockAlertService.js';
import InventoryController from '../modules/inventory/controller/InventoryController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializeInventoryRoutes() {
    try {
        const models = Database.getModels();
        const settingsService = new InventorySettingsService(models);
        const itemService = new ItemService(models);
        const stockService = new StockService(models);
        const alertService = new LowStockAlertService(models);
        const controller = new InventoryController({ settingsService, itemService, stockService, alertService });

        const view = PermissionMiddleware(['view_inventory', 'manage_inventory', 'adjust_stock', 'manage_inventory_settings']);
        const manage = PermissionMiddleware('manage_inventory');
        const settings = PermissionMiddleware(['manage_inventory_settings', 'manage_organization_settings']);
        const adjust = PermissionMiddleware('adjust_stock');

        router.get('/settings', AuthMiddleware, view, (req, res, next) => controller.getSettings(req, res, next));
        router.put('/settings', AuthMiddleware, settings, (req, res, next) => controller.updateSettings(req, res, next));

        router.post('/uoms', AuthMiddleware, settings, (req, res, next) => controller.createUom(req, res, next));
        router.put('/uoms/:id', AuthMiddleware, settings, (req, res, next) => controller.updateUom(req, res, next));
        router.delete('/uoms/:id', AuthMiddleware, settings, (req, res, next) => controller.deleteUom(req, res, next));

        router.post('/pricing-tiers', AuthMiddleware, settings, (req, res, next) => controller.createPricingTier(req, res, next));
        router.put('/pricing-tiers/:id', AuthMiddleware, settings, (req, res, next) => controller.updatePricingTier(req, res, next));
        router.delete('/pricing-tiers/:id', AuthMiddleware, settings, (req, res, next) => controller.deletePricingTier(req, res, next));

        router.post('/warehouses', AuthMiddleware, settings, (req, res, next) => controller.createWarehouse(req, res, next));
        router.put('/warehouses/:id', AuthMiddleware, settings, (req, res, next) => controller.updateWarehouse(req, res, next));
        router.delete('/warehouses/:id', AuthMiddleware, settings, (req, res, next) => controller.deleteWarehouse(req, res, next));

        router.get('/items', AuthMiddleware, view, (req, res, next) => controller.searchItems(req, res, next));
        router.post('/items', AuthMiddleware, manage, (req, res, next) => controller.createItem(req, res, next));
        router.get('/items/:id', AuthMiddleware, view, (req, res, next) => controller.getItem(req, res, next));
        router.put('/items/:id', AuthMiddleware, manage, (req, res, next) => controller.updateItem(req, res, next));
        router.delete('/items/:id', AuthMiddleware, manage, (req, res, next) => controller.deleteItem(req, res, next));

        router.post('/stock/adjust', AuthMiddleware, adjust, (req, res, next) => controller.adjustStock(req, res, next));
        router.get('/alerts', AuthMiddleware, view, (req, res, next) => controller.listAlerts(req, res, next));

        Logger.info('Inventory routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing inventory routes:', err);
        throw err;
    }
}

export default initializeInventoryRoutes;
