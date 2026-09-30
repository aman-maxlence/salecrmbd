'use strict';

/**
 * Backfills the three permission keys just added to constants/permissions.js
 * (view_bills, manage_bills, record_bill_payments) onto every EXISTING org's
 * already-seeded OrgRole rows - without this, a role computed before this
 * migration would have no stored entry for these keys at all, even though
 * whoever already manages Purchase Orders should reasonably see the Bills
 * that now hang off them. Piggybacks on manage_purchase_orders rather than
 * defaulting everyone to false, so existing Purchasing Managers aren't
 * suddenly locked out of a feature attached to work they already do.
 */
module.exports = {
    async up(queryInterface) {
        const roles = await queryInterface.sequelize.query(
            'SELECT id, is_admin, permissions FROM org_roles',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        for (const role of roles) {
            const permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;

            const isAdminTier = role.is_admin === 1 || role.is_admin === true;
            const inheritsFromPurchaseOrders = isAdminTier || permissions.manage_purchase_orders === true;

            permissions.view_bills = inheritsFromPurchaseOrders;
            permissions.manage_bills = inheritsFromPurchaseOrders;
            permissions.record_bill_payments = inheritsFromPurchaseOrders;

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
            delete permissions.view_bills;
            delete permissions.manage_bills;
            delete permissions.record_bill_payments;

            await queryInterface.sequelize.query(
                'UPDATE org_roles SET permissions = ? WHERE id = ?',
                { replacements: [JSON.stringify(permissions), role.id] }
            );
        }
    },
};
