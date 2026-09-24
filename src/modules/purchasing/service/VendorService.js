import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';

class VendorService {
    constructor(models) {
        this.models = models;
    }

    async list(orgId, { status } = {}) {
        const { Vendor } = this.models;
        const where = { org_id: orgId };
        if (status) where.status = status;
        return Vendor.findAll({ where, order: [['name', 'ASC']] });
    }

    async getById(orgId, id) {
        const vendor = await this._find(orgId, id);
        return vendor;
    }

    async create(orgId, { name, email, phone, address }) {
        const { Vendor } = this.models;
        if (!name?.trim()) throw new AppError('Vendor name is required.', 400, ErrorCode.VALIDATION_ERROR);
        const existing = await Vendor.findOne({ where: { org_id: orgId, name: name.trim() } });
        if (existing) throw new AppError('A vendor with that name already exists.', 409, ErrorCode.CONFLICT);
        return Vendor.create({
            org_id: orgId,
            name: name.trim(),
            email: email?.trim() || null,
            phone: phone?.trim() || null,
            address: address?.trim() || null,
            status: 'active',
        });
    }

    async update(orgId, id, { name, email, phone, address, status }) {
        const vendor = await this._find(orgId, id);
        if (name !== undefined) vendor.name = name.trim();
        if (email !== undefined) vendor.email = email?.trim() || null;
        if (phone !== undefined) vendor.phone = phone?.trim() || null;
        if (address !== undefined) vendor.address = address?.trim() || null;
        if (status !== undefined) vendor.status = status;
        await vendor.save();
        return vendor;
    }

    async delete(orgId, id) {
        const { PurchaseOrder } = this.models;
        const vendor = await this._find(orgId, id);
        const onOrders = await PurchaseOrder.count({ where: { org_id: orgId, vendor_id: id } });
        if (onOrders > 0) {
            throw new AppError(`This vendor has ${onOrders} purchase order(s) on file. Deactivate it instead.`, 409, ErrorCode.CONFLICT);
        }
        await vendor.destroy();
    }

    async _find(orgId, id) {
        const { Vendor } = this.models;
        const vendor = await Vendor.findOne({ where: { id, org_id: orgId } });
        if (!vendor) throw new AppError('Vendor not found.', 404, ErrorCode.NOT_FOUND);
        return vendor;
    }
}

export default VendorService;
