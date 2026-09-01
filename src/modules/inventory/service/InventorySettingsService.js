import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import {
    CATALOG_FIELD_KEYS,
    DEFAULT_CATALOG_FIELDS,
    DEFAULT_LOW_STOCK_THRESHOLD,
    DEFAULT_PRICING_TIERS,
    DEFAULT_UOMS,
    DEFAULT_WAREHOUSE,
    toNumber,
} from '../../../constants/inventory.js';

class InventorySettingsService {
    constructor(models) {
        this.models = models;
    }

    async ensureDefaults(orgId, transaction) {
        const { InventorySettings, UnitOfMeasure, PricingTier, Warehouse } = this.models;
        const opts = { ...(transaction && { transaction }) };

        const [settings] = await InventorySettings.findOrCreate({
            where: { org_id: orgId },
            defaults: {
                org_id: orgId,
                catalog_fields: DEFAULT_CATALOG_FIELDS,
                low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD,
                reorder_alerts_enabled: true,
            },
            ...opts,
        });

        for (const uom of DEFAULT_UOMS) {
            await UnitOfMeasure.findOrCreate({
                where: { org_id: orgId, abbreviation: uom.abbreviation },
                defaults: { org_id: orgId, ...uom, status: 'active' },
                ...opts,
            });
        }

        for (const tier of DEFAULT_PRICING_TIERS) {
            await PricingTier.findOrCreate({
                where: { org_id: orgId, name: tier.name },
                defaults: { org_id: orgId, ...tier, status: 'active' },
                ...opts,
            });
        }

        await Warehouse.findOrCreate({
            where: { org_id: orgId, code: DEFAULT_WAREHOUSE.code },
            defaults: { org_id: orgId, ...DEFAULT_WAREHOUSE, status: 'active' },
            ...opts,
        });

        return settings;
    }

    async getBundle(orgId) {
        await this.ensureDefaults(orgId);
        const { InventorySettings, UnitOfMeasure, PricingTier, Warehouse } = this.models;

        const [settings, units, pricingTiers, warehouses] = await Promise.all([
            InventorySettings.findOne({ where: { org_id: orgId } }),
            UnitOfMeasure.findAll({ where: { org_id: orgId }, order: [['name', 'ASC']] }),
            PricingTier.findAll({ where: { org_id: orgId }, order: [['name', 'ASC']] }),
            Warehouse.findAll({ where: { org_id: orgId }, order: [['name', 'ASC']] }),
        ]);

        return { settings, units, pricingTiers, warehouses };
    }

    async updateSettings(orgId, payload) {
        await this.ensureDefaults(orgId);
        const { InventorySettings } = this.models;
        const settings = await InventorySettings.findOne({ where: { org_id: orgId } });

        if (payload.catalogFields !== undefined) {
            settings.catalog_fields = this._normalizeCatalogFields(payload.catalogFields);
        }
        if (payload.lowStockThreshold !== undefined) {
            const threshold = toNumber(payload.lowStockThreshold, NaN);
            if (!Number.isFinite(threshold) || threshold < 0) {
                throw new AppError('Low-stock threshold must be a number greater than or equal to 0.', 400, ErrorCode.VALIDATION_ERROR);
            }
            settings.low_stock_threshold = threshold;
        }
        if (payload.reorderAlertsEnabled !== undefined) {
            settings.reorder_alerts_enabled = Boolean(payload.reorderAlertsEnabled);
        }
        await settings.save();
        return this.getBundle(orgId);
    }

    _normalizeCatalogFields(input) {
        const merged = { ...DEFAULT_CATALOG_FIELDS };
        for (const key of CATALOG_FIELD_KEYS) {
            const incoming = input?.[key] ?? {};
            merged[key] = {
                label: incoming.label || DEFAULT_CATALOG_FIELDS[key].label,
                enabled: incoming.enabled !== false,
                required: key === 'name' ? true : Boolean(incoming.required),
            };
            if (merged[key].required) merged[key].enabled = true;
        }
        return merged;
    }

    async createUom(orgId, { name, abbreviation }) {
        await this.ensureDefaults(orgId);
        const { UnitOfMeasure } = this.models;
        if (!name?.trim() || !abbreviation?.trim()) {
            throw new AppError('Unit name and abbreviation are required.', 400, ErrorCode.VALIDATION_ERROR);
        }
        const existing = await UnitOfMeasure.findOne({
            where: { org_id: orgId, abbreviation: abbreviation.trim().toUpperCase() },
        });
        if (existing) {
            throw new AppError('A unit with that abbreviation already exists.', 409, ErrorCode.CONFLICT);
        }
        return UnitOfMeasure.create({
            org_id: orgId,
            name: name.trim(),
            abbreviation: abbreviation.trim().toUpperCase(),
            status: 'active',
        });
    }

    async updateUom(orgId, id, { name, abbreviation, status }) {
        const { UnitOfMeasure } = this.models;
        const row = await UnitOfMeasure.findOne({ where: { id, org_id: orgId } });
        if (!row) throw new AppError('Unit of measure not found.', 404, ErrorCode.NOT_FOUND);
        if (name !== undefined) row.name = name.trim();
        if (abbreviation !== undefined) row.abbreviation = abbreviation.trim().toUpperCase();
        if (status !== undefined) row.status = status;
        await row.save();
        return row;
    }

    async deleteUom(orgId, id) {
        const { UnitOfMeasure, InventoryItem } = this.models;
        const row = await UnitOfMeasure.findOne({ where: { id, org_id: orgId } });
        if (!row) throw new AppError('Unit of measure not found.', 404, ErrorCode.NOT_FOUND);
        const inUse = await InventoryItem.count({ where: { org_id: orgId, uom_id: id } });
        if (inUse > 0) {
            throw new AppError(`This unit is still used by ${inUse} item(s).`, 409, ErrorCode.CONFLICT);
        }
        await row.destroy();
    }

    async createPricingTier(orgId, { name, discountPercent }) {
        await this.ensureDefaults(orgId);
        const { PricingTier } = this.models;
        if (!name?.trim()) throw new AppError('Pricing tier name is required.', 400, ErrorCode.VALIDATION_ERROR);
        const discount = toNumber(discountPercent, 0);
        if (discount < 0 || discount > 100) {
            throw new AppError('Discount percent must be between 0 and 100.', 400, ErrorCode.VALIDATION_ERROR);
        }
        const existing = await PricingTier.findOne({ where: { org_id: orgId, name: name.trim() } });
        if (existing) throw new AppError('A pricing tier with that name already exists.', 409, ErrorCode.CONFLICT);
        return PricingTier.create({
            org_id: orgId,
            name: name.trim(),
            discount_percent: discount,
            status: 'active',
        });
    }

    async updatePricingTier(orgId, id, { name, discountPercent, status }) {
        const { PricingTier } = this.models;
        const row = await PricingTier.findOne({ where: { id, org_id: orgId } });
        if (!row) throw new AppError('Pricing tier not found.', 404, ErrorCode.NOT_FOUND);
        if (name !== undefined) row.name = name.trim();
        if (discountPercent !== undefined) {
            const discount = toNumber(discountPercent, NaN);
            if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
                throw new AppError('Discount percent must be between 0 and 100.', 400, ErrorCode.VALIDATION_ERROR);
            }
            row.discount_percent = discount;
        }
        if (status !== undefined) row.status = status;
        await row.save();
        return row;
    }

    async deletePricingTier(orgId, id) {
        const { PricingTier, InventoryItem } = this.models;
        const row = await PricingTier.findOne({ where: { id, org_id: orgId } });
        if (!row) throw new AppError('Pricing tier not found.', 404, ErrorCode.NOT_FOUND);
        const inUse = await InventoryItem.count({ where: { org_id: orgId, pricing_tier_id: id } });
        if (inUse > 0) {
            throw new AppError(`This pricing tier is still used by ${inUse} item(s).`, 409, ErrorCode.CONFLICT);
        }
        await row.destroy();
    }

    async createWarehouse(orgId, { name, code, location }) {
        await this.ensureDefaults(orgId);
        const { Warehouse } = this.models;
        if (!name?.trim() || !code?.trim()) {
            throw new AppError('Warehouse name and code are required.', 400, ErrorCode.VALIDATION_ERROR);
        }
        const existing = await Warehouse.findOne({
            where: { org_id: orgId, code: code.trim().toUpperCase() },
        });
        if (existing) throw new AppError('A warehouse with that code already exists.', 409, ErrorCode.CONFLICT);
        return Warehouse.create({
            org_id: orgId,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            location: location?.trim() || null,
            status: 'active',
        });
    }

    async updateWarehouse(orgId, id, { name, code, location, status }) {
        const { Warehouse } = this.models;
        const row = await Warehouse.findOne({ where: { id, org_id: orgId } });
        if (!row) throw new AppError('Warehouse not found.', 404, ErrorCode.NOT_FOUND);
        if (name !== undefined) row.name = name.trim();
        if (code !== undefined) row.code = code.trim().toUpperCase();
        if (location !== undefined) row.location = location?.trim() || null;
        if (status !== undefined) row.status = status;
        await row.save();
        return row;
    }

    async deleteWarehouse(orgId, id) {
        const { Warehouse, StockLevel } = this.models;
        const row = await Warehouse.findOne({ where: { id, org_id: orgId } });
        if (!row) throw new AppError('Warehouse not found.', 404, ErrorCode.NOT_FOUND);
        const stockRows = await StockLevel.count({ where: { org_id: orgId, warehouse_id: id } });
        if (stockRows > 0) {
            throw new AppError('This warehouse still has stock records. Transfer or issue stock before deleting it.', 409, ErrorCode.CONFLICT);
        }
        await row.destroy();
    }
}

export default InventorySettingsService;
