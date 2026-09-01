import AppError from '../../../errors/AppError.js';
import { ErrorCode } from '../../../errors/index.js';
import { SUPER_ADMIN_ROLE_NAME, DEFAULT_ROLE_NAMES } from '../../../constants/roles.js';
import { PERMISSIONS, DEFAULT_PERMISSION_MATRIX } from '../../../constants/permissions.js';
import { PermissionChangeType } from '../../../constants/enums.js';
import PermissionAuditLogService from '../../permissionAuditLog/service/PermissionAuditLogService.js';

const allFalsePermissions = () => Object.fromEntries(PERMISSIONS.map((key) => [key, false]));
const allTruePermissions = () => Object.fromEntries(PERMISSIONS.map((key) => [key, true]));

class OrgRoleService {
    constructor(models) {
        this.models = models;
        this.auditLogService = new PermissionAuditLogService(models);
    }

    /**
     * Idempotently creates the protected Super Admin role plus the 4 default
     * roles for a brand-new org. Called from the setup-admin-portal-user
     * webhook handler - safe to call twice (findOrCreate on org_id+role_name).
     */
    async seedDefaultRolesForOrg(orgId, transaction) {
        const { OrgRole } = this.models;
        const opts = { ...(transaction && { transaction }) };

        const [superAdminRole] = await OrgRole.findOrCreate({
            where: { org_id: orgId, role_name: SUPER_ADMIN_ROLE_NAME },
            defaults: {
                org_id: orgId,
                role_name: SUPER_ADMIN_ROLE_NAME,
                description: 'Full, protected access. Cannot be edited, renamed, or deleted.',
                is_admin: true,
                is_default: true,
                status: 'active',
                permissions: allTruePermissions(),
            },
            ...opts,
        });

        const rolesByName = { [SUPER_ADMIN_ROLE_NAME]: superAdminRole };

        for (const roleName of DEFAULT_ROLE_NAMES) {
            const [role] = await OrgRole.findOrCreate({
                where: { org_id: orgId, role_name: roleName },
                defaults: {
                    org_id: orgId,
                    role_name: roleName,
                    is_admin: false,
                    is_default: true,
                    status: 'active',
                    permissions: DEFAULT_PERMISSION_MATRIX[roleName] ?? allFalsePermissions(),
                },
                ...opts,
            });
            rolesByName[roleName] = role;
        }

        return rolesByName;
    }

    async createRole(orgId, { roleName, description }, changedBy) {
        const { OrgRole } = this.models;

        const existing = await OrgRole.findOne({ where: { org_id: orgId, role_name: roleName } });
        if (existing) {
            throw new AppError(`A role named "${roleName}" already exists in this org.`, 409, ErrorCode.CONFLICT);
        }

        // New roles always start with every permission false (design doc §6) -
        // nothing is granted by accident.
        const role = await OrgRole.create({
            org_id: orgId,
            role_name: roleName,
            description: description ?? null,
            is_admin: false,
            is_default: false,
            status: 'active',
            permissions: allFalsePermissions(),
        });

        await this.auditLogService.record(orgId, role.id, changedBy, PermissionChangeType.CREATE_ROLE, null, role.toJSON());
        return role;
    }

    async getRoles(orgId) {
        const { OrgRole } = this.models;
        return OrgRole.findAll({ where: { org_id: orgId }, order: [['created_at', 'ASC']] });
    }

    async getRoleById(orgId, roleId) {
        const { OrgRole } = this.models;
        const role = await OrgRole.findOne({ where: { id: roleId, org_id: orgId } });
        if (!role) {
            throw new AppError('Role not found.', 404, ErrorCode.NOT_FOUND);
        }
        return role;
    }

    _assertNotSuperAdmin(role, action) {
        if (role.role_name === SUPER_ADMIN_ROLE_NAME) {
            throw new AppError(`The ${SUPER_ADMIN_ROLE_NAME} role cannot be ${action}.`, 403, ErrorCode.FORBIDDEN);
        }
    }

    async updateRole(orgId, roleId, { roleName, description, status }, changedBy) {
        const role = await this.getRoleById(orgId, roleId);
        this._assertNotSuperAdmin(role, 'edited');

        const before = role.toJSON();
        if (roleName !== undefined) role.role_name = roleName;
        if (description !== undefined) role.description = description;
        if (status !== undefined) role.status = status;
        await role.save();

        await this.auditLogService.record(orgId, role.id, changedBy, PermissionChangeType.UPDATE_ROLE, before, role.toJSON());
        return role;
    }

    async updatePermissions(orgId, roleId, permissions, changedBy) {
        const role = await this.getRoleById(orgId, roleId);
        this._assertNotSuperAdmin(role, 'edited');

        const before = role.toJSON();
        const merged = { ...role.permissions };
        for (const [key, value] of Object.entries(permissions)) {
            if (!PERMISSIONS.includes(key)) {
                throw new AppError(`Unknown permission key "${key}".`, 400, ErrorCode.VALIDATION_ERROR);
            }
            merged[key] = Boolean(value);
        }
        role.permissions = merged;
        await role.save();

        await this.auditLogService.record(orgId, role.id, changedBy, PermissionChangeType.UPDATE_PERMISSIONS, before, role.toJSON());
        return role;
    }

    async deleteRole(orgId, roleId, changedBy) {
        const { PortalUser } = this.models;
        const role = await this.getRoleById(orgId, roleId);
        this._assertNotSuperAdmin(role, 'deleted');

        if (role.is_default) {
            throw new AppError('Default roles cannot be deleted.', 409, ErrorCode.CONFLICT);
        }

        const inUseCount = await PortalUser.count({ where: { role_id: roleId, org_id: orgId } });
        if (inUseCount > 0) {
            throw new AppError(
                `This role is still assigned to ${inUseCount} user(s). Reassign them before deleting it.`,
                409,
                ErrorCode.CONFLICT
            );
        }

        const before = role.toJSON();
        await role.destroy();
        await this.auditLogService.record(orgId, roleId, changedBy, PermissionChangeType.DELETE_ROLE, before, null);
    }

    /**
     * Deliberately doesn't require the role to still exist - the audit
     * trail must survive role deletion (see permission_audit_logs
     * migration comment: role_id isn't a hard FK for the same reason).
     */
    async getAuditLog(orgId, roleId) {
        return this.auditLogService.listForRole(orgId, roleId);
    }
}

export default OrgRoleService;
