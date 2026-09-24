'use strict';

/**
 * Integration Setup checklist - the generic third-party connection
 * framework's storage: one row per (org, provider), tokens encrypted at
 * the application layer (see src/utils/CryptoHelper.js) before ever
 * reaching this table.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Idempotent: a dev environment running with DB_SYNC_ALTER=true may
        // already have this table from Sequelize's own auto-sync, before
        // this migration was ever recorded as applied (same reasoning as
        // 20260914_05 etc).
        const tables = await queryInterface.showAllTables();
        if (tables.includes('integration_connections')) return;

        await queryInterface.createTable('integration_connections', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            org_id: { type: Sequelize.INTEGER, allowNull: false },
            provider_key: { type: Sequelize.STRING(100), allowNull: false },
            status: {
                type: Sequelize.ENUM('connected', 'disconnected', 'failed'),
                allowNull: false,
                defaultValue: 'connected',
            },
            external_account_id: { type: Sequelize.STRING(255), allowNull: true },
            access_token: { type: Sequelize.TEXT, allowNull: true },
            refresh_token: { type: Sequelize.TEXT, allowNull: true },
            token_expires_at: { type: Sequelize.DATE, allowNull: true },
            connected_by_user_id: { type: Sequelize.INTEGER, allowNull: true },
            last_error: { type: Sequelize.JSON, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        });

        await queryInterface.addIndex('integration_connections', ['org_id', 'provider_key'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('integration_connections');
    },
};
