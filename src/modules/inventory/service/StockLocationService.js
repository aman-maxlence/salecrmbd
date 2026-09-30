import { Op } from 'sequelize';
import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';

// Strict 4-level hierarchy - a location's type dictates exactly what type its
// parent must be (or, for 'zone', that it must have no parent at all). This
// also means cycles are structurally impossible: a lower-tier type (e.g.
// 'bin') can never be accepted as the parent of a higher-tier type (e.g.
// 'rack'), so no separate cycle-detection walk is needed here (contrast
// CatalogLookupService's category hierarchy, which has no type constraint
// and so needs one).
const TYPE_ORDER = ['zone', 'aisle', 'rack', 'bin'];
const REQUIRED_PARENT_TYPE = { zone: null, aisle: 'zone', rack: 'aisle', bin: 'rack' };

class StockLocationService {
    constructor(models) {
        this.models = models;
    }

    async _assertWarehouse(orgId, warehouseId) {
        const { Warehouse } = this.models;
        const warehouse = await Warehouse.findOne({ where: { id: warehouseId, org_id: orgId } });
        if (!warehouse) throw new AppError('Warehouse not found.', 404, ErrorCode.NOT_FOUND);
        return warehouse;
    }

    async _findLocation(orgId, warehouseId, id) {
        const { StockLocation } = this.models;
        const row = await StockLocation.findOne({ where: { id, org_id: orgId, warehouse_id: warehouseId } });
        if (!row) throw new AppError('Location not found.', 404, ErrorCode.NOT_FOUND);
        return row;
    }

    async list(orgId, warehouseId) {
        await this._assertWarehouse(orgId, warehouseId);
        const { StockLocation } = this.models;
        return StockLocation.findAll({
            where: { org_id: orgId, warehouse_id: warehouseId },
            order: [['type', 'ASC'], ['name', 'ASC']],
        });
    }

    /** Validates parentLocationId matches the type this `type` of location requires, and returns the resolved parent row (or null for a zone). */
    async _resolveParent(orgId, warehouseId, type, parentLocationId) {
        const requiredParentType = REQUIRED_PARENT_TYPE[type];

        if (!requiredParentType) {
            if (parentLocationId) {
                throw new AppError('A zone is top-level and cannot have a parent.', 400, ErrorCode.VALIDATION_ERROR);
            }
            return null;
        }

        if (!parentLocationId) {
            throw new AppError(`A ${type} must have a parent ${requiredParentType}.`, 400, ErrorCode.VALIDATION_ERROR);
        }

        const parent = await this._findLocation(orgId, warehouseId, parentLocationId);
        if (parent.type !== requiredParentType) {
            throw new AppError(`A ${type}'s parent must be a ${requiredParentType}, not a ${parent.type}.`, 400, ErrorCode.VALIDATION_ERROR);
        }
        return parent;
    }

    async _assertUnique(orgId, warehouseId, { name, code, parentLocationId }, excludeId) {
        const { StockLocation } = this.models;

        const nameClash = await StockLocation.findOne({
            where: {
                org_id: orgId,
                warehouse_id: warehouseId,
                parent_location_id: parentLocationId ?? null,
                name,
                ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
            },
        });
        if (nameClash) throw new AppError(`"${name}" already exists at this level.`, 409, ErrorCode.CONFLICT);

        if (code) {
            const codeClash = await StockLocation.findOne({
                where: {
                    org_id: orgId,
                    warehouse_id: warehouseId,
                    code,
                    ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
                },
            });
            if (codeClash) throw new AppError(`Code "${code}" already exists in this warehouse.`, 409, ErrorCode.CONFLICT);
        }
    }

    async create(orgId, warehouseId, { type, name, code, parentLocationId }) {
        await this._assertWarehouse(orgId, warehouseId);

        if (!TYPE_ORDER.includes(type)) {
            throw new AppError(`Type must be one of: ${TYPE_ORDER.join(', ')}.`, 400, ErrorCode.VALIDATION_ERROR);
        }
        const trimmedName = name?.trim();
        if (!trimmedName) throw new AppError('Name is required.', 400, ErrorCode.VALIDATION_ERROR);
        const trimmedCode = code?.trim() || null;

        await this._resolveParent(orgId, warehouseId, type, parentLocationId);
        await this._assertUnique(orgId, warehouseId, { name: trimmedName, code: trimmedCode, parentLocationId });

        return this.models.StockLocation.create({
            org_id: orgId,
            warehouse_id: warehouseId,
            parent_location_id: parentLocationId || null,
            type,
            name: trimmedName,
            code: trimmedCode,
        });
    }

    async update(orgId, warehouseId, id, { name, code, status, parentLocationId }) {
        const row = await this._findLocation(orgId, warehouseId, id);

        const nextName = name !== undefined ? name?.trim() : row.name;
        if (!nextName) throw new AppError('Name is required.', 400, ErrorCode.VALIDATION_ERROR);
        const nextCode = code !== undefined ? (code?.trim() || null) : row.code;
        const nextParentId = parentLocationId !== undefined ? (parentLocationId || null) : row.parent_location_id;

        if (parentLocationId !== undefined) {
            await this._resolveParent(orgId, warehouseId, row.type, nextParentId);
        }
        await this._assertUnique(orgId, warehouseId, { name: nextName, code: nextCode, parentLocationId: nextParentId }, row.id);

        row.name = nextName;
        row.code = nextCode;
        row.parent_location_id = nextParentId;
        if (status !== undefined) {
            if (!['active', 'inactive'].includes(status)) {
                throw new AppError('Status must be "active" or "inactive".', 400, ErrorCode.VALIDATION_ERROR);
            }
            row.status = status;
        }
        await row.save();
        return row;
    }

    async delete(orgId, warehouseId, id) {
        const row = await this._findLocation(orgId, warehouseId, id);
        const { StockLocation, StockLevel } = this.models;

        const childCount = await StockLocation.count({ where: { org_id: orgId, parent_location_id: id } });
        if (childCount > 0) {
            throw new AppError(`${childCount} location(s) still nested under this - remove those first.`, 409, ErrorCode.CONFLICT);
        }

        const inUse = await StockLevel.count({ where: { org_id: orgId, location_id: id } });
        if (inUse > 0) {
            throw new AppError(`${inUse} item(s) still have stock placed at this location - reassign them first.`, 409, ErrorCode.CONFLICT);
        }

        await row.destroy();
    }
}

export default StockLocationService;
