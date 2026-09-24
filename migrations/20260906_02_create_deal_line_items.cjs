'use strict';

/**
 * Baseline table for the DealLineItem model - same gap as create_deals.cjs
 * (see that file's comment). Shaped as it was before
 * 20260907_07_alter_deal_line_items_add_source_columns.cjs, which is the
 * next migration to run against this table: item_id is NOT NULL here,
 * and source_type/source_ref_id/source_meta don't exist yet - that
 * migration adds them.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('deal_line_items')) return;

        await queryInterface.createTable('deal_line_items', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            org_id: { type: Sequelize.INTEGER, allowNull: false },
            deal_id: { type: Sequelize.INTEGER, allowNull: false },
            item_id: { type: Sequelize.INTEGER, allowNull: false },
            quantity: { type: Sequelize.DECIMAL(14, 4), allowNull: false },
            unit_price: { type: Sequelize.DECIMAL(14, 4), allowNull: false },
            tax: { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
            pricing_tier_id: { type: Sequelize.INTEGER, allowNull: true },
            warehouse_id: { type: Sequelize.INTEGER, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        });

        await queryInterface.addIndex('deal_line_items', ['org_id', 'deal_id']);
        await queryInterface.addIndex('deal_line_items', ['org_id', 'item_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('deal_line_items');
    },
};
