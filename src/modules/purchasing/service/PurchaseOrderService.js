import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { toNumber } from '../../../constants/inventory.js';
import StockService from '../../inventory/service/StockService.js';

class PurchaseOrderService {
    constructor(models) {
        this.models = models;
        this.stockService = new StockService(models);
    }

    async list(orgId, { status, vendorId } = {}) {
        const { PurchaseOrder, Vendor, Warehouse } = this.models;
        const where = { org_id: orgId };
        if (status) where.status = status;
        if (vendorId) where.vendor_id = vendorId;
        return PurchaseOrder.findAll({
            where,
            include: [
                { model: Vendor, as: 'vendor', required: false },
                { model: Warehouse, as: 'warehouse', required: false },
            ],
            order: [['created_at', 'DESC']],
        });
    }

    async getById(orgId, id) {
        return this._find(orgId, id, true);
    }

    async create(orgId, { vendorId, warehouseId, expectedDate, notes, lines }, createdBy) {
        const { PurchaseOrder, PurchaseOrderLineItem, Vendor, Warehouse, InventoryItem } = this.models;

        if (!vendorId) throw new AppError('Vendor is required.', 400, ErrorCode.VALIDATION_ERROR);
        if (!warehouseId) throw new AppError('Destination warehouse is required.', 400, ErrorCode.VALIDATION_ERROR);
        if (!Array.isArray(lines) || lines.length === 0) {
            throw new AppError('At least one line item is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const vendor = await Vendor.findOne({ where: { id: vendorId, org_id: orgId } });
        if (!vendor) throw new AppError('Vendor not found.', 404, ErrorCode.NOT_FOUND);
        const warehouse = await Warehouse.findOne({ where: { id: warehouseId, org_id: orgId, status: 'active' } });
        if (!warehouse) throw new AppError('Warehouse not found.', 404, ErrorCode.NOT_FOUND);

        const normalizedLines = [];
        for (const line of lines) {
            const quantity = toNumber(line.quantity, NaN);
            const unitCost = toNumber(line.unitCost, NaN);
            if (!line.itemId || !Number.isFinite(quantity) || quantity <= 0) {
                throw new AppError('Each line needs an item and a quantity greater than 0.', 400, ErrorCode.VALIDATION_ERROR);
            }
            if (!Number.isFinite(unitCost) || unitCost < 0) {
                throw new AppError('Each line needs a unit cost greater than or equal to 0.', 400, ErrorCode.VALIDATION_ERROR);
            }
            const item = await InventoryItem.findOne({ where: { id: line.itemId, org_id: orgId } });
            if (!item) throw new AppError('Item not found.', 404, ErrorCode.NOT_FOUND);
            normalizedLines.push({ item_id: item.id, quantity, unit_cost: unitCost });
        }

        const sequelize = PurchaseOrder.sequelize;
        const po = await sequelize.transaction(async (transaction) => {
            const order = await PurchaseOrder.create({
                org_id: orgId,
                vendor_id: vendorId,
                warehouse_id: warehouseId,
                status: 'ordered',
                expected_date: expectedDate || null,
                notes: notes?.trim() || null,
                created_by: createdBy ?? null,
            }, { transaction });

            await PurchaseOrderLineItem.bulkCreate(
                normalizedLines.map((line) => ({ org_id: orgId, purchase_order_id: order.id, ...line })),
                { transaction }
            );

            return order;
        });

        return this.getById(orgId, po.id);
    }

    async cancel(orgId, id) {
        const po = await this._find(orgId, id, false);
        if (!['draft', 'ordered'].includes(po.status)) {
            throw new AppError('Only draft or ordered purchase orders can be cancelled.', 409, ErrorCode.CONFLICT);
        }
        po.status = 'cancelled';
        await po.save();
        return this.getById(orgId, id);
    }

    /**
     * Receives some or all of a PO's line items into its warehouse - each
     * line goes through StockService.adjust(type:'receive') so the same
     * locking/audit-trail path is used as a manual stock receive.
     */
    async receive(orgId, id, { lines }, userId) {
        const po = await this._find(orgId, id, true);
        if (!['ordered', 'partially_received'].includes(po.status)) {
            throw new AppError('This purchase order cannot be received in its current status.', 409, ErrorCode.CONFLICT);
        }
        if (!Array.isArray(lines) || lines.length === 0) {
            throw new AppError('At least one line quantity is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const lineById = new Map(po.lineItems.map((l) => [l.id, l]));

        for (const input of lines) {
            const quantity = toNumber(input.quantity, NaN);
            if (!Number.isFinite(quantity) || quantity <= 0) continue;

            const line = lineById.get(Number(input.lineId));
            if (!line) throw new AppError('Line item not found on this purchase order.', 404, ErrorCode.NOT_FOUND);

            const remaining = toNumber(line.quantity) - toNumber(line.received_quantity);
            if (quantity > remaining) {
                throw new AppError(`Cannot receive more than the remaining ${remaining} on this line.`, 400, ErrorCode.VALIDATION_ERROR);
            }

            await this.stockService.adjust(orgId, {
                type: 'receive',
                itemId: line.item_id,
                quantity,
                warehouseId: po.warehouse_id,
                reason: `Purchase Order #${po.id}`,
                referenceType: 'purchase_order',
                referenceId: po.id,
            }, userId);

            line.received_quantity = toNumber(line.received_quantity) + quantity;
            await line.save();
        }

        const refreshed = await this._find(orgId, id, true);
        const fullyReceived = refreshed.lineItems.every((l) => toNumber(l.received_quantity) >= toNumber(l.quantity));
        const anyReceived = refreshed.lineItems.some((l) => toNumber(l.received_quantity) > 0);
        refreshed.status = fullyReceived ? 'received' : (anyReceived ? 'partially_received' : refreshed.status);
        await refreshed.save();

        return this.getById(orgId, id);
    }

    async _find(orgId, id, withLines) {
        const { PurchaseOrder, PurchaseOrderLineItem, Vendor, Warehouse, InventoryItem } = this.models;
        const po = await PurchaseOrder.findOne({
            where: { id, org_id: orgId },
            include: [
                { model: Vendor, as: 'vendor', required: false },
                { model: Warehouse, as: 'warehouse', required: false },
                ...(withLines ? [{
                    model: PurchaseOrderLineItem,
                    as: 'lineItems',
                    required: false,
                    include: [{ model: InventoryItem, as: 'item', required: false }],
                }] : []),
            ],
        });
        if (!po) throw new AppError('Purchase order not found.', 404, ErrorCode.NOT_FOUND);
        return po;
    }
}

export default PurchaseOrderService;
