'use strict';

/**
 * Backfills the two permission keys just added to constants/permissions.js
 * (access_settings, manage_teams) onto every EXISTING org's already-seeded
 * OrgRole rows. Without this, adding a brand-new catalog key doesn't
 * retroactively appear in a role's stored `permissions` JSON blob (it was
 * computed once at seed time) - so every org created before this migration
 * would suddenly lose Settings access for their Admin/Manager roles the
 * moment the frontend starts checking `access_settings`, even though
 * nothing about their actual role assignments changed.
 *
 * Super Admin rows don't strictly need this (PermissionMiddleware and the
 * frontend's usePermissions both bypass via `is_admin`/isSuperAdmin), but
 * they're backfilled too for consistency - the stored JSON should reflect
 * reality, not rely solely on the bypass.
 */
const SETTINGS_SCOPED_KEYS = [
    'manage_organization_settings',
    'manage_roles',
    'view_roles',
    'manage_users',
    'invite_users',
    'manage_territories',
    'manage_departments',
    'manage_form_schema',
    'manage_inventory_settings',
];

module.exports = {
    async up(queryInterface) {
        const roles = await queryInterface.sequelize.query(
            'SELECT id, role_name, is_admin, permissions FROM org_roles',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        for (const role of roles) {
            const permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;

            const alreadyHadSettingsAccess = SETTINGS_SCOPED_KEYS.some((key) => permissions[key] === true);
            const isAdminTier = role.is_admin === 1 || role.is_admin === true || role.role_name === 'Admin';

            permissions.access_settings = isAdminTier || alreadyHadSettingsAccess;
            permissions.manage_teams = isAdminTier || permissions.manage_users === true;

            await queryInterface.sequelize.query(
                'UPDATE org_roles SET permissions = ? WHERE id = ?',
                { replacements: [JSON.stringify(permissions), role.id] }
            );
        }
    },

    async down(queryInterface) {
        const roles = await queryInterface.sequelize.query(
            'SELECT id, permissions FROM org_roles',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        for (const role of roles) {
            const permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
            delete permissions.access_settings;
            delete permissions.manage_teams;

            await queryInterface.sequelize.query(
                'UPDATE org_roles SET permissions = ? WHERE id = ?',
                { replacements: [JSON.stringify(permissions), role.id] }
            );
        }
    },
};
