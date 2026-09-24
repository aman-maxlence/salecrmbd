'use strict';

/** Analytics & Tracking checklist - raw onboarding event capture, no aggregation/dashboard built on top yet. */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('analytics_events')) return;

        await queryInterface.createTable('analytics_events', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            org_id: { type: Sequelize.INTEGER, allowNull: false },
            user_id: { type: Sequelize.INTEGER, allowNull: true },
            event_type: { type: Sequelize.STRING(100), allowNull: false },
            step: { type: Sequelize.STRING(50), allowNull: true },
            details: { type: Sequelize.JSON, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        });

        await queryInterface.addIndex('analytics_events', ['org_id', 'event_type']);
        await queryInterface.addIndex('analytics_events', ['org_id', 'user_id', 'created_at']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('analytics_events');
    },
};
