'use strict';

/**
 * "Configure opening stock date" checklist gap - lets a stock movement
 * (opening stock in particular) record the date it's meant to represent,
 * separate from `created_at` (when the row was actually entered into the
 * system). Display-only: doesn't change any quantity-timing/locking logic.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('inventory_stock_adjustments');
        if (!table.effective_date) {
            await queryInterface.addColumn('inventory_stock_adjustments', 'effective_date', {
                type: Sequelize.DATEONLY,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('inventory_stock_adjustments', 'effective_date');
    },
};
