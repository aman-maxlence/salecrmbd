'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('form_field_definitions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            org_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            entity_type: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            section_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'form_sections', key: 'id' },
                onDelete: 'CASCADE',
            },
            field_key: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            label: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            field_type: {
                type: Sequelize.ENUM('text', 'textarea', 'number', 'date', 'boolean', 'select', 'radio', 'checkbox', 'email', 'url'),
                allowNull: false,
            },
            required: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            visible: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            position: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            options: {
                type: Sequelize.JSON,
                allowNull: true,
            },
            visibility_rule: {
                type: Sequelize.JSON,
                allowNull: true,
            },
            is_builtin: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
        });

        await queryInterface.addIndex('form_field_definitions', ['org_id', 'entity_type', 'field_key'], { unique: true });
        await queryInterface.addIndex('form_field_definitions', ['org_id', 'entity_type', 'section_id', 'position']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('form_field_definitions');
    },
};
