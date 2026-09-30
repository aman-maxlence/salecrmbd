import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import {
    DEFAULT_LOW_STOCK_THRESHOLD,
    DEFAULT_PRICING_TIERS,
    DEFAULT_UOMS,
    DEFAULT_WAREHOUSE,
    toNumber,
} from '../../../constants/inventory.js';
import { scopedWhere, assertWarehouseInScope } from '../../../utils/countryScope.js';

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

    async getBundle(orgId, countryScope) {
        await this.ensureDefaults(orgId);
        const { InventorySettings, UnitOfMeasure, PricingTier, Warehouse, Country } = this.models;

        const [settings, units, pricingTiers, warehouses] = await Promise.all([
            InventorySettings.findOne({ where: { org_id: orgId } }),
            UnitOfMeasure.findAll({
                where: { org_id: orgId },
                include: [{ model: UnitOfMeasure, as: 'baseUnit', required: false, attributes: ['id', 'name', 'abbreviation'] }],
                order: [['name', 'ASC']],
            }),
            PricingTier.findAll({ where: { org_id: orgId }, order: [['name', 'ASC']] }),
            Warehouse.findAll({
                where: scopedWhere({ org_id: orgId }, countryScope),
                include: [{ model: Country, as: 'country', required: false }],
                order: [['name', 'ASC']],
            }),
        ]);

        return { settings, units, pricingTiers, warehouses };
    }

    async updateSettings(orgId, payload) {
        await this.ensureDefaults(orgId);
        const { InventorySettings } = this.models;
        const settings = await InventorySettings.findOne({ where: { org_id: orgId } });

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
        if (payload.skuPrefix !== undefined) {
            const prefix = payload.skuPrefix?.trim() ?? '';
            if (prefix.length > 20) {
                throw new AppError('SKU prefix must be 20 characters or fewer.', 400, ErrorCode.VALIDATION_ERROR);
            }
            if (prefix && !/^[A-Za-z0-9_-]+$/.test(prefix)) {
                throw new AppError('SKU prefix can only contain letters, numbers, hyphens and underscores.', 400, ErrorCode.VALIDATION_ERROR);
            }
            settings.sku_prefix = prefix;
        }
        await settings.save();
        return this.getBundle(orgId);
    }

    /**
     * Admin-facing "restart" for Inventory Initialization checklist item #11
     * - mirrors OnboardingService's resetOnboardingStepAsAdmin in spirit, but
     * scoped to just the config TOGGLES (threshold, alerts), not real
     * business data. Warehouses/UOMs/pricing tiers are never touched here -
     * items and stock may already reference them, so wiping those back to
     * just the 3 defaults would risk orphaning real records.
     */
    async resetToDefaults(orgId) {
        await this.ensureDefaults(orgId);
        const { InventorySettings } = this.models;
        const settings = await InventorySettings.findOne({ where: { org_id: orgId } });
        settings.low_stock_threshold = DEFAULT_LOW_STOCK_THRESHOLD;
        settings.reorder_alerts_enabled = true;
        await settings.save();
        return this.getBundle(orgId);
    }

    /**
     * "Generate/enter unique SKU" using the org's own configured structure
     * (prefix + a zero-padded running counter) instead of the old hardcoded
     * `SKU-<timestamp>` fallback. The counter only advances when an
     * auto-SKU is actually generated (a manually-typed SKU never touches
     * it) - a race between two concurrent auto-generates is still caught
     * by ItemService's own duplicate-SKU check, same safety net a
     * manually-typed clash already relies on.
     */
    async generateNextSku(orgId) {
        const settings = await this.ensureDefaults(orgId);
        const sku = `${settings.sku_prefix}${String(settings.sku_next_number).padStart(5, '0')}`;
        settings.sku_next_number += 1;
        await settings.save();
        return sku;
    }

    async createUom(orgId, { name, abbreviation, type, baseUnitId, conversionFactor }) {
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
        const resolvedType = this._validateUomType(type);
        const conversion = await this._validateConversion(orgId, null, baseUnitId, conversionFactor, resolvedType);
        return UnitOfMeasure.create({
            org_id: orgId,
            name: name.trim(),
            abbreviation: abbreviation.trim().toUpperCase(),
            status: 'active',
            type: resolvedType,
            base_unit_id: conversion.baseUnitId,
            conversion_factor: conversion.conversionFactor,
        });
    }

    async updateUom(orgId, id, { name, abbreviation, status, type, baseUnitId, conversionFactor }) {
        const { UnitOfMeasure } = this.models;
        const row = await UnitOfMeasure.findOne({ where: { id, org_id: orgId } });
        if (!row) throw new AppError('Unit of measure not found.', 404, ErrorCode.NOT_FOUND);
        if (name !== undefined) row.name = name.trim();
        if (abbreviation !== undefined) row.abbreviation = abbreviation.trim().toUpperCase();
        if (status !== undefined) row.status = status;
        if (type !== undefined) row.type = this._validateUomType(type);
        if (baseUnitId !== undefined || conversionFactor !== undefined) {
            const conversion = await this._validateConversion(orgId, id, baseUnitId, conversionFactor, row.type);
            row.base_unit_id = conversion.baseUnitId;
            row.conversion_factor = conversion.conversionFactor;
        }
        await row.save();
        return row;
    }

    _validateUomType(type) {
        const allowed = ['weight', 'volume', 'count', 'length', 'area', 'time', 'other'];
        if (type === undefined || type === null || type === '') return 'other';
        if (!allowed.includes(type)) {
            throw new AppError(`UOM type must be one of: ${allowed.join(', ')}.`, 400, ErrorCode.VALIDATION_ERROR);
        }
        return type;
    }

    /**
     * A unit may optionally declare `1 of this unit = conversionFactor * baseUnit`.
     * Kept to a single-level chain (a base unit can't itself have a base unit,
     * and a unit already acting as someone else's base can't take one on) so
     * conversions never require walking a multi-hop graph - simple enough to
     * cover "kg is the base, g/lb convert to it" without cycle-detection logic.
     */
    async _validateConversion(orgId, id, baseUnitId, conversionFactor, type) {
        if (!baseUnitId) return { baseUnitId: null, conversionFactor: null };
        const { UnitOfMeasure } = this.models;

        if (id != null && Number(baseUnitId) === Number(id)) {
            throw new AppError('A unit cannot convert to itself.', 400, ErrorCode.VALIDATION_ERROR);
        }
        const factor = toNumber(conversionFactor, NaN);
        if (!Number.isFinite(factor) || factor <= 0) {
            throw new AppError('Conversion factor must be a positive number.', 400, ErrorCode.VALIDATION_ERROR);
        }
        const baseUnit = await UnitOfMeasure.findOne({ where: { id: baseUnitId, org_id: orgId } });
        if (!baseUnit) throw new AppError('Base unit not found.', 404, ErrorCode.NOT_FOUND);
        if (baseUnit.base_unit_id) {
            throw new AppError('That unit already converts to another base unit and cannot itself be used as a base.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (type && baseUnit.type !== type) {
            throw new AppError('A unit can only convert to a base unit of the same type.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (id != null) {
            const dependents = await UnitOfMeasure.count({ where: { org_id: orgId, base_unit_id: id } });
            if (dependents > 0) {
                throw new AppError('Other units already convert to this one - it cannot also convert to a base unit.', 400, ErrorCode.VALIDATION_ERROR);
            }
        }
        return { baseUnitId: Number(baseUnitId), conversionFactor: factor };
    }

    async deleteUom(orgId, id) {
        const { UnitOfMeasure, InventoryItem } = this.models;
        const row = await UnitOfMeasure.findOne({ where: { id, org_id: orgId } });
        if (!row) throw new AppError('Unit of measure not found.', 404, ErrorCode.NOT_FOUND);
        const inUse = await InventoryItem.count({ where: { org_id: orgId, uom_id: id } });
        if (inUse > 0) {
            throw new AppError(`This unit is still used by ${inUse} item(s).`, 409, ErrorCode.CONFLICT);
        }
        const dependents = await UnitOfMeasure.count({ where: { org_id: orgId, base_unit_id: id } });
        if (dependents > 0) {
            throw new AppError(`${dependents} other unit(s) convert to this one - remove those conversions first.`, 409, ErrorCode.CONFLICT);
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

    async listWarehouses(orgId, countryScope) {
        await this.ensureDefaults(orgId);
        const { Warehouse, Country } = this.models;
        return Warehouse.findAll({
            where: scopedWhere({ org_id: orgId }, countryScope),
            include: [{ model: Country, as: 'country', required: false }],
            order: [['name', 'ASC']],
        });
    }

    async getWarehouse(orgId, id, countryScope) {
        return assertWarehouseInScope(this.models, orgId, id, countryScope);
    }

    async createWarehouse(orgId, { name, code, location, countryId }) {
        await this.ensureDefaults(orgId);
        const { Warehouse, Country } = this.models;
        if (!name?.trim() || !code?.trim()) {
            throw new AppError('Warehouse name and code are required.', 400, ErrorCode.VALIDATION_ERROR);
        }
        const existing = await Warehouse.findOne({
            where: { org_id: orgId, code: code.trim().toUpperCase() },
        });
        if (existing) throw new AppError('A warehouse with that code already exists.', 409, ErrorCode.CONFLICT);
        if (countryId) {
            const country = await Country.findOne({ where: { id: countryId, org_id: orgId } });
            if (!country) throw new AppError('Country not found.', 404, ErrorCode.NOT_FOUND);
        }
        return Warehouse.create({
            org_id: orgId,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            location: location?.trim() || null,
            country_id: countryId ?? null,
            status: 'active',
        });
    }

    async updateWarehouse(orgId, id, { name, code, location, status, countryId }, countryScope) {
        const { Country } = this.models;
        const row = await assertWarehouseInScope(this.models, orgId, id, countryScope);
        if (countryId !== undefined) {
            if (countryId) {
                const country = await Country.findOne({ where: { id: countryId, org_id: orgId } });
                if (!country) throw new AppError('Country not found.', 404, ErrorCode.NOT_FOUND);
            }
            row.country_id = countryId;
        }
        if (name !== undefined) row.name = name.trim();
        if (code !== undefined) row.code = code.trim().toUpperCase();
        if (location !== undefined) row.location = location?.trim() || null;
        if (status !== undefined) row.status = status;
        await row.save();
        return row;
    }

    async deleteWarehouse(orgId, id, countryScope) {
        const { StockLevel } = this.models;
        const row = await assertWarehouseInScope(this.models, orgId, id, countryScope);
        const stockRows = await StockLevel.count({ where: { org_id: orgId, warehouse_id: id } });
        if (stockRows > 0) {
            throw new AppError('This warehouse still has stock records. Transfer or issue stock before deleting it.', 409, ErrorCode.CONFLICT);
        }
        await row.destroy();
    }
}

export default InventorySettingsService;
