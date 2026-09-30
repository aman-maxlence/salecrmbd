'use strict';

/**
 * "Warehouse & Stock Location Management" checklist gap: warehouses had no
 * sub-location concept at all. Adds a hierarchical Zone > Aisle > Rack > Bin
 * location tree per warehouse, plus a nullable placement tag on
 * inventory_stock_levels (which location within the warehouse this item's
 * stock sits at) - the quantity ledger itself (item+warehouse) is untouched.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (!tables.includes('inventory_stock_locations')) {
            await queryInterface.createTable('inventory_stock_locations', {
                id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
                org_id: { type: Sequelize.INTEGER, allowNull: false },
                warehouse_id: { type: Sequelize.INTEGER, allowNull: false },
                parent_location_id: { type: Sequelize.INTEGER, allowNull: true },
                type: { type: Sequelize.ENUM('zone', 'aisle', 'rack', 'bin'), allowNull: false },
                name: { type: Sequelize.STRING(100), allowNull: false },
                code: { type: Sequelize.STRING(50), allowNull: true },
                status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
                created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
                updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            });
            await queryInterface.addIndex('inventory_stock_locations', ['org_id', 'warehouse_id']);
            await queryInterface.addIndex('inventory_stock_locations', ['org_id', 'parent_location_id']);
        }

        const levelsTable = await queryInterface.describeTable('inventory_stock_levels');
        if (!levelsTable.location_id) {
            await queryInterface.addColumn('inventory_stock_levels', 'location_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('inventory_stock_levels', 'location_id');
        await queryInterface.dropTable('inventory_stock_locations');
    },
};
