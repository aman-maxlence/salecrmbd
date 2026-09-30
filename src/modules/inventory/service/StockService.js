import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { STOCK_ADJUSTMENT_TYPES, toNumber } from '../../../constants/inventory.js';
import LowStockAlertService from './LowStockAlertService.js';
import PortalUserService from '../../portalUser/service/PortalUserService.js';
import { assertWarehouseInScope } from '../../../utils/countryScope.js';

/**
 * Stock mutations always run inside a transaction with row-level locks
 * (SELECT ... FOR UPDATE) so concurrent receive/issue/transfer on the same
 * (item, warehouse) cannot oversell or lose receipts.
 */
class StockService {
    constructor(models) {
        this.models = models;
        this.alertService = new LowStockAlertService(models);
        this.portalUserService = new PortalUserService(models);
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

        if (item.track_inventory === false) {
            throw new AppError(`"${item.name}" does not track inventory (service item) - it has no stock to adjust.`, 400, ErrorCode.VALIDATION_ERROR);
        }

        const sequelize = this.models.StockLevel.sequelize;

        const result = await sequelize.transaction(async (transaction) => {
            if (type === 'receive') {
                await this._assertWarehouse(orgId, payload.warehouseId);
                if (payload.locationId) {
                    const location = await this.models.StockLocation.findOne({
                        where: { id: payload.locationId, org_id: orgId, warehouse_id: payload.warehouseId },
                    });
                    if (!location) throw new AppError('Location not found in this warehouse.', 404, ErrorCode.NOT_FOUND);
                }
                const level = await this._lockOrCreateLevel(orgId, item.id, payload.warehouseId, transaction);
                level.quantity = toNumber(level.quantity) + quantity;
                level.version = toNumber(level.version) + 1;
                if (payload.locationId) level.location_id = payload.locationId;
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
                reference_type: payload.referenceType ?? null,
                reference_id: payload.referenceId ?? null,
                reference_number: payload.referenceNumber?.trim() || null,
                notes: payload.notes?.trim() || null,
                location_id: type === 'receive' ? (payload.locationId || null) : null,
                effective_date: payload.effectiveDate || new Date().toISOString().slice(0, 10),
                status: 'applied',
                created_by: createdBy ?? null,
            }, { transaction });

            return adjustment;
        });

        await this.alertService.refreshForItem(orgId, item.id);
        return result;
    }

    /**
     * Lists adjustments newest-first for the Adjustments page - optionally
     * scoped to a `referenceType` (e.g. 'item_creation' to isolate opening
     * stock rows from every other manual adjustment), and resolves each
     * row's `created_by` id to a display name (best-effort - identity lives
     * in userbd's Redis cache, not locally, so a cache miss just shows null).
     */
    async listAdjustments(orgId, { referenceType } = {}) {
        const { StockAdjustment, InventoryItem, Warehouse, StockLocation } = this.models;
        const where = { org_id: orgId };
        if (referenceType) where.reference_type = referenceType;

        const rows = await StockAdjustment.findAll({
            where,
            include: [
                { model: InventoryItem, as: 'item', required: false },
                { model: Warehouse, as: 'fromWarehouse', required: false },
                { model: Warehouse, as: 'toWarehouse', required: false },
                { model: StockLocation, as: 'location', required: false },
            ],
            order: [['created_at', 'DESC']],
        });

        const creatorIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))];
        const profiles = await Promise.all(creatorIds.map((id) => this.portalUserService.getUserProfile(id)));
        const nameById = new Map(creatorIds.map((id, i) => [id, profiles[i]?.name ?? null]));

        return rows.map((r) => {
            const json = r.toJSON();
            json.created_by_name = r.created_by ? (nameById.get(r.created_by) ?? null) : null;
            return json;
        });
    }

    /** Records the adjustment's details without moving stock yet - see applyAdjustment(). */
    async createDraftAdjustment(orgId, payload, createdBy) {
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
        if (item.track_inventory === false) {
            throw new AppError(`"${item.name}" does not track inventory (service item) - it has no stock to adjust.`, 400, ErrorCode.VALIDATION_ERROR);
        }

        return this.models.StockAdjustment.create({
            org_id: orgId,
            item_id: item.id,
            type,
            quantity,
            from_warehouse_id: type === 'transfer' ? payload.fromWarehouseId : (type === 'issue' ? payload.warehouseId : null),
            to_warehouse_id: type === 'transfer' ? payload.toWarehouseId : (type === 'receive' ? payload.warehouseId : null),
            reason: payload.reason?.trim() || null,
            reference_type: payload.referenceType ?? null,
            reference_id: payload.referenceId ?? null,
            reference_number: payload.referenceNumber?.trim() || null,
            notes: payload.notes?.trim() || null,
            location_id: type === 'receive' ? (payload.locationId || null) : null,
            status: 'draft',
            created_by: createdBy ?? null,
        });
    }

    /** Applies a previously-drafted adjustment: moves stock via the normal adjust() path, then flips the same row to 'applied'. */
    async applyAdjustment(orgId, id, createdBy) {
        const draft = await this.models.StockAdjustment.findOne({ where: { id, org_id: orgId } });
        if (!draft) throw new AppError('Adjustment not found.', 404, ErrorCode.NOT_FOUND);
        if (draft.status !== 'draft') {
            throw new AppError('This adjustment has already been applied.', 409, ErrorCode.CONFLICT);
        }

        await this.adjust(orgId, {
            type: draft.type,
            itemId: draft.item_id,
            quantity: draft.quantity,
            warehouseId: draft.type === 'receive' ? draft.to_warehouse_id : draft.from_warehouse_id,
            fromWarehouseId: draft.from_warehouse_id,
            toWarehouseId: draft.to_warehouse_id,
            reason: draft.reason,
            referenceType: draft.reference_type,
            referenceId: draft.reference_id,
            referenceNumber: draft.reference_number,
            notes: draft.notes,
            locationId: draft.location_id,
        }, createdBy);

        await draft.destroy();
        return this.listAdjustments(orgId);
    }

    /**
     * Tags where within a warehouse an item's stock physically sits (Zone/
     * Aisle/Rack/Bin) - a placement label only, separate from the
     * receive/issue/transfer quantity ledger above. Creates a zero-quantity
     * StockLevel row if the item has no stock in that warehouse yet, so a
     * location can be assigned ahead of the first receipt.
     */
    async setItemLocation(orgId, itemId, warehouseId, locationId) {
        const item = await this.models.InventoryItem.findOne({ where: { id: itemId, org_id: orgId } });
        if (!item) throw new AppError('Item not found.', 404, ErrorCode.NOT_FOUND);
        await this._assertWarehouse(orgId, warehouseId);

        if (locationId) {
            const location = await this.models.StockLocation.findOne({
                where: { id: locationId, org_id: orgId, warehouse_id: warehouseId },
            });
            if (!location) throw new AppError('Location not found in this warehouse.', 404, ErrorCode.NOT_FOUND);
        }

        const sequelize = this.models.StockLevel.sequelize;
        return sequelize.transaction(async (transaction) => {
            const level = await this._lockOrCreateLevel(orgId, itemId, warehouseId, transaction);
            level.location_id = locationId || null;
            await level.save({ transaction });
            return level;
        });
    }

    /** Reverse of ItemService.getStockBreakdown - every item currently holding stock in one warehouse, instead of one item's stock across every warehouse. */
    async getWarehouseStockBreakdown(orgId, warehouseId, countryScope) {
        await assertWarehouseInScope(this.models, orgId, warehouseId, countryScope);
        const { StockLevel, InventoryItem, StockLocation, SalesOrder, SalesOrderLineItem } = this.models;

        const levels = await StockLevel.findAll({
            where: { org_id: orgId, warehouse_id: warehouseId },
            include: [
                { model: InventoryItem, as: 'item', required: true },
                { model: StockLocation, as: 'location', required: false },
            ],
        });

        const openLines = await SalesOrderLineItem.findAll({
            where: { org_id: orgId },
            include: [{
                model: SalesOrder,
                as: 'salesOrder',
                required: true,
                where: { org_id: orgId, warehouse_id: warehouseId, status: ['pending', 'partially_fulfilled'] },
            }],
        });
        const committedByItem = new Map();
        for (const line of openLines) {
            const remaining = toNumber(line.quantity) - toNumber(line.fulfilled_quantity);
            if (remaining <= 0) continue;
            committedByItem.set(line.item_id, (committedByItem.get(line.item_id) ?? 0) + remaining);
        }

        return levels
            .map((level) => {
                const onHand = toNumber(level.quantity);
                const committed = committedByItem.get(level.item_id) ?? 0;
                return {
                    itemId: level.item_id,
                    itemName: level.item?.name,
                    sku: level.item?.sku,
                    onHand,
                    committed,
                    available: onHand - committed,
                    locationId: level.location_id,
                    locationName: level.location?.name ?? null,
                    locationType: level.location?.type ?? null,
                };
            })
            .sort((a, b) => (a.itemName ?? '').localeCompare(b.itemName ?? ''));
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
