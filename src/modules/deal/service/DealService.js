import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { toNumber } from '../../../constants/inventory.js';
import TechnogexCatalogService from '../../technogex/service/TechnogexCatalogService.js';
import NotificationService from '../../notifications/service/NotificationService.js';
import BusinessPreferencesService from '../../businessPreferences/service/BusinessPreferencesService.js';

const VALID_STATUSES = ['open', 'won', 'lost'];

class DealService {
    constructor(models) {
        this.models = models;
        this.technogexCatalogService = new TechnogexCatalogService(models);
        this.notificationService = new NotificationService(models);
        this.businessPreferencesService = new BusinessPreferencesService(models);
    }

    async listDeals(orgId) {
        const { Deal, DealLineItem } = this.models;
        return Deal.findAll({
            where: { org_id: orgId },
            include: [{ model: DealLineItem, as: 'lineItems', required: false }],
            order: [['updated_at', 'DESC']],
        });
    }

    async createDeal(orgId, { title, stage, status, territoryId }, ownerUserId) {
        if (!title?.trim()) throw new AppError('Deal title is required.', 400, ErrorCode.VALIDATION_ERROR);

        // "Default settings required by downstream modules" (Business
        // Preferences checklist #4) - a deal created without an explicit
        // territory falls back to the org's own default, instead of that
        // setting sitting saved-but-unread.
        let resolvedTerritoryId = territoryId ?? null;
        if (resolvedTerritoryId === null) {
            const preferences = await this.businessPreferencesService.getForOrg(orgId);
            resolvedTerritoryId = preferences.defaultTerritoryId ?? null;
        }

        return this.models.Deal.create({
            org_id: orgId,
            title: title.trim(),
            stage: stage?.trim() || 'open',
            status: status || 'open',
            owner_user_id: ownerUserId ?? null,
            territory_id: resolvedTerritoryId,
        });
    }

    async getDeal(orgId, dealId) {
        const { Deal, DealLineItem, InventoryItem, PricingTier, Warehouse,
            TechnogexProductPackage, TechnogexDesignItem, TechnogexValuePackTier } = this.models;
        const deal = await Deal.findOne({
            where: { id: dealId, org_id: orgId },
            include: [{
                model: DealLineItem,
                as: 'lineItems',
                required: false,
                include: [
                    { model: InventoryItem, as: 'item', required: false },
                    { model: PricingTier, as: 'pricingTier', required: false },
                    { model: Warehouse, as: 'warehouse', required: false },
                    { model: TechnogexProductPackage, as: 'technogexProductPackage', required: false },
                    { model: TechnogexDesignItem, as: 'technogexDesignItem', required: false },
                    { model: TechnogexValuePackTier, as: 'technogexValuePackTier', required: false },
                ],
            }],
        });
        if (!deal) throw new AppError('Deal not found.', 404, ErrorCode.NOT_FOUND);
        return deal;
    }

    /**
     * Minimal stage/status editing - the deal record previously had no
     * update path at all beyond line items, so "Set notification
     * preferences" (deal update notifications) had no real event to hook
     * into. Kept intentionally small (no reassigning owner/title here) -
     * this exists to give the notification a genuine trigger, not to be a
     * full pipeline editor.
     */
    async updateDeal(orgId, dealId, { stage, status }, actorUserId) {
        const deal = await this.getDeal(orgId, dealId);
        if (status !== undefined && !VALID_STATUSES.includes(status)) {
            throw new AppError(`Status must be one of: ${VALID_STATUSES.join(', ')}.`, 400, ErrorCode.VALIDATION_ERROR);
        }

        const changedFields = [];
        if (stage !== undefined && stage !== deal.stage) {
            changedFields.push(`stage changed to "${stage}"`);
            deal.stage = stage;
        }
        if (status !== undefined && status !== deal.status) {
            changedFields.push(`status changed to "${status}"`);
            deal.status = status;
        }
        if (changedFields.length === 0) return deal;

        await deal.save();

        if (deal.owner_user_id && deal.owner_user_id !== actorUserId) {
            await this.notificationService.sendDealUpdateEmail(orgId, deal.owner_user_id, {
                dealId: deal.id,
                dealTitle: deal.title,
                summary: changedFields.join(', '),
            }).catch(() => {
                // Best-effort - a notification failure must never fail the deal update itself.
            });
        }

        return this.getDeal(orgId, dealId);
    }

    async addLineItem(orgId, dealId, payload) {
        const deal = await this.getDeal(orgId, dealId);
        const quantity = toNumber(payload.quantity, NaN);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new AppError('Quantity must be a number greater than 0.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const source = payload.source || 'local';
        if (source !== 'local') {
            const { unitPrice, meta } = await this.technogexCatalogService.resolveSource(source, payload.sourceRefId);
            const line = await this.models.DealLineItem.create({
                org_id: orgId,
                deal_id: deal.id,
                item_id: null,
                source_type: source,
                source_ref_id: payload.sourceRefId,
                source_meta: meta,
                quantity,
                unit_price: unitPrice,
                tax: 0,
            });
            return this.getDeal(orgId, deal.id);
        }

        const item = await this.models.InventoryItem.findOne({
            where: { id: payload.itemId, org_id: orgId, status: 'active' },
        });
        if (!item) throw new AppError('Inventory item not found.', 404, ErrorCode.NOT_FOUND);

        let unitPrice = toNumber(item.unit_price);
        let pricingTierId = payload.pricingTierId || item.pricing_tier_id || null;
        if (pricingTierId) {
            const tier = await this.models.PricingTier.findOne({ where: { id: pricingTierId, org_id: orgId } });
            if (!tier) throw new AppError('Pricing tier not found.', 404, ErrorCode.NOT_FOUND);
            unitPrice = unitPrice * (1 - toNumber(tier.discount_percent) / 100);
        }
        if (payload.unitPrice !== undefined) {
            unitPrice = toNumber(payload.unitPrice, unitPrice);
        }

        if (payload.warehouseId) {
            const warehouse = await this.models.Warehouse.findOne({
                where: { id: payload.warehouseId, org_id: orgId },
            });
            if (!warehouse) throw new AppError('Warehouse not found.', 404, ErrorCode.NOT_FOUND);
        }

        const line = await this.models.DealLineItem.create({
            org_id: orgId,
            deal_id: deal.id,
            item_id: item.id,
            quantity,
            unit_price: unitPrice,
            tax: toNumber(item.tax),
            pricing_tier_id: pricingTierId,
            warehouse_id: payload.warehouseId || null,
        });

        return this.getDeal(orgId, deal.id);
    }

    /**
     * Line items were previously add/remove-only - no way to fix a
     * mis-typed quantity or price, or move a line to a different warehouse,
     * without deleting and re-adding it (losing whatever source/pricing-tier
     * context the original add had resolved).
     */
    async updateLineItem(orgId, dealId, lineId, { quantity, unitPrice, warehouseId, pricingTierId }) {
        await this.getDeal(orgId, dealId);
        const line = await this.models.DealLineItem.findOne({
            where: { id: lineId, deal_id: dealId, org_id: orgId },
        });
        if (!line) throw new AppError('Deal line item not found.', 404, ErrorCode.NOT_FOUND);

        if (quantity !== undefined) {
            const q = toNumber(quantity, NaN);
            if (!Number.isFinite(q) || q <= 0) {
                throw new AppError('Quantity must be a number greater than 0.', 400, ErrorCode.VALIDATION_ERROR);
            }
            line.quantity = q;
        }

        if (warehouseId !== undefined) {
            if (warehouseId) {
                const warehouse = await this.models.Warehouse.findOne({ where: { id: warehouseId, org_id: orgId } });
                if (!warehouse) throw new AppError('Warehouse not found.', 404, ErrorCode.NOT_FOUND);
            }
            line.warehouse_id = warehouseId || null;
        }

        if (pricingTierId !== undefined) {
            if (pricingTierId) {
                const tier = await this.models.PricingTier.findOne({ where: { id: pricingTierId, org_id: orgId } });
                if (!tier) throw new AppError('Pricing tier not found.', 404, ErrorCode.NOT_FOUND);
            }
            line.pricing_tier_id = pricingTierId || null;
        }

        // Always wins over whatever the pricing tier would otherwise compute -
        // this is the "manual price" override the deal screen offers.
        if (unitPrice !== undefined) {
            const p = toNumber(unitPrice, NaN);
            if (!Number.isFinite(p) || p < 0) {
                throw new AppError('Unit price must be 0 or more.', 400, ErrorCode.VALIDATION_ERROR);
            }
            line.unit_price = p;
        }

        await line.save();
        return this.getDeal(orgId, dealId);
    }

    async removeLineItem(orgId, dealId, lineId) {
        await this.getDeal(orgId, dealId);
        const line = await this.models.DealLineItem.findOne({
            where: { id: lineId, deal_id: dealId, org_id: orgId },
        });
        if (!line) throw new AppError('Deal line item not found.', 404, ErrorCode.NOT_FOUND);
        await line.destroy();
        return this.getDeal(orgId, dealId);
    }
}

export default DealService;
