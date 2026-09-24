'use strict';

/**
 * Catch-up migration: PortalUser.js (the Sequelize model) declares team_id,
 * manager_id, is_dual_access, active_context, and preview_role_id, but none
 * of them were ever added to migrations/20260814_03_create_portal_users.cjs
 * or any later migration - a fresh environment built purely from `migrate`
 * would be missing all five columns. No FK constraint on team_id: the
 * `teams` table itself has no migration either (a separate, pre-existing
 * gap - not fixed here), so a hard reference could fail on a fresh DB.
 * manager_id/preview_role_id are already documented on the model as
 * intentionally-unconstrained references (manager_id is a raw userbd user
 * id, not a local FK; preview_role_id is validated in application code).
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Idempotent for the same reason as 20260910_01 - dev's
        // DB_SYNC_ALTER=true may have already created these columns before
        // this migration was ever recorded as applied.
        const table = await queryInterface.describeTable('portal_users');

        if (!table.team_id) {
            await queryInterface.addColumn('portal_users', 'team_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }

        if (!table.manager_id) {
            await queryInterface.addColumn('portal_users', 'manager_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }

        if (!table.is_dual_access) {
            await queryInterface.addColumn('portal_users', 'is_dual_access', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            });
        }

        if (!table.active_context) {
            await queryInterface.addColumn('portal_users', 'active_context', {
                type: Sequelize.ENUM('admin', 'user'),
                allowNull: false,
                defaultValue: 'admin',
            });
        }

        if (!table.preview_role_id) {
            await queryInterface.addColumn('portal_users', 'preview_role_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }

        try {
            await queryInterface.addIndex('portal_users', ['team_id']);
        } catch (err) {
            if (!/Duplicate key name|already exists/i.test(err.message)) throw err;
        }
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('portal_users', ['team_id']);
        await queryInterface.removeColumn('portal_users', 'preview_role_id');
        await queryInterface.removeColumn('portal_users', 'active_context');
        await queryInterface.removeColumn('portal_users', 'is_dual_access');
        await queryInterface.removeColumn('portal_users', 'manager_id');
        await queryInterface.removeColumn('portal_users', 'team_id');
    },
};
