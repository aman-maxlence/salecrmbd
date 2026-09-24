'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('technogex_products', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            external_id: {
                type: Sequelize.STRING(36),
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            description: {
                type: Sequelize.STRING(2000),
                allowNull: true,
            },
            category_external_id: {
                type: Sequelize.STRING(36),
                allowNull: true,
            },
            slug: {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
            product_type: {
                type: Sequelize.ENUM('single', 'combo'),
                allowNull: true,
            },
            image_url: {
                type: Sequelize.STRING(500),
                allowNull: true,
            },
            active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            source_deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            last_synced_at: {
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

        await queryInterface.addIndex('technogex_products', ['external_id'], { unique: true });
        await queryInterface.addIndex('technogex_products', ['category_external_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('technogex_products');
    },
};
