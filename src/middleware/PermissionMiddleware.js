import { AppError, ErrorCode } from '../errors/index.js';
import { Logger } from '../utils/index.js';
import { Database } from '../models/index.js';
import PortalUserService from '../modules/portalUser/service/PortalUserService.js';

/**
 * Checks the caller's OrgRole.permissions for `requiredPermission` (or, if
 * given an array, any one of them - OR semantics). Always reads fresh from
 * the DB (no Redis permission cache) so a permission change takes effect on
 * the user's very next request, per design doc §5 QA requirement.
 *
 * Unlike maxpmbd's PermissionMiddleware, this never special-cases a
 * hardcoded 'Super Admin' role name lookup - the Super Admin role is seeded
 * with every permission true (see OrgRoleService.seedDefaultRolesForOrg),
 * so it satisfies this same check like any other role. That sidesteps the
 * 'Super Admin' vs 'Admin' naming-drift bug found in the reference codebase.
 */
export const PermissionMiddleware = (requiredPermission) => {
    const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

    return async (req, res, next) => {
        try {
            const userId = req.user?.id ?? req.userId;
            const orgId = req.user?.org?.id;

            if (!userId || !orgId) {
                throw new AppError('Missing authenticated user or organization context.', 401, ErrorCode.UNAUTHORIZED);
            }

            const models = Database.getModels();
            const portalUserService = new PortalUserService(models);
            const portalUser = await portalUserService.getWithRole(userId, orgId);

            const permissions = portalUser.role?.permissions ?? {};
            // Super Admin is_admin bypass so newly added catalog keys (e.g.
            // inventory) apply immediately without re-seeding the JSON map.
            const hasPermission = portalUser.role?.is_admin === true
                || required.some((key) => permissions[key] === true);

            if (!hasPermission) {
                Logger.warn(`Permission denied for user ${userId} in org ${orgId}: requires one of [${required.join(', ')}]`);
                throw new AppError('You do not have permission to perform this action.', 403, ErrorCode.FORBIDDEN);
            }

            req.portalUser = portalUser;
            req.userPermissions = permissions;
            next();
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.statusCode).json(error.toJSON());
            }
            Logger.error('PermissionMiddleware error:', error.message);
            return res.status(500).json(new AppError('Permission check failed.', 500, ErrorCode.INTERNAL_SERVER_ERROR).toJSON());
        }
    };
};

export default PermissionMiddleware;
