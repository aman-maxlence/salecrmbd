import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { toNumber } from '../../../constants/inventory.js';
import StockService from '../../inventory/service/StockService.js';
import TechnogexCatalogService from '../../technogex/service/TechnogexCatalogService.js';

class SalesOrderService {
    constructor(models) {
        this.models = models;
        this.stockService = new StockService(models);
        this.technogexCatalogService = new TechnogexCatalogService(models);
    }

    async list(orgId, { status, dealId } = {}) {
        const { SalesOrder, Warehouse } = this.models;
        const where = { org_id: orgId };
        if (status) where.status = status;
        if (dealId) where.deal_id = dealId;
        return SalesOrder.findAll({
            where,
            include: [{ model: Warehouse, as: 'warehouse', required: false }],
            order: [['created_at', 'DESC']],
        });
    }

    async getById(orgId, id) {
        return this._find(orgId, id, true);
    }

    /**
     * If `dealId` is given and `lines` is omitted, this copies the Deal's
     * current DealLineItem rows as the order's starting lines - a one-time,
     * read-only copy; editing the Sales Order afterward never writes back
     * to the Deal.
     */
    async create(orgId, { dealId, warehouseId, customerName, customerEmail, customerPhone, notes, lines }, createdBy) {
        const { SalesOrder, SalesOrderLineItem, Warehouse, InventoryItem, Deal, DealLineItem } = this.models;

        if (!warehouseId) throw new AppError('Fulfillment warehouse is required.', 400, ErrorCode.VALIDATION_ERROR);
        if (!customerName?.trim()) throw new AppError('Customer name is required.', 400, ErrorCode.VALIDATION_ERROR);

        const warehouse = await Warehouse.findOne({ where: { id: warehouseId, org_id: orgId, status: 'active' } });
        if (!warehouse) throw new AppError('Warehouse not found.', 404, ErrorCode.NOT_FOUND);

        let sourceLines = lines;
        if (dealId) {
            const deal = await Deal.findOne({ where: { id: dealId, org_id: orgId } });
            if (!deal) throw new AppError('Deal not found.', 404, ErrorCode.NOT_FOUND);
            if (!Array.isArray(sourceLines) || sourceLines.length === 0) {
                const dealLines = await DealLineItem.findAll({ where: { org_id: orgId, deal_id: dealId } });
                sourceLines = dealLines.map((l) => ({
                    itemId: l.item_id,
                    source: l.source_type,
                    sourceRefId: l.source_ref_id,
                    quantity: toNumber(l.quantity),
                    unitPrice: toNumber(l.unit_price),
                    tax: toNumber(l.tax),
                }));
            }
        }

        if (!Array.isArray(sourceLines) || sourceLines.length === 0) {
            throw new AppError('At least one line item is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const normalizedLines = [];
        for (const line of sourceLines) {
            const quantity = toNumber(line.quantity, NaN);
            if (!Number.isFinite(quantity) || quantity <= 0) {
                throw new AppError('Each line needs a quantity greater than 0.', 400, ErrorCode.VALIDATION_ERROR);
            }

            const source = line.source && line.source !== 'local' ? line.source : 'local';
            if (source !== 'local') {
                // Always resolved server-side here (never the client-sent price), even when
                // copied from a Deal - the Deal's own frozen source_meta stays on the
                // DealLineItem, but the Sales Order gets its own fresh snapshot as of fulfillment time.
                const { unitPrice, meta } = await this.technogexCatalogService.resolveSource(source, line.sourceRefId);
                const tax = line.tax !== undefined ? toNumber(line.tax, 0) : 0;
                normalizedLines.push({
                    item_id: null,
                    source_type: source,
                    source_ref_id: line.sourceRefId,
                    source_meta: meta,
                    quantity,
                    unit_price: unitPrice,
                    tax,
                });
                continue;
            }

            const unitPrice = toNumber(line.unitPrice, NaN);
            const tax = line.tax !== undefined ? toNumber(line.tax, 0) : 0;
            if (!line.itemId) {
                throw new AppError('Each line needs an item.', 400, ErrorCode.VALIDATION_ERROR);
            }
            if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                throw new AppError('Each line needs a unit price greater than or equal to 0.', 400, ErrorCode.VALIDATION_ERROR);
            }
            const item = await InventoryItem.findOne({ where: { id: line.itemId, org_id: orgId } });
            if (!item) throw new AppError('Item not found.', 404, ErrorCode.NOT_FOUND);
            normalizedLines.push({ item_id: item.id, quantity, unit_price: unitPrice, tax });
        }

        const sequelize = SalesOrder.sequelize;
        const so = await sequelize.transaction(async (transaction) => {
            const order = await SalesOrder.create({
                org_id: orgId,
                deal_id: dealId || null,
                warehouse_id: warehouseId,
                customer_name: customerName.trim(),
                customer_email: customerEmail?.trim() || null,
                customer_phone: customerPhone?.trim() || null,
                status: 'pending',
                notes: notes?.trim() || null,
                created_by: createdBy ?? null,
            }, { transaction });

            await SalesOrderLineItem.bulkCreate(
                normalizedLines.map((line) => ({ org_id: orgId, sales_order_id: order.id, ...line })),
                { transaction }
            );

            return order;
        });

        return this.getById(orgId, so.id);
    }

    async cancel(orgId, id) {
        const so = await this._find(orgId, id, false);
        if (!['pending', 'partially_fulfilled'].includes(so.status)) {
            throw new AppError('Only pending or partially-fulfilled sales orders can be cancelled.', 409, ErrorCode.CONFLICT);
        }
        so.status = 'cancelled';
        await so.save();
        return this.getById(orgId, id);
    }

    /**
     * Fulfills some or all of an SO's line items from its warehouse - each
     * line goes through StockService.adjust(type:'issue'), so it throws the
     * same 409 as a manual issue if there isn't enough stock.
     */
    async fulfill(orgId, id, { lines }, userId) {
        const so = await this._find(orgId, id, true);
        if (!['pending', 'partially_fulfilled'].includes(so.status)) {
            throw new AppError('This sales order cannot be fulfilled in its current status.', 409, ErrorCode.CONFLICT);
        }
        if (!Array.isArray(lines) || lines.length === 0) {
            throw new AppError('At least one line quantity is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const lineById = new Map(so.lineItems.map((l) => [l.id, l]));

        for (const input of lines) {
            const quantity = toNumber(input.quantity, NaN);
            if (!Number.isFinite(quantity) || quantity <= 0) continue;

            const line = lineById.get(Number(input.lineId));
            if (!line) throw new AppError('Line item not found on this sales order.', 404, ErrorCode.NOT_FOUND);

            const remaining = toNumber(line.quantity) - toNumber(line.fulfilled_quantity);
            if (quantity > remaining) {
                throw new AppError(`Cannot fulfill more than the remaining ${remaining} on this line.`, 400, ErrorCode.VALIDATION_ERROR);
            }

            // Technogex-sourced lines (and non-tracked local services) have no
            // StockLevel row at all - StockService.adjust() would reject them.
            // Fulfilling them just means marking the quantity delivered.
            const tracksStock = line.source_type === 'local' && line.item?.track_inventory !== false;
            if (tracksStock) {
                await this.stockService.adjust(orgId, {
                    type: 'issue',
                    itemId: line.item_id,
                    quantity,
                    warehouseId: so.warehouse_id,
                    reason: `Sales Order #${so.id}`,
                    referenceType: 'sales_order',
                    referenceId: so.id,
                }, userId);
            }

            line.fulfilled_quantity = toNumber(line.fulfilled_quantity) + quantity;
            await line.save();
        }

        const refreshed = await this._find(orgId, id, true);
        const fullyFulfilled = refreshed.lineItems.every((l) => toNumber(l.fulfilled_quantity) >= toNumber(l.quantity));
        const anyFulfilled = refreshed.lineItems.some((l) => toNumber(l.fulfilled_quantity) > 0);
        refreshed.status = fullyFulfilled ? 'fulfilled' : (anyFulfilled ? 'partially_fulfilled' : refreshed.status);
        await refreshed.save();

        return this.getById(orgId, id);
    }

    async _find(orgId, id, withLines) {
        const { SalesOrder, SalesOrderLineItem, Warehouse, InventoryItem,
            TechnogexProductPackage, TechnogexDesignItem, TechnogexValuePackTier } = this.models;
        const so = await SalesOrder.findOne({
            where: { id, org_id: orgId },
            include: [
                { model: Warehouse, as: 'warehouse', required: false },
                ...(withLines ? [{
                    model: SalesOrderLineItem,
                    as: 'lineItems',
                    required: false,
                    include: [
                        { model: InventoryItem, as: 'item', required: false },
                        { model: TechnogexProductPackage, as: 'technogexProductPackage', required: false },
                        { model: TechnogexDesignItem, as: 'technogexDesignItem', required: false },
                        { model: TechnogexValuePackTier, as: 'technogexValuePackTier', required: false },
                    ],
                }] : []),
            ],
        });
        if (!so) throw new AppError('Sales order not found.', 404, ErrorCode.NOT_FOUND);
        return so;
    }
}

export default SalesOrderService;
