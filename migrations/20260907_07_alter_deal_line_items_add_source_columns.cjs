'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('deal_line_items', 'item_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
        });

        await queryInterface.addColumn('deal_line_items', 'source_type', {
            type: Sequelize.ENUM('local', 'technogex_product_package', 'technogex_design_item', 'technogex_value_pack_tier'),
            allowNull: false,
            defaultValue: 'local',
        });

        await queryInterface.addColumn('deal_line_items', 'source_ref_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
        });

        await queryInterface.addColumn('deal_line_items', 'source_meta', {
            type: Sequelize.JSON,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('deal_line_items', 'source_meta');
        await queryInterface.removeColumn('deal_line_items', 'source_ref_id');
        await queryInterface.removeColumn('deal_line_items', 'source_type');
        await queryInterface.changeColumn('deal_line_items', 'item_id', {
            type: Sequelize.INTEGER,
            allowNull: false,
        });
    },
};
