import { Op } from 'sequelize';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { toNumber } from '../../../constants/inventory.js';

/**
 * Read access to the Technogex mirror tables: catalog search for the line-item
 * picker, and price/snapshot resolution for DealService/SalesOrderService.
 * `resolveSource` is the one place that turns a rep's (source_type,
 * source_ref_id) selection into a trusted unit price and a frozen
 * `source_meta` snapshot - callers never trust a client-sent price.
 */
class TechnogexCatalogService {
    constructor(models) {
        this.models = models;
    }

    async searchProducts(q) {
        const { TechnogexProduct, TechnogexProductPackage } = this.models;
        return TechnogexProduct.findAll({
            where: {
                source_deleted_at: null,
                active: true,
                ...(q ? { name: { [Op.like]: `%${q}%` } } : {}),
            },
            include: [{
                model: TechnogexProductPackage,
                as: 'packages',
                required: false,
                where: { source_deleted_at: null, active: true },
            }],
            order: [['name', 'ASC']],
            limit: 50,
        });
    }

    async searchDesignItems(q) {
        const { TechnogexDesignItem } = this.models;
        return TechnogexDesignItem.findAll({
            where: {
                source_deleted_at: null,
                is_active: true,
                ...(q ? { title: { [Op.like]: `%${q}%` } } : {}),
            },
            order: [['title', 'ASC']],
            limit: 50,
        });
    }

    async searchValuePacks(q) {
        const { TechnogexValuePack, TechnogexValuePackTier } = this.models;
        return TechnogexValuePack.findAll({
            where: {
                source_deleted_at: null,
                active: true,
                ...(q ? { name: { [Op.like]: `%${q}%` } } : {}),
            },
            include: [{
                model: TechnogexValuePackTier,
                as: 'tiers',
                required: false,
                where: { source_deleted_at: null, is_active: true },
            }],
            order: [['name', 'ASC']],
            limit: 50,
        });
    }

    /**
     * @param {string} sourceType - one of DealLineItem/SalesOrderLineItem's source_type ENUM values (excluding 'local')
     * @param {number} sourceRefId
     * @returns {{ unitPrice: number, meta: object }}
     */
    async resolveSource(sourceType, sourceRefId) {
        if (sourceType === 'technogex_product_package') return this._resolveProductPackage(sourceRefId);
        if (sourceType === 'technogex_design_item') return this._resolveDesignItem(sourceRefId);
        if (sourceType === 'technogex_value_pack_tier') return this._resolveValuePackTier(sourceRefId);
        throw new AppError('Unknown catalog source type.', 400, ErrorCode.VALIDATION_ERROR);
    }

    async _resolveProductPackage(id) {
        const { TechnogexProductPackage, TechnogexProduct } = this.models;
        const pkg = await TechnogexProductPackage.findOne({
            where: { id },
            include: [{ model: TechnogexProduct, as: 'product' }],
        });
        if (!pkg) throw new AppError('Technogex product package not found.', 404, ErrorCode.NOT_FOUND);
        if (pkg.source_deleted_at || pkg.product?.source_deleted_at) {
            throw new AppError('This Technogex product is no longer available.', 409, ErrorCode.CONFLICT);
        }

        const unitPrice = toNumber(pkg.final_monthly_price ?? pkg.tentative_monthly_price, 0);
        return {
            unitPrice,
            meta: {
                kind: 'technogex_product_package',
                productName: pkg.product?.name ?? null,
                packageType: pkg.package_type,
                displayPrice: pkg.display_price,
            },
        };
    }

    async _resolveDesignItem(id) {
        const { TechnogexDesignItem } = this.models;
        const item = await TechnogexDesignItem.findOne({ where: { id } });
        if (!item) throw new AppError('Technogex design item not found.', 404, ErrorCode.NOT_FOUND);
        if (item.source_deleted_at) {
            throw new AppError('This Technogex design item is no longer available.', 409, ErrorCode.CONFLICT);
        }

        return {
            unitPrice: toNumber(item.base_price, 0),
            meta: {
                kind: 'technogex_design_item',
                title: item.title,
                licensingType: item.licensing_type,
            },
        };
    }

    async _resolveValuePackTier(id) {
        const { TechnogexValuePackTier, TechnogexValuePack } = this.models;
        const tier = await TechnogexValuePackTier.findOne({
            where: { id },
            include: [{ model: TechnogexValuePack, as: 'valuePack' }],
        });
        if (!tier) throw new AppError('Technogex value pack tier not found.', 404, ErrorCode.NOT_FOUND);
        if (tier.source_deleted_at || tier.valuePack?.source_deleted_at) {
            throw new AppError('This Technogex value pack tier is no longer available.', 409, ErrorCode.CONFLICT);
        }

        return {
            unitPrice: toNumber(tier.current_price ?? tier.original_price, 0),
            meta: {
                kind: 'technogex_value_pack_tier',
                valuePackName: tier.valuePack?.name ?? null,
                tierType: tier.tier_type,
                tierName: tier.name,
                durationExternalId: tier.duration_external_id,
                countryExternalId: tier.country_external_id,
            },
        };
    }
}

export default TechnogexCatalogService;
