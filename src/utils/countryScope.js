import { Op } from 'sequelize';
import AppError from '../errors/AppError.js';
import { ErrorCode } from '../errors/index.js';

/**
 * Merges a country-scope restriction into a Sequelize where clause. NULL
 * country_id always passes (visible to everyone) - see the
 * country-scoped-warehouses-vendors plan for why that's the only
 * non-breaking default. A no-op when the caller isn't restricted.
 */
export function scopedWhere(where, countryScope) {
    if (!countryScope?.restricted) return where;
    return {
        ...where,
        [Op.or]: [{ country_id: null }, { country_id: countryScope.countryId }],
    };
}

/**
 * Shared lookup+guard for every place that validates a submitted
 * warehouseId, replacing the ad hoc inline Warehouse.findOne duplicated
 * across services. 404 (not 403) matches every other org-mismatch findOne
 * in this codebase - never distinguishes "exists but not yours".
 */
export async function assertWarehouseInScope(models, orgId, warehouseId, countryScope, extraWhere = {}) {
    const { Warehouse } = models;
    const warehouse = await Warehouse.findOne({
        where: scopedWhere({ id: warehouseId, org_id: orgId, ...extraWhere }, countryScope),
    });
    if (!warehouse) throw new AppError('Warehouse not found.', 404, ErrorCode.NOT_FOUND);
    return warehouse;
}

export async function assertVendorInScope(models, orgId, vendorId, countryScope, extraWhere = {}) {
    const { Vendor } = models;
    const vendor = await Vendor.findOne({
        where: scopedWhere({ id: vendorId, org_id: orgId, ...extraWhere }, countryScope),
    });
    if (!vendor) throw new AppError('Vendor not found.', 404, ErrorCode.NOT_FOUND);
    return vendor;
}
