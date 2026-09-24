import express from 'express';
import { Database } from '../models/index.js';
import AuthMiddleware from '../middleware/AuthMiddleware.js';
import PermissionMiddleware from '../middleware/PermissionMiddleware.js';
import InventorySettingsService from '../modules/inventory/service/InventorySettingsService.js';
import ItemService from '../modules/inventory/service/ItemService.js';
import StockService from '../modules/inventory/service/StockService.js';
import LowStockAlertService from '../modules/inventory/service/LowStockAlertService.js';
import CatalogLookupService from '../modules/inventory/service/CatalogLookupService.js';
import InventoryController from '../modules/inventory/controller/InventoryController.js';
import CatalogLookupController from '../modules/inventory/controller/CatalogLookupController.js';
import Logger from '../utils/Logger.js';

const router = express.Router();

export async function initializeInventoryRoutes() {
    try {
        const models = Database.getModels();
        const settingsService = new InventorySettingsService(models);
        const stockService = new StockService(models);
        const itemService = new ItemService(models, stockService);
        const alertService = new LowStockAlertService(models);
        const controller = new InventoryController({ settingsService, itemService, stockService, alertService });

        const categoryService = new CatalogLookupService(models, 'ItemCategory', 'category_id', true);
        const brandService = new CatalogLookupService(models, 'ItemBrand', 'brand_id', false);
        const manufacturerService = new CatalogLookupService(models, 'ItemManufacturer', 'manufacturer_id', false);
        const categoryController = new CatalogLookupController(categoryService, 'Category');
        const brandController = new CatalogLookupController(brandService, 'Brand');
        const manufacturerController = new CatalogLookupController(manufacturerService, 'Manufacturer');

        const view = PermissionMiddleware(['view_inventory', 'manage_inventory', 'adjust_stock', 'manage_inventory_settings']);
        const manage = PermissionMiddleware('manage_inventory');
        const settings = PermissionMiddleware(['manage_inventory_settings', 'manage_organization_settings']);
        const adjust = PermissionMiddleware('adjust_stock');
        const reports = PermissionMiddleware(['view_inventory', 'generate_reports']);

        router.get('/settings', AuthMiddleware, view, (req, res, next) => controller.getSettings(req, res, next));
        router.put('/settings', AuthMiddleware, settings, (req, res, next) => controller.updateSettings(req, res, next));
        router.post('/settings/reset', AuthMiddleware, settings, (req, res, next) => controller.resetSettings(req, res, next));

        router.post('/uoms', AuthMiddleware, settings, (req, res, next) => controller.createUom(req, res, next));
        router.put('/uoms/:id', AuthMiddleware, settings, (req, res, next) => controller.updateUom(req, res, next));
        router.delete('/uoms/:id', AuthMiddleware, settings, (req, res, next) => controller.deleteUom(req, res, next));

        router.post('/pricing-tiers', AuthMiddleware, settings, (req, res, next) => controller.createPricingTier(req, res, next));
        router.put('/pricing-tiers/:id', AuthMiddleware, settings, (req, res, next) => controller.updatePricingTier(req, res, next));
        router.delete('/pricing-tiers/:id', AuthMiddleware, settings, (req, res, next) => controller.deletePricingTier(req, res, next));

        router.get('/warehouses', AuthMiddleware, view, (req, res, next) => controller.listWarehouses(req, res, next));
        router.get('/warehouses/:id', AuthMiddleware, view, (req, res, next) => controller.getWarehouse(req, res, next));
        router.post('/warehouses', AuthMiddleware, settings, (req, res, next) => controller.createWarehouse(req, res, next));
        router.put('/warehouses/:id', AuthMiddleware, settings, (req, res, next) => controller.updateWarehouse(req, res, next));
        router.delete('/warehouses/:id', AuthMiddleware, settings, (req, res, next) => controller.deleteWarehouse(req, res, next));

        router.get('/items', AuthMiddleware, view, (req, res, next) => controller.searchItems(req, res, next));
        router.post('/items', AuthMiddleware, manage, (req, res, next) => controller.createItem(req, res, next));
        router.post('/items/image-presigned-url', AuthMiddleware, manage, (req, res, next) => controller.getItemImagePresignedUrl(req, res, next));
        router.get('/items/barcode/:code', AuthMiddleware, view, (req, res, next) => controller.getItemByBarcode(req, res, next));
        router.get('/items/:id', AuthMiddleware, view, (req, res, next) => controller.getItem(req, res, next));
        router.put('/items/:id', AuthMiddleware, manage, (req, res, next) => controller.updateItem(req, res, next));
        router.delete('/items/:id', AuthMiddleware, manage, (req, res, next) => controller.deleteItem(req, res, next));
        router.post('/items/:id/clone', AuthMiddleware, manage, (req, res, next) => controller.cloneItem(req, res, next));
        router.post('/items/:id/activate', AuthMiddleware, manage, (req, res, next) => controller.activateItem(req, res, next));
        router.get('/items/:id/stock-breakdown', AuthMiddleware, view, (req, res, next) => controller.getStockBreakdown(req, res, next));
        router.get('/items/:id/to-be-received', AuthMiddleware, view, (req, res, next) => controller.getToBeReceived(req, res, next));

        router.post('/stock/adjust', AuthMiddleware, adjust, (req, res, next) => controller.adjustStock(req, res, next));
        router.get('/stock/adjustments', AuthMiddleware, view, (req, res, next) => controller.listAdjustments(req, res, next));
        router.post('/stock/adjustments', AuthMiddleware, adjust, (req, res, next) => controller.createAdjustment(req, res, next));
        router.patch('/stock/adjustments/:id/apply', AuthMiddleware, adjust, (req, res, next) => controller.applyAdjustment(req, res, next));
        router.get('/alerts', AuthMiddleware, view, (req, res, next) => controller.listAlerts(req, res, next));

        router.get('/categories', AuthMiddleware, view, (req, res, next) => categoryController.list(req, res, next));
        router.post('/categories', AuthMiddleware, manage, (req, res, next) => categoryController.create(req, res, next));
        router.put('/categories/:id', AuthMiddleware, manage, (req, res, next) => categoryController.update(req, res, next));
        router.delete('/categories/:id', AuthMiddleware, manage, (req, res, next) => categoryController.delete(req, res, next));

        router.get('/brands', AuthMiddleware, view, (req, res, next) => brandController.list(req, res, next));
        router.post('/brands', AuthMiddleware, manage, (req, res, next) => brandController.create(req, res, next));
        router.put('/brands/:id', AuthMiddleware, manage, (req, res, next) => brandController.update(req, res, next));
        router.delete('/brands/:id', AuthMiddleware, manage, (req, res, next) => brandController.delete(req, res, next));

        router.get('/manufacturers', AuthMiddleware, view, (req, res, next) => manufacturerController.list(req, res, next));
        router.post('/manufacturers', AuthMiddleware, manage, (req, res, next) => manufacturerController.create(req, res, next));
        router.put('/manufacturers/:id', AuthMiddleware, manage, (req, res, next) => manufacturerController.update(req, res, next));
        router.delete('/manufacturers/:id', AuthMiddleware, manage, (req, res, next) => manufacturerController.delete(req, res, next));

        router.get('/reports/stock-summary', AuthMiddleware, reports, (req, res, next) => controller.getStockSummaryReport(req, res, next));
        router.get('/reports/valuation', AuthMiddleware, reports, (req, res, next) => controller.getValuationReport(req, res, next));
        router.get('/reports/committed-stock', AuthMiddleware, reports, (req, res, next) => controller.getCommittedStockReport(req, res, next));

        Logger.info('Inventory routes registered');
        return router;
    } catch (err) {
        Logger.error('Error initializing inventory routes:', err);
        throw err;
    }
}

export default initializeInventoryRoutes;
