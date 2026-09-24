'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('form_field_values', {
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
            entity_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'Loosely-coupled reference (no DB FK) - which real table it points at depends on entity_type.',
            },
            field_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'form_field_definitions', key: 'id' },
                onDelete: 'CASCADE',
            },
            value: {
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

        await queryInterface.addIndex('form_field_values', ['org_id', 'entity_type', 'entity_id']);
        await queryInterface.addIndex('form_field_values', ['entity_type', 'entity_id', 'field_id'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('form_field_values');
    },
};
