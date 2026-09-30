'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Idempotent: a dev environment running with DB_SYNC_ALTER=true may
        // already have these columns from Sequelize's own auto-sync, before
        // this migration was ever recorded as applied.
        const warehouseTable = await queryInterface.describeTable('inventory_warehouses');
        if (!warehouseTable.country_id) {
            await queryInterface.addColumn('inventory_warehouses', 'country_id', {
                // Nullable - NULL means "visible/usable by everyone", so
                // existing warehouses aren't forced to backfill one.
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }
        const warehouseIndexes = await queryInterface.showIndex('inventory_warehouses');
        if (!warehouseIndexes.some((idx) => idx.name === 'inventory_warehouses_country_id')) {
            await queryInterface.addIndex('inventory_warehouses', ['country_id'], { name: 'inventory_warehouses_country_id' });
        }

        const vendorTable = await queryInterface.describeTable('vendors');
        if (!vendorTable.country_id) {
            await queryInterface.addColumn('vendors', 'country_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }
        const vendorIndexes = await queryInterface.showIndex('vendors');
        if (!vendorIndexes.some((idx) => idx.name === 'vendors_country_id')) {
            await queryInterface.addIndex('vendors', ['country_id'], { name: 'vendors_country_id' });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('inventory_warehouses', 'inventory_warehouses_country_id');
        await queryInterface.removeColumn('inventory_warehouses', 'country_id');
        await queryInterface.removeIndex('vendors', 'vendors_country_id');
        await queryInterface.removeColumn('vendors', 'country_id');
    },
};
