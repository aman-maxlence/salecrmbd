import { AppError, ErrorCode } from '../errors/index.js';
import { Logger } from '../utils/index.js';
import { Database } from '../models/index.js';
import PortalUserService from '../modules/portalUser/service/PortalUserService.js';

/**
 * Must run AFTER PermissionMiddleware, which already resolved req.portalUser
 * - reuses it instead of re-querying PortalUser/OrgRole. Only chained onto
 * the specific Warehouse/Vendor-selection routes that need it (see the
 * country-scoped-warehouses-vendors plan), not globally, since most
 * permission-gated routes have nothing to do with Warehouse/Vendor scoping.
 */
export const CountryScopeMiddleware = async (req, res, next) => {
    try {
        if (!req.portalUser) {
            throw new AppError('Missing authenticated portal user context.', 401, ErrorCode.UNAUTHORIZED);
        }

        const models = Database.getModels();
        const portalUserService = new PortalUserService(models);
        req.countryScope = await portalUserService.resolveCountryScope(req.portalUser);
        next();
    } catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json(error.toJSON());
        }
        Logger.error('CountryScopeMiddleware error:', error.message);
        return res.status(500).json(new AppError('Country scope check failed.', 500, ErrorCode.INTERNAL_SERVER_ERROR).toJSON());
    }
};

export default CountryScopeMiddleware;
