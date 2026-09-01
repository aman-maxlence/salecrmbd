import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { toNumber } from '../../../constants/inventory.js';

class DealService {
    constructor(models) {
        this.models = models;
    }

    async listDeals(orgId) {
        const { Deal, DealLineItem } = this.models;
        return Deal.findAll({
            where: { org_id: orgId },
            include: [{ model: DealLineItem, as: 'lineItems', required: false }],
            order: [['updated_at', 'DESC']],
        });
    }

    async createDeal(orgId, { title, stage, status }, ownerUserId) {
        if (!title?.trim()) throw new AppError('Deal title is required.', 400, ErrorCode.VALIDATION_ERROR);
        return this.models.Deal.create({
            org_id: orgId,
            title: title.trim(),
            stage: stage?.trim() || 'open',
            status: status || 'open',
            owner_user_id: ownerUserId ?? null,
        });
    }

    async getDeal(orgId, dealId) {
        const { Deal, DealLineItem, InventoryItem, PricingTier, Warehouse } = this.models;
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
                ],
            }],
        });
        if (!deal) throw new AppError('Deal not found.', 404, ErrorCode.NOT_FOUND);
        return deal;
    }

    async addLineItem(orgId, dealId, payload) {
        const deal = await this.getDeal(orgId, dealId);
        const item = await this.models.InventoryItem.findOne({
            where: { id: payload.itemId, org_id: orgId, status: 'active' },
        });
        if (!item) throw new AppError('Inventory item not found.', 404, ErrorCode.NOT_FOUND);

        const quantity = toNumber(payload.quantity, NaN);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new AppError('Quantity must be a number greater than 0.', 400, ErrorCode.VALIDATION_ERROR);
        }

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
