import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';

/**
 * Shared CRUD for the small org-scoped catalog lookup tables (Category,
 * Brand, Manufacturer) that back the "Manage X" pickers on the item form -
 * each is just a name (Category also has a self-referencing parent), with
 * an in-use guard before delete. One instance per lookup type.
 */
class CatalogLookupService {
    /**
     * @param {object} models - flat model map
     * @param {string} modelName - e.g. 'ItemCategory'
     * @param {string} itemFkColumn - the InventoryItem column referencing this lookup, e.g. 'category_id'
     * @param {boolean} hasParent - whether this lookup supports a self-referencing parent_id (only Category)
     */
    constructor(models, modelName, itemFkColumn, hasParent = false) {
        this.models = models;
        this.modelName = modelName;
        this.itemFkColumn = itemFkColumn;
        this.hasParent = hasParent;
    }

    get model() {
        return this.models[this.modelName];
    }

    async list(orgId) {
        const include = this.hasParent ? [{ model: this.model, as: 'parent', required: false }] : [];
        return this.model.findAll({ where: { org_id: orgId }, include, order: [['name', 'ASC']] });
    }

    async create(orgId, { name, parentId }) {
        if (!name?.trim()) throw new AppError('Name is required.', 400, ErrorCode.VALIDATION_ERROR);
        const existing = await this.model.findOne({ where: { org_id: orgId, name: name.trim() } });
        if (existing) throw new AppError(`"${name.trim()}" already exists.`, 409, ErrorCode.CONFLICT);

        const attrs = { org_id: orgId, name: name.trim() };
        if (this.hasParent) {
            if (parentId) await this._assertExists(orgId, parentId);
            attrs.parent_id = parentId || null;
        }
        return this.model.create(attrs);
    }

    async update(orgId, id, { name, parentId }) {
        const row = await this._find(orgId, id);
        if (name !== undefined) {
            if (!name?.trim()) throw new AppError('Name is required.', 400, ErrorCode.VALIDATION_ERROR);
            const clash = await this.model.findOne({ where: { org_id: orgId, name: name.trim() } });
            if (clash && clash.id !== row.id) throw new AppError(`"${name.trim()}" already exists.`, 409, ErrorCode.CONFLICT);
            row.name = name.trim();
        }
        if (this.hasParent && parentId !== undefined) {
            if (parentId) {
                if (Number(parentId) === Number(id)) throw new AppError('A category cannot be its own parent.', 400, ErrorCode.VALIDATION_ERROR);
                await this._assertExists(orgId, parentId);
            }
            row.parent_id = parentId || null;
        }
        await row.save();
        return row;
    }

    async delete(orgId, id) {
        const row = await this._find(orgId, id);
        const { InventoryItem } = this.models;
        const inUse = await InventoryItem.count({ where: { org_id: orgId, [this.itemFkColumn]: id } });
        if (inUse > 0) {
            throw new AppError(`${inUse} item(s) still use this - reassign or remove those first.`, 409, ErrorCode.CONFLICT);
        }
        if (this.hasParent) {
            const childCount = await this.model.count({ where: { org_id: orgId, parent_id: id } });
            if (childCount > 0) {
                throw new AppError(`${childCount} sub-categor${childCount === 1 ? 'y' : 'ies'} still reference this - remove those first.`, 409, ErrorCode.CONFLICT);
            }
        }
        await row.destroy();
    }

    async _find(orgId, id) {
        const row = await this.model.findOne({ where: { id, org_id: orgId } });
        if (!row) throw new AppError('Not found.', 404, ErrorCode.NOT_FOUND);
        return row;
    }

    async _assertExists(orgId, id) {
        const row = await this.model.findOne({ where: { id, org_id: orgId } });
        if (!row) throw new AppError('Parent category not found.', 404, ErrorCode.NOT_FOUND);
    }
}

export default CatalogLookupService;
