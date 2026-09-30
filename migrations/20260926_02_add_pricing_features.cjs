'use strict';

/**
 * Backs two "Pricing & Pricing Tier Configuration" checklist gaps:
 * - "Configure quantity-based pricing": a new per-item quantity-break table
 *   (distinct from PricingTier, which is a flat customer-tier discount%).
 * - "Configure effective pricing dates if required": a scheduled price +
 *   effective date pair on the item itself, applied by a sweep job when
 *   the date arrives (see InventoryItem.scheduled_price/price_effective_date
 *   and ItemService.applyScheduledPriceChanges).
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (!tables.includes('inventory_item_quantity_price_breaks')) {
            await queryInterface.createTable('inventory_item_quantity_price_breaks', {
                id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
                org_id: { type: Sequelize.INTEGER, allowNull: false },
                item_id: { type: Sequelize.INTEGER, allowNull: false },
                min_quantity: { type: Sequelize.INTEGER, allowNull: false },
                unit_price: { type: Sequelize.DECIMAL(14, 4), allowNull: false },
                created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
                updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            });
            await queryInterface.addIndex('inventory_item_quantity_price_breaks', ['org_id', 'item_id']);
            await queryInterface.addIndex('inventory_item_quantity_price_breaks', ['org_id', 'item_id', 'min_quantity'], { unique: true });
        }

        const itemsTable = await queryInterface.describeTable('inventory_items');
        if (!itemsTable.scheduled_price) {
            await queryInterface.addColumn('inventory_items', 'scheduled_price', {
                type: Sequelize.DECIMAL(14, 4),
                allowNull: true,
            });
        }
        if (!itemsTable.price_effective_date) {
            await queryInterface.addColumn('inventory_items', 'price_effective_date', {
                type: Sequelize.DATEONLY,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('inventory_items', 'price_effective_date');
        await queryInterface.removeColumn('inventory_items', 'scheduled_price');
        await queryInterface.dropTable('inventory_item_quantity_price_breaks');
    },
};
