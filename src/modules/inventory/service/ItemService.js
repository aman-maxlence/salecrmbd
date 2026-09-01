import { Op } from 'sequelize';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { toNumber } from '../../../constants/inventory.js';
import InventorySettingsService from './InventorySettingsService.js';

class ItemService {
    constructor(models) {
        this.models = models;
        this.settingsService = new InventorySettingsService(models);
    }

    async createItem(orgId, payload, changedBy) {
        await this.settingsService.ensureDefaults(orgId);
        const fields = await this._catalogFields(orgId);
        const attrs = await this._validateItemPayload(orgId, payload, fields, true);

        const { InventoryItem } = this.models;
        const existing = await InventoryItem.findOne({ where: { org_id: orgId, sku: attrs.sku } });
        if (existing) {
            throw new AppError(`An item with SKU "${attrs.sku}" already exists.`, 409, ErrorCode.CONFLICT);
        }

        const item = await InventoryItem.create({ org_id: orgId, ...attrs });
        await this._recordPrice(orgId, item.id, attrs.unit_price, changedBy);
        return this.getItemById(orgId, item.id);
    }

    async updateItem(orgId, itemId, payload, changedBy) {
        const item = await this._findItem(orgId, itemId);
        const fields = await this._catalogFields(orgId);
        const attrs = await this._validateItemPayload(orgId, payload, fields, false);

        if (attrs.sku && attrs.sku !== item.sku) {
            const existing = await this.models.InventoryItem.findOne({
                where: { org_id: orgId, sku: attrs.sku, id: { [Op.ne]: item.id } },
            });
            if (existing) throw new AppError(`An item with SKU "${attrs.sku}" already exists.`, 409, ErrorCode.CONFLICT);
        }

        const priceChanged = attrs.unit_price !== undefined && toNumber(attrs.unit_price) !== toNumber(item.unit_price);
        Object.assign(item, attrs);
        await item.save();
        if (priceChanged) {
            await this._recordPrice(orgId, item.id, item.unit_price, changedBy);
        }
        return this.getItemById(orgId, item.id);
    }

    async deleteItem(orgId, itemId) {
        const item = await this._findItem(orgId, itemId);
        const { DealLineItem } = this.models;
        const onDeals = await DealLineItem.count({ where: { org_id: orgId, item_id: itemId } });
        if (onDeals > 0) {
            throw new AppError(`This item is attached to ${onDeals} deal line(s). Remove those first.`, 409, ErrorCode.CONFLICT);
        }
        item.status = 'inactive';
        await item.save();
        return item;
    }

    async searchItems(orgId, { q, category, status, groupByCategory } = {}) {
        const { InventoryItem, StockLevel, UnitOfMeasure, PricingTier } = this.models;
        const where = { org_id: orgId };
        if (status) where.status = status;
        else where.status = 'active';
        if (category) where.category = category;
        if (q?.trim()) {
            const like = { [Op.like]: `%${q.trim()}%` };
            where[Op.or] = [{ sku: like }, { name: like }, { category: like }];
        }

        const items = await InventoryItem.findAll({
            where,
            include: [
                { model: UnitOfMeasure, as: 'uom', required: false },
                { model: PricingTier, as: 'pricingTier', required: false },
                { model: StockLevel, as: 'stockLevels', required: false },
            ],
            order: [['name', 'ASC']],
        });

        const serialized = items.map((item) => this._serializeListItem(item));
        const categories = [...new Set(serialized.map((i) => i.category).filter(Boolean))].sort();

        if (groupByCategory) {
            const groups = {};
            for (const item of serialized) {
                const key = item.category || 'Uncategorized';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            }
            return { items: serialized, categories, groups };
        }

        return { items: serialized, categories };
    }

    async getItemById(orgId, itemId) {
        const { InventoryItem, StockLevel, Warehouse, UnitOfMeasure, PricingTier, ItemPriceHistory, DealLineItem, Deal } = this.models;
        const item = await InventoryItem.findOne({
            where: { id: itemId, org_id: orgId },
            include: [
                { model: UnitOfMeasure, as: 'uom', required: false },
                { model: PricingTier, as: 'pricingTier', required: false },
                {
                    model: StockLevel,
                    as: 'stockLevels',
                    required: false,
                    include: [{ model: Warehouse, as: 'warehouse', required: false }],
                },
                { model: ItemPriceHistory, as: 'priceHistory', required: false, separate: true, order: [['created_at', 'DESC']] },
                {
                    model: DealLineItem,
                    as: 'dealLineItems',
                    required: false,
                    include: [{ model: Deal, as: 'deal', required: false }],
                },
            ],
        });
        if (!item) throw new AppError('Item not found.', 404, ErrorCode.NOT_FOUND);
        return item;
    }

    async _findItem(orgId, itemId) {
        const item = await this.models.InventoryItem.findOne({ where: { id: itemId, org_id: orgId } });
        if (!item) throw new AppError('Item not found.', 404, ErrorCode.NOT_FOUND);
        return item;
    }

    async _catalogFields(orgId) {
        const bundle = await this.settingsService.getBundle(orgId);
        return bundle.settings.catalog_fields || {};
    }

    async _validateItemPayload(orgId, payload, fields, isCreate) {
        const required = (key) => fields[key]?.enabled !== false && fields[key]?.required;

        const name = payload.name?.trim();
        if (isCreate || payload.name !== undefined) {
            if (!name) throw new AppError('Item name is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        let sku = payload.sku?.trim();
        if (isCreate && !sku) {
            sku = `SKU-${Date.now()}`;
        }
        if (required('sku') && (isCreate || payload.sku !== undefined) && !payload.sku?.trim()) {
            throw new AppError('SKU is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        if (required('category') && (isCreate || payload.category !== undefined) && !payload.category?.trim()) {
            throw new AppError('Category is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const unitPrice = payload.unitPrice !== undefined ? toNumber(payload.unitPrice, NaN) : undefined;
        if (required('unitPrice') && (isCreate || payload.unitPrice !== undefined)) {
            if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                throw new AppError('Unit price must be a number greater than or equal to 0.', 400, ErrorCode.VALIDATION_ERROR);
            }
        }

        const tax = payload.tax !== undefined ? toNumber(payload.tax, NaN) : undefined;
        if (payload.tax !== undefined && (!Number.isFinite(tax) || tax < 0 || tax > 100)) {
            throw new AppError('Tax must be between 0 and 100.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (required('tax') && (isCreate || payload.tax !== undefined) && payload.tax === undefined) {
            throw new AppError('Tax is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        if (payload.uomId) {
            const uom = await this.models.UnitOfMeasure.findOne({ where: { id: payload.uomId, org_id: orgId } });
            if (!uom) throw new AppError('Unit of measure not found.', 404, ErrorCode.NOT_FOUND);
        }
        if (payload.pricingTierId) {
            const tier = await this.models.PricingTier.findOne({ where: { id: payload.pricingTierId, org_id: orgId } });
            if (!tier) throw new AppError('Pricing tier not found.', 404, ErrorCode.NOT_FOUND);
        }

        const attrs = {};
        if (name !== undefined && (isCreate || payload.name !== undefined)) attrs.name = name;
        if (sku !== undefined && (isCreate || payload.sku !== undefined)) attrs.sku = sku;
        if (payload.category !== undefined) attrs.category = payload.category?.trim() || null;
        if (unitPrice !== undefined && Number.isFinite(unitPrice)) attrs.unit_price = unitPrice;
        else if (isCreate) attrs.unit_price = 0;
        if (tax !== undefined && Number.isFinite(tax)) attrs.tax = tax;
        else if (isCreate) attrs.tax = 0;
        if (payload.uomId !== undefined) attrs.uom_id = payload.uomId || null;
        if (payload.pricingTierId !== undefined) attrs.pricing_tier_id = payload.pricingTierId || null;
        if (payload.lowStockThreshold !== undefined) {
            attrs.low_stock_threshold = payload.lowStockThreshold === null || payload.lowStockThreshold === ''
                ? null
                : toNumber(payload.lowStockThreshold);
        }
        if (payload.status !== undefined) attrs.status = payload.status;
        return attrs;
    }

    async _recordPrice(orgId, itemId, unitPrice, changedBy) {
        await this.models.ItemPriceHistory.create({
            org_id: orgId,
            item_id: itemId,
            unit_price: toNumber(unitPrice),
            changed_by: changedBy ?? null,
        });
    }

    _serializeListItem(item) {
        const json = item.toJSON();
        const onHand = (json.stockLevels ?? []).reduce((sum, row) => sum + toNumber(row.quantity), 0);
        return { ...json, on_hand: onHand };
    }
}

export default ItemService;
