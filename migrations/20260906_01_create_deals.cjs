'use strict';

/**
 * Baseline table for the Deal model - like Team before it, this only ever
 * existed via dev's `Database.sync({ alter: true })`, with no migration
 * ever recording its creation. Found when migrating a fresh database
 * (deal_line_items' own migration assumes `deals` already exists).
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('deals')) return;

        await queryInterface.createTable('deals', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            org_id: { type: Sequelize.INTEGER, allowNull: false },
            title: { type: Sequelize.STRING(255), allowNull: false },
            stage: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'open' },
            status: { type: Sequelize.ENUM('open', 'won', 'lost'), allowNull: false, defaultValue: 'open' },
            owner_user_id: { type: Sequelize.INTEGER, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        });

        await queryInterface.addIndex('deals', ['org_id']);
        await queryInterface.addIndex('deals', ['org_id', 'status']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('deals');
    },
};
