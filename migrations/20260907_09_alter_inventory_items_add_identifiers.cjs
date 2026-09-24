'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Idempotent - see 20260906_03_create_remaining_baseline_tables.cjs's comment.
        const table = await queryInterface.describeTable('inventory_items');
        if (!table.upc) {
            await queryInterface.addColumn('inventory_items', 'upc', {
                type: Sequelize.STRING(20),
                allowNull: true,
            });
        }
        if (!table.mpn) {
            await queryInterface.addColumn('inventory_items', 'mpn', {
                type: Sequelize.STRING(50),
                allowNull: true,
            });
        }
        if (!table.ean) {
            await queryInterface.addColumn('inventory_items', 'ean', {
                type: Sequelize.STRING(20),
                allowNull: true,
            });
        }
        if (!table.isbn) {
            await queryInterface.addColumn('inventory_items', 'isbn', {
                type: Sequelize.STRING(20),
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('inventory_items', 'isbn');
        await queryInterface.removeColumn('inventory_items', 'ean');
        await queryInterface.removeColumn('inventory_items', 'mpn');
        await queryInterface.removeColumn('inventory_items', 'upc');
    },
};
