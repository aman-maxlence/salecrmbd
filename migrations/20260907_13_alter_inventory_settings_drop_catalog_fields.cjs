'use strict';

// The 5-field show/require toggle this column backed (sku/name/category/
// unitPrice/tax) is now fully superseded by the generic form-schema engine
// (see formSchema module) - Settings -> Form Builder controls the same
// built-in fields' required/visible/label/position, and ItemService now
// reads required-ness from there instead of this column.
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('inventory_settings');
        if (table.catalog_fields) {
            await queryInterface.removeColumn('inventory_settings', 'catalog_fields');
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.addColumn('inventory_settings', 'catalog_fields', {
            type: Sequelize.JSON,
            allowNull: false,
            defaultValue: {
                sku: { enabled: true, required: true, label: 'SKU' },
                name: { enabled: true, required: true, label: 'Name' },
                category: { enabled: true, required: false, label: 'Category' },
                unitPrice: { enabled: true, required: true, label: 'Unit price' },
                tax: { enabled: true, required: false, label: 'Tax %' },
            },
        });
    },
};
