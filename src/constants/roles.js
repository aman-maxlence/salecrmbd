/**
 * Single source of truth for the protected super-admin role name.
 *
 * maxpmbd hardcodes the literal 'Super Admin' in four separate files
 * (PermissionMiddleware, PortalUserService, OrgRoleService, a data-migration
 * script) and drifts to 'Admin' in one unused seed script - a real bug where
 * the naming falls out of sync. Import this constant everywhere a role name
 * is compared instead of repeating the literal.
 */
export const SUPER_ADMIN_ROLE_NAME = 'Super Admin';

/**
 * The four editable default roles seeded for every org, in addition to the
 * protected Super Admin role above. See constants/permissions.js for the
 * permission matrix each one gets on creation.
 */
export const DEFAULT_ROLE_NAMES = ['Admin', 'Manager', 'Sales Rep', 'Support Agent'];

export default { SUPER_ADMIN_ROLE_NAME, DEFAULT_ROLE_NAMES };
