'use strict';

// Composite Items (bundles) and Item Groups (variant families) were removed
// as features - this drops their tables and the two InventoryItem columns
// that only existed to support them.
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.dropTable('inventory_bundle_components').catch(() => {});
        await queryInterface.dropTable('inventory_item_groups').catch(() => {});

        const table = await queryInterface.describeTable('inventory_items');
        if (table.is_bundle) await queryInterface.removeColumn('inventory_items', 'is_bundle');
        if (table.item_group_id) await queryInterface.removeColumn('inventory_items', 'item_group_id');
        if (table.attributes) await queryInterface.removeColumn('inventory_items', 'attributes');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.addColumn('inventory_items', 'is_bundle', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });
        await queryInterface.addColumn('inventory_items', 'item_group_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
        });
        await queryInterface.addColumn('inventory_items', 'attributes', {
            type: Sequelize.JSON,
            allowNull: true,
        });

        await queryInterface.createTable('inventory_item_groups', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            org_id: { type: Sequelize.INTEGER, allowNull: false },
            name: { type: Sequelize.STRING(255), allowNull: false },
            description: { type: Sequelize.STRING(500), allowNull: true },
            attributes: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
            created_at: { type: Sequelize.DATE, allowNull: false },
            updated_at: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.createTable('inventory_bundle_components', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            org_id: { type: Sequelize.INTEGER, allowNull: false },
            bundle_item_id: { type: Sequelize.INTEGER, allowNull: false },
            component_item_id: { type: Sequelize.INTEGER, allowNull: false },
            quantity: { type: Sequelize.DECIMAL(14, 4), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false },
            updated_at: { type: Sequelize.DATE, allowNull: false },
        });
    },
};
