'use strict';

/**
 * `manage_company_details` is a new permission, split out of
 * `manage_organization_settings` (which used to gate both the workspace
 * branding page AND the company legal/billing details page - see
 * constants/permissions.js comment for why they're now separate). Backfills
 * it onto every existing role that already had `manage_organization_settings`,
 * so nobody's Company Details access silently disappears the moment the
 * frontend starts checking the new key separately.
 */
module.exports = {
    async up(queryInterface) {
        const roles = await queryInterface.sequelize.query(
            'SELECT id, permissions FROM org_roles',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        for (const role of roles) {
            const permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
            permissions.manage_company_details = permissions.manage_organization_settings === true;

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
            delete permissions.manage_company_details;

            await queryInterface.sequelize.query(
                'UPDATE org_roles SET permissions = ? WHERE id = ?',
                { replacements: [JSON.stringify(permissions), role.id] }
            );
        }
    },
};
