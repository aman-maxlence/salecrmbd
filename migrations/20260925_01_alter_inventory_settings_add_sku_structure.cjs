'use strict';

/**
 * Backs "Configure SKU structure" - an org can set its own auto-SKU prefix
 * instead of the hardcoded `SKU-<timestamp>` fallback, plus a running
 * counter so auto-generated SKUs read as a structured sequence
 * (e.g. "ITEM-00001") rather than an opaque timestamp.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('inventory_settings');

        if (!table.sku_prefix) {
            await queryInterface.addColumn('inventory_settings', 'sku_prefix', {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'SKU-',
            });
        }

        if (!table.sku_next_number) {
            await queryInterface.addColumn('inventory_settings', 'sku_next_number', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('inventory_settings', 'sku_next_number');
        await queryInterface.removeColumn('inventory_settings', 'sku_prefix');
    },
};
