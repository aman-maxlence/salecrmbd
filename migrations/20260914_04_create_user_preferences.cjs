'use strict';

/**
 * One row per (org_id, user_id) - personal display/notification preferences.
 * CRM-specific (deal/territory notifications), so this lives in salecrmbd
 * rather than userbd, unlike name/phone/timezone/locale which are generic
 * identity fields shared across every product on the platform.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Idempotent - the live dev server's DB_SYNC_ALTER=true auto-sync
        // routinely creates a newly-registered model's table before its
        // migration is ever recorded as applied (same situation hit
        // repeatedly elsewhere today - see 20260910_01/02, userbd's
        // 20260519000000/20260914000000).
        const tables = await queryInterface.showAllTables();
        if (tables.includes('user_preferences')) return;

        await queryInterface.createTable('user_preferences', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            org_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            date_format: {
                type: Sequelize.ENUM('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'),
                allowNull: false,
                defaultValue: 'DD/MM/YYYY',
            },
            currency: {
                type: Sequelize.STRING(10),
                allowNull: false,
                defaultValue: 'INR',
            },
            deal_update_notifications: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            territory_update_notifications: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            browser_push_notifications: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
        });

        await queryInterface.addIndex('user_preferences', ['org_id', 'user_id'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('user_preferences');
    },
};
