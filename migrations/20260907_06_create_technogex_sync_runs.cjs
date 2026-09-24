'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('technogex_sync_runs', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            family: {
                type: Sequelize.ENUM('products', 'design_items', 'value_packs', 'all'),
                allowNull: false,
            },
            status: {
                type: Sequelize.ENUM('running', 'success', 'partial', 'failed'),
                allowNull: false,
                defaultValue: 'running',
            },
            started_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            finished_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            fetched_count: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            upserted_count: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            soft_deleted_count: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            error_message: {
                type: Sequelize.TEXT,
                allowNull: true,
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

        await queryInterface.addIndex('technogex_sync_runs', ['family', 'started_at']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('technogex_sync_runs');
    },
};
