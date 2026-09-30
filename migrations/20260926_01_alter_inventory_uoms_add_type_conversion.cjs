'use strict';

/**
 * Backs "Configure UOM types" (a fixed classification so conversions only
 * happen within a compatible group, e.g. weight-to-weight) and "Configure
 * UOM conversion" - a UOM can optionally point at a `base_unit_id` (another
 * UOM in the same org) plus a `conversion_factor`, meaning
 * `1 of this unit = conversion_factor * base unit`. Base units themselves
 * have no base_unit_id, keeping the chain to a single level (no A->B->C).
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('inventory_uoms');

        if (!table.type) {
            await queryInterface.addColumn('inventory_uoms', 'type', {
                type: Sequelize.ENUM('weight', 'volume', 'count', 'length', 'area', 'time', 'other'),
                allowNull: false,
                defaultValue: 'other',
            });
        }

        if (!table.base_unit_id) {
            await queryInterface.addColumn('inventory_uoms', 'base_unit_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }

        if (!table.conversion_factor) {
            await queryInterface.addColumn('inventory_uoms', 'conversion_factor', {
                type: Sequelize.DECIMAL(18, 6),
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('inventory_uoms', 'conversion_factor');
        await queryInterface.removeColumn('inventory_uoms', 'base_unit_id');
        await queryInterface.removeColumn('inventory_uoms', 'type');
    },
};
