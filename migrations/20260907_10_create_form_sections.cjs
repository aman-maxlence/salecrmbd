'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('form_sections', {
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
            parent_section_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'form_sections', key: 'id' },
                onDelete: 'CASCADE',
            },
            heading: {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            position: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            visibility_rule: {
                type: Sequelize.JSON,
                allowNull: true,
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

        await queryInterface.addIndex('form_sections', ['org_id', 'entity_type']);
        await queryInterface.addIndex('form_sections', ['org_id', 'entity_type', 'parent_section_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('form_sections');
    },
};
