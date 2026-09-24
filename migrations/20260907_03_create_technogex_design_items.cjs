'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('technogex_design_items', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            external_id: {
                type: Sequelize.STRING(36),
                allowNull: false,
            },
            category_external_id: {
                type: Sequelize.STRING(36),
                allowNull: true,
            },
            title: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            base_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0,
            },
            licensing_type: {
                type: Sequelize.ENUM('standard', 'commercial', 'exclusive'),
                allowNull: false,
                defaultValue: 'standard',
            },
            formats: {
                type: Sequelize.JSON,
                allowNull: true,
            },
            preview_images: {
                type: Sequelize.JSON,
                allowNull: true,
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            source_deleted_at: {
                type: Sequelize.DATE,
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

        await queryInterface.addIndex('technogex_design_items', ['external_id'], { unique: true });
        await queryInterface.addIndex('technogex_design_items', ['category_external_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('technogex_design_items');
    },
};
