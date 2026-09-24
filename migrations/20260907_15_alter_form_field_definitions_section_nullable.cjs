'use strict';

// A builtin field can now exist with no section at all ("unassigned") -
// ensureDefaultSchema seeds every builtin field this way by default instead
// of pre-building a set of default sections; an admin assigns each one to a
// section they create themselves in Settings -> Form Builder.
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('form_field_definitions', 'section_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn('form_field_definitions', 'section_id', {
            type: Sequelize.INTEGER,
            allowNull: false,
        });
    },
};
