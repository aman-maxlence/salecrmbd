'use strict';

/**
 * Adds three new field types to the Form Builder: 'text_editor' (rich
 * text), 'image' (upload), and 'other_text' (fixed choices + a free-text
 * "Other" option) - mirrors src/modules/formSchema/constants.js's
 * FORM_FIELD_TYPES, which must be extended alongside this migration.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('form_field_definitions', 'field_type', {
            type: Sequelize.ENUM(
                'text', 'textarea', 'number', 'date', 'boolean', 'select', 'radio', 'checkbox', 'email', 'url',
                'text_editor', 'image', 'other_text'
            ),
            allowNull: false,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn('form_field_definitions', 'field_type', {
            type: Sequelize.ENUM('text', 'textarea', 'number', 'date', 'boolean', 'select', 'radio', 'checkbox', 'email', 'url'),
            allowNull: false,
        });
    },
};
