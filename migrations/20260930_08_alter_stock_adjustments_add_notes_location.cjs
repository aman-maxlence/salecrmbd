'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('inventory_stock_adjustments');
        if (!table.notes) {
            await queryInterface.addColumn('inventory_stock_adjustments', 'notes', {
                type: Sequelize.STRING(500),
                allowNull: true,
            });
        }
        if (!table.location_id) {
            await queryInterface.addColumn('inventory_stock_adjustments', 'location_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('inventory_stock_adjustments', 'notes');
        await queryInterface.removeColumn('inventory_stock_adjustments', 'location_id');
    },
};
