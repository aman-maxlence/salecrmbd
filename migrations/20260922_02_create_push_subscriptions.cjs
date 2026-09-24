'use strict';

/** Backs the "Browser push notifications" preference toggle - one row per subscribed browser/device. */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('push_subscriptions')) return;

        await queryInterface.createTable('push_subscriptions', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            org_id: { type: Sequelize.INTEGER, allowNull: false },
            user_id: { type: Sequelize.INTEGER, allowNull: false },
            endpoint: { type: Sequelize.STRING(500), allowNull: false },
            p256dh: { type: Sequelize.STRING(255), allowNull: false },
            auth: { type: Sequelize.STRING(255), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        });

        await queryInterface.addIndex('push_subscriptions', ['org_id', 'user_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('push_subscriptions');
    },
};
