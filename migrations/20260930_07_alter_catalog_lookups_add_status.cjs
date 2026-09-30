'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = ['inventory_item_categories', 'inventory_item_brands', 'inventory_item_manufacturers'];
        for (const table of tables) {
            const described = await queryInterface.describeTable(table);
            if (!described.status) {
                await queryInterface.addColumn(table, 'status', {
                    type: Sequelize.ENUM('active', 'inactive'),
                    allowNull: false,
                    defaultValue: 'active',
                });
            }
        }
    },

    async down(queryInterface) {
        const tables = ['inventory_item_categories', 'inventory_item_brands', 'inventory_item_manufacturers'];
        for (const table of tables) {
            await queryInterface.removeColumn(table, 'status');
        }
    },
};
