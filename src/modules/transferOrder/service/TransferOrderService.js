import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { toNumber } from '../../../constants/inventory.js';
import StockService from '../../inventory/service/StockService.js';

class TransferOrderService {
    constructor(models) {
        this.models = models;
        this.stockService = new StockService(models);
    }

    async list(orgId, { status } = {}) {
        const { TransferOrder, Warehouse } = this.models;
        const where = { org_id: orgId };
        if (status) where.status = status;
        return TransferOrder.findAll({
            where,
            include: [
                { model: Warehouse, as: 'fromWarehouse', required: false },
                { model: Warehouse, as: 'toWarehouse', required: false },
            ],
            order: [['created_at', 'DESC']],
        });
    }

    async getById(orgId, id) {
        return this._find(orgId, id, true);
    }

    async create(orgId, { fromWarehouseId, toWarehouseId, notes, lines }, createdBy) {
        const { TransferOrder, TransferOrderLineItem, Warehouse, InventoryItem } = this.models;

        if (!fromWarehouseId || !toWarehouseId || Number(fromWarehouseId) === Number(toWarehouseId)) {
            throw new AppError('Two different warehouses are required.', 400, ErrorCode.VALIDATION_ERROR);
        }
        if (!Array.isArray(lines) || lines.length === 0) {
            throw new AppError('At least one line item is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const from = await Warehouse.findOne({ where: { id: fromWarehouseId, org_id: orgId, status: 'active' } });
        if (!from) throw new AppError('Source warehouse not found.', 404, ErrorCode.NOT_FOUND);
        const to = await Warehouse.findOne({ where: { id: toWarehouseId, org_id: orgId, status: 'active' } });
        if (!to) throw new AppError('Destination warehouse not found.', 404, ErrorCode.NOT_FOUND);

        const normalizedLines = [];
        for (const line of lines) {
            const quantity = toNumber(line.quantity, NaN);
            if (!line.itemId || !Number.isFinite(quantity) || quantity <= 0) {
                throw new AppError('Each line needs an item and a quantity greater than 0.', 400, ErrorCode.VALIDATION_ERROR);
            }
            const item = await InventoryItem.findOne({ where: { id: line.itemId, org_id: orgId } });
            if (!item) throw new AppError('Item not found.', 404, ErrorCode.NOT_FOUND);
            normalizedLines.push({ item_id: item.id, quantity });
        }

        const sequelize = TransferOrder.sequelize;
        const order = await sequelize.transaction(async (transaction) => {
            const created = await TransferOrder.create({
                org_id: orgId,
                from_warehouse_id: fromWarehouseId,
                to_warehouse_id: toWarehouseId,
                status: 'pending',
                notes: notes?.trim() || null,
                created_by: createdBy ?? null,
            }, { transaction });

            await TransferOrderLineItem.bulkCreate(
                normalizedLines.map((line) => ({ org_id: orgId, transfer_order_id: created.id, ...line })),
                { transaction }
            );

            return created;
        });

        return this.getById(orgId, order.id);
    }

    async cancel(orgId, id) {
        const order = await this._find(orgId, id, false);
        if (order.status !== 'pending') {
            throw new AppError('Only pending transfer orders can be cancelled.', 409, ErrorCode.CONFLICT);
        }
        order.status = 'cancelled';
        await order.save();
        return this.getById(orgId, id);
    }

    /**
     * Ships some or all of a transfer order's lines: stock leaves the source
     * warehouse now (StockService.adjust(type:'issue')), the destination
     * doesn't receive it until receive() is called - so a shipped line is
     * "in transit" (off the books at the source, not yet on the books at
     * the destination). Order moves pending -> in_transit on the first ship.
     */
    async ship(orgId, id, { lines }, userId) {
        const order = await this._find(orgId, id, true);
        if (order.status !== 'pending' && order.status !== 'in_transit') {
            throw new AppError('This transfer order cannot be shipped in its current status.', 409, ErrorCode.CONFLICT);
        }
        if (!Array.isArray(lines) || lines.length === 0) {
            throw new AppError('At least one line quantity is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const lineById = new Map(order.lineItems.map((l) => [l.id, l]));

        for (const input of lines) {
            const quantity = toNumber(input.quantity, NaN);
            if (!Number.isFinite(quantity) || quantity <= 0) continue;

            const line = lineById.get(Number(input.lineId));
            if (!line) throw new AppError('Line item not found on this transfer order.', 404, ErrorCode.NOT_FOUND);

            const remaining = toNumber(line.quantity) - toNumber(line.shipped_quantity);
            if (quantity > remaining) {
                throw new AppError(`Cannot ship more than the remaining ${remaining} on this line.`, 400, ErrorCode.VALIDATION_ERROR);
            }

            await this.stockService.adjust(orgId, {
                type: 'issue',
                itemId: line.item_id,
                quantity,
                warehouseId: order.from_warehouse_id,
                reason: `Transfer Order #${order.id} - shipped`,
                referenceType: 'transfer_order_ship',
                referenceId: order.id,
            }, userId);

            line.shipped_quantity = toNumber(line.shipped_quantity) + quantity;
            await line.save();
        }

        const refreshed = await this._find(orgId, id, true);
        refreshed.status = 'in_transit';
        await refreshed.save();

        return this.getById(orgId, id);
    }

    /**
     * Receives some or all of a transfer order's already-shipped lines:
     * stock arrives at the destination warehouse now
     * (StockService.adjust(type:'receive')). Order moves to 'completed'
     * once every line's received_quantity reaches its shipped_quantity.
     */
    async receive(orgId, id, { lines }, userId) {
        const order = await this._find(orgId, id, true);
        if (order.status !== 'in_transit') {
            throw new AppError('This transfer order has no shipped stock waiting to be received.', 409, ErrorCode.CONFLICT);
        }
        if (!Array.isArray(lines) || lines.length === 0) {
            throw new AppError('At least one line quantity is required.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const lineById = new Map(order.lineItems.map((l) => [l.id, l]));

        for (const input of lines) {
            const quantity = toNumber(input.quantity, NaN);
            if (!Number.isFinite(quantity) || quantity <= 0) continue;

            const line = lineById.get(Number(input.lineId));
            if (!line) throw new AppError('Line item not found on this transfer order.', 404, ErrorCode.NOT_FOUND);

            const remaining = toNumber(line.shipped_quantity) - toNumber(line.received_quantity);
            if (quantity > remaining) {
                throw new AppError(`Cannot receive more than the remaining ${remaining} shipped on this line.`, 400, ErrorCode.VALIDATION_ERROR);
            }

            await this.stockService.adjust(orgId, {
                type: 'receive',
                itemId: line.item_id,
                quantity,
                warehouseId: order.to_warehouse_id,
                reason: `Transfer Order #${order.id} - received`,
                referenceType: 'transfer_order_receive',
                referenceId: order.id,
            }, userId);

            line.received_quantity = toNumber(line.received_quantity) + quantity;
            await line.save();
        }

        const refreshed = await this._find(orgId, id, true);
        const fullyReceived = refreshed.lineItems.every((l) => toNumber(l.received_quantity) >= toNumber(l.shipped_quantity) && toNumber(l.shipped_quantity) >= toNumber(l.quantity));
        refreshed.status = fullyReceived ? 'completed' : refreshed.status;
        await refreshed.save();

        return this.getById(orgId, id);
    }

    async _find(orgId, id, withLines) {
        const { TransferOrder, TransferOrderLineItem, Warehouse, InventoryItem } = this.models;
        const order = await TransferOrder.findOne({
            where: { id, org_id: orgId },
            include: [
                { model: Warehouse, as: 'fromWarehouse', required: false },
                { model: Warehouse, as: 'toWarehouse', required: false },
                ...(withLines ? [{
                    model: TransferOrderLineItem,
                    as: 'lineItems',
                    required: false,
                    include: [{ model: InventoryItem, as: 'item', required: false }],
                }] : []),
            ],
        });
        if (!order) throw new AppError('Transfer order not found.', 404, ErrorCode.NOT_FOUND);
        return order;
    }
}

export default TransferOrderService;
