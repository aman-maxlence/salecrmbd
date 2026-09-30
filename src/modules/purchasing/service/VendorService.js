import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { scopedWhere, assertVendorInScope } from '../../../utils/countryScope.js';

class VendorService {
    constructor(models) {
        this.models = models;
    }

    async list(orgId, { status } = {}, countryScope) {
        const { Vendor, Country } = this.models;
        const where = scopedWhere({ org_id: orgId }, countryScope);
        if (status) where.status = status;
        return Vendor.findAll({
            where,
            include: [{ model: Country, as: 'country', required: false }],
            order: [['name', 'ASC']],
        });
    }

    async getById(orgId, id, countryScope) {
        return assertVendorInScope(this.models, orgId, id, countryScope);
    }

    async create(orgId, { name, email, phone, address, countryId }) {
        const { Vendor, Country } = this.models;
        if (!name?.trim()) throw new AppError('Vendor name is required.', 400, ErrorCode.VALIDATION_ERROR);
        const existing = await Vendor.findOne({ where: { org_id: orgId, name: name.trim() } });
        if (existing) throw new AppError('A vendor with that name already exists.', 409, ErrorCode.CONFLICT);
        if (countryId) {
            const country = await Country.findOne({ where: { id: countryId, org_id: orgId } });
            if (!country) throw new AppError('Country not found.', 404, ErrorCode.NOT_FOUND);
        }
        return Vendor.create({
            org_id: orgId,
            name: name.trim(),
            email: email?.trim() || null,
            phone: phone?.trim() || null,
            address: address?.trim() || null,
            country_id: countryId ?? null,
            status: 'active',
        });
    }

    async update(orgId, id, { name, email, phone, address, status, countryId }, countryScope) {
        const { Country } = this.models;
        const vendor = await assertVendorInScope(this.models, orgId, id, countryScope);
        if (countryId !== undefined) {
            if (countryId) {
                const country = await Country.findOne({ where: { id: countryId, org_id: orgId } });
                if (!country) throw new AppError('Country not found.', 404, ErrorCode.NOT_FOUND);
            }
            vendor.country_id = countryId;
        }
        if (name !== undefined) vendor.name = name.trim();
        if (email !== undefined) vendor.email = email?.trim() || null;
        if (phone !== undefined) vendor.phone = phone?.trim() || null;
        if (address !== undefined) vendor.address = address?.trim() || null;
        if (status !== undefined) vendor.status = status;
        await vendor.save();
        return vendor;
    }

    async delete(orgId, id, countryScope) {
        const { PurchaseOrder } = this.models;
        const vendor = await assertVendorInScope(this.models, orgId, id, countryScope);
        const onOrders = await PurchaseOrder.count({ where: { org_id: orgId, vendor_id: id } });
        if (onOrders > 0) {
            throw new AppError(`This vendor has ${onOrders} purchase order(s) on file. Deactivate it instead.`, 409, ErrorCode.CONFLICT);
        }
        await vendor.destroy();
    }
}

export default VendorService;
