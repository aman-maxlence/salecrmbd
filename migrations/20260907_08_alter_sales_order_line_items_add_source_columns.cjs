'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Idempotent: a fresh database's baseline migration may already
        // capture this table in its fully-evolved (post-alter) shape - see
        // 20260906_03_create_remaining_baseline_tables.cjs's own comment.
        const table = await queryInterface.describeTable('sales_order_line_items');

        await queryInterface.changeColumn('sales_order_line_items', 'item_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
        });

        if (!table.source_type) {
            await queryInterface.addColumn('sales_order_line_items', 'source_type', {
                type: Sequelize.ENUM('local', 'technogex_product_package', 'technogex_design_item', 'technogex_value_pack_tier'),
                allowNull: false,
                defaultValue: 'local',
            });
        }

        if (!table.source_ref_id) {
            await queryInterface.addColumn('sales_order_line_items', 'source_ref_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }

        if (!table.source_meta) {
            await queryInterface.addColumn('sales_order_line_items', 'source_meta', {
                type: Sequelize.JSON,
                allowNull: true,
            });
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('sales_order_line_items', 'source_meta');
        await queryInterface.removeColumn('sales_order_line_items', 'source_ref_id');
        await queryInterface.removeColumn('sales_order_line_items', 'source_type');
        await queryInterface.changeColumn('sales_order_line_items', 'item_id', {
            type: Sequelize.INTEGER,
            allowNull: false,
        });
    },
};
