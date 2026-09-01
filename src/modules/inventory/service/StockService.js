import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { STOCK_ADJUSTMENT_TYPES, toNumber } from '../../../constants/inventory.js';
import LowStockAlertService from './LowStockAlertService.js';

/**
 * Stock mutations always run inside a transaction with row-level locks
 * (SELECT ... FOR UPDATE) so concurrent receive/issue/transfer on the same
 * (item, warehouse) cannot oversell or lose receipts.
 */
class StockService {
    constructor(models) {
        this.models = models;
        this.alertService = new LowStockAlertService(models);
    }

    async adjust(orgId, payload, createdBy) {
        const type = payload.type;
        if (!STOCK_ADJUSTMENT_TYPES.includes(type)) {
            throw new AppError('Adjustment type must be receive, issue, or transfer.', 400, ErrorCode.VALIDATION_ERROR);
        }
        const quantity = toNumber(payload.quantity, NaN);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new AppError('Quantity must be a number greater than 0.', 400, ErrorCode.VALIDATION_ERROR);
        }

        const item = await this.models.InventoryItem.findOne({ where: { id: payload.itemId, org_id: orgId } });
        if (!item) throw new AppError('Item not found.', 404, ErrorCode.NOT_FOUND);

        const sequelize = this.models.StockLevel.sequelize;

        const result = await sequelize.transaction(async (transaction) => {
            if (type === 'receive') {
                await this._assertWarehouse(orgId, payload.warehouseId);
                const level = await this._lockOrCreateLevel(orgId, item.id, payload.warehouseId, transaction);
                level.quantity = toNumber(level.quantity) + quantity;
                level.version = toNumber(level.version) + 1;
                await level.save({ transaction });
            } else if (type === 'issue') {
                await this._assertWarehouse(orgId, payload.warehouseId);
                const level = await this._lockOrCreateLevel(orgId, item.id, payload.warehouseId, transaction);
                const current = toNumber(level.quantity);
                if (current < quantity) {
                    throw new AppError(`Insufficient stock. Available: ${current}.`, 409, ErrorCode.CONFLICT);
                }
                level.quantity = current - quantity;
                level.version = toNumber(level.version) + 1;
                await level.save({ transaction });
            } else {
                const fromId = payload.fromWarehouseId;
                const toId = payload.toWarehouseId;
                if (!fromId || !toId || Number(fromId) === Number(toId)) {
                    throw new AppError('Transfer requires two different warehouses.', 400, ErrorCode.VALIDATION_ERROR);
                }
                await this._assertWarehouse(orgId, fromId);
                await this._assertWarehouse(orgId, toId);

                // Lock in stable id order to avoid deadlocks under concurrent transfers.
                const firstId = Number(fromId) < Number(toId) ? fromId : toId;
                const secondId = Number(fromId) < Number(toId) ? toId : fromId;
                const first = await this._lockOrCreateLevel(orgId, item.id, firstId, transaction);
                const second = await this._lockOrCreateLevel(orgId, item.id, secondId, transaction);
                const fromLevel = Number(fromId) === Number(first.warehouse_id) ? first : second;
                const toLevel = Number(toId) === Number(first.warehouse_id) ? first : second;

                const current = toNumber(fromLevel.quantity);
                if (current < quantity) {
                    throw new AppError(`Insufficient stock to transfer. Available: ${current}.`, 409, ErrorCode.CONFLICT);
                }
                fromLevel.quantity = current - quantity;
                fromLevel.version = toNumber(fromLevel.version) + 1;
                toLevel.quantity = toNumber(toLevel.quantity) + quantity;
                toLevel.version = toNumber(toLevel.version) + 1;
                await fromLevel.save({ transaction });
                await toLevel.save({ transaction });
            }

            const adjustment = await this.models.StockAdjustment.create({
                org_id: orgId,
                item_id: item.id,
                type,
                quantity,
                from_warehouse_id: type === 'transfer' ? payload.fromWarehouseId : (type === 'issue' ? payload.warehouseId : null),
                to_warehouse_id: type === 'transfer' ? payload.toWarehouseId : (type === 'receive' ? payload.warehouseId : null),
                reason: payload.reason?.trim() || null,
                created_by: createdBy ?? null,
            }, { transaction });

            return adjustment;
        });

        await this.alertService.refreshForItem(orgId, item.id);
        return result;
    }

    async _assertWarehouse(orgId, warehouseId) {
        const warehouse = await this.models.Warehouse.findOne({
            where: { id: warehouseId, org_id: orgId, status: 'active' },
        });
        if (!warehouse) throw new AppError('Warehouse not found.', 404, ErrorCode.NOT_FOUND);
        return warehouse;
    }

    async _lockOrCreateLevel(orgId, itemId, warehouseId, transaction) {
        const { StockLevel } = this.models;
        const lockOpts = {
            where: { org_id: orgId, item_id: itemId, warehouse_id: warehouseId },
            lock: transaction.LOCK?.UPDATE,
            transaction,
        };

        let level = await StockLevel.findOne(lockOpts);
        if (level) return level;

        try {
            await StockLevel.create({
                org_id: orgId,
                item_id: itemId,
                warehouse_id: warehouseId,
                quantity: 0,
                version: 0,
            }, { transaction });
        } catch {
            // Unique race with another transaction - fall through to locked read.
        }

        level = await StockLevel.findOne(lockOpts);
        if (!level) {
            throw new AppError('Could not lock stock level.', 500, ErrorCode.INTERNAL_SERVER_ERROR);
        }
        return level;
    }
}

export default StockService;
