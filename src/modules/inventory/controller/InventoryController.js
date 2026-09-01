import ResponseFormatter from '../../../utils/ResponseFormatter.js';

class InventoryController {
    constructor({ settingsService, itemService, stockService, alertService }) {
        this.settingsService = settingsService;
        this.itemService = itemService;
        this.stockService = stockService;
        this.alertService = alertService;
    }

    _orgId(req) {
        return req.user?.org?.id;
    }

    _userId(req) {
        return req.user?.id ?? req.userId;
    }

    async getSettings(req, res, next) {
        try {
            const bundle = await this.settingsService.getBundle(this._orgId(req));
            return res.json(ResponseFormatter.success('Inventory settings fetched successfully', bundle, 200));
        } catch (err) {
            next(err);
        }
    }

    async updateSettings(req, res, next) {
        try {
            const bundle = await this.settingsService.updateSettings(this._orgId(req), req.body);
            return res.json(ResponseFormatter.success('Inventory settings updated successfully', bundle, 200));
        } catch (err) {
            next(err);
        }
    }

    async createUom(req, res, next) {
        try {
            const row = await this.settingsService.createUom(this._orgId(req), req.body);
            return res.json(ResponseFormatter.success('Unit of measure created successfully', row, 201));
        } catch (err) {
            next(err);
        }
    }

    async updateUom(req, res, next) {
        try {
            const row = await this.settingsService.updateUom(this._orgId(req), req.params.id, req.body);
            return res.json(ResponseFormatter.success('Unit of measure updated successfully', row, 200));
        } catch (err) {
            next(err);
        }
    }

    async deleteUom(req, res, next) {
        try {
            await this.settingsService.deleteUom(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Unit of measure deleted successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }

    async createPricingTier(req, res, next) {
        try {
            const row = await this.settingsService.createPricingTier(this._orgId(req), req.body);
            return res.json(ResponseFormatter.success('Pricing tier created successfully', row, 201));
        } catch (err) {
            next(err);
        }
    }

    async updatePricingTier(req, res, next) {
        try {
            const row = await this.settingsService.updatePricingTier(this._orgId(req), req.params.id, req.body);
            return res.json(ResponseFormatter.success('Pricing tier updated successfully', row, 200));
        } catch (err) {
            next(err);
        }
    }

    async deletePricingTier(req, res, next) {
        try {
            await this.settingsService.deletePricingTier(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Pricing tier deleted successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }

    async createWarehouse(req, res, next) {
        try {
            const row = await this.settingsService.createWarehouse(this._orgId(req), req.body);
            return res.json(ResponseFormatter.success('Warehouse created successfully', row, 201));
        } catch (err) {
            next(err);
        }
    }

    async updateWarehouse(req, res, next) {
        try {
            const row = await this.settingsService.updateWarehouse(this._orgId(req), req.params.id, req.body);
            return res.json(ResponseFormatter.success('Warehouse updated successfully', row, 200));
        } catch (err) {
            next(err);
        }
    }

    async deleteWarehouse(req, res, next) {
        try {
            await this.settingsService.deleteWarehouse(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Warehouse deleted successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }

    async searchItems(req, res, next) {
        try {
            const result = await this.itemService.searchItems(this._orgId(req), {
                q: req.query.q,
                category: req.query.category,
                status: req.query.status,
                groupByCategory: req.query.groupByCategory === 'true' || req.query.groupByCategory === '1',
            });
            return res.json(ResponseFormatter.success('Items fetched successfully', result, 200));
        } catch (err) {
            next(err);
        }
    }

    async createItem(req, res, next) {
        try {
            const item = await this.itemService.createItem(this._orgId(req), req.body, this._userId(req));
            return res.json(ResponseFormatter.success('Item created successfully', item, 201));
        } catch (err) {
            next(err);
        }
    }

    async getItem(req, res, next) {
        try {
            const item = await this.itemService.getItemById(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Item fetched successfully', item, 200));
        } catch (err) {
            next(err);
        }
    }

    async updateItem(req, res, next) {
        try {
            const item = await this.itemService.updateItem(this._orgId(req), req.params.id, req.body, this._userId(req));
            return res.json(ResponseFormatter.success('Item updated successfully', item, 200));
        } catch (err) {
            next(err);
        }
    }

    async deleteItem(req, res, next) {
        try {
            await this.itemService.deleteItem(this._orgId(req), req.params.id);
            return res.json(ResponseFormatter.success('Item archived successfully', null, 200));
        } catch (err) {
            next(err);
        }
    }

    async adjustStock(req, res, next) {
        try {
            const adjustment = await this.stockService.adjust(this._orgId(req), req.body, this._userId(req));
            return res.json(ResponseFormatter.success('Stock adjusted successfully', adjustment, 200));
        } catch (err) {
            next(err);
        }
    }

    async listAlerts(req, res, next) {
        try {
            const alerts = await this.alertService.listOpen(this._orgId(req));
            return res.json(ResponseFormatter.success('Low-stock alerts fetched successfully', alerts, 200));
        } catch (err) {
            next(err);
        }
    }
}

export default InventoryController;
