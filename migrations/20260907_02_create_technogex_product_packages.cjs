'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('technogex_product_packages', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            external_id: {
                type: Sequelize.STRING(36),
                allowNull: false,
            },
            product_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'technogex_products', key: 'id' },
                onDelete: 'CASCADE',
            },
            package_type: {
                type: Sequelize.ENUM('Low', 'Mid', 'High'),
                allowNull: false,
            },
            tentative_monthly_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
            },
            final_monthly_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
            },
            display_price: {
                type: Sequelize.JSON,
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

        await queryInterface.addIndex('technogex_product_packages', ['external_id'], { unique: true });
        await queryInterface.addIndex('technogex_product_packages', ['product_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('technogex_product_packages');
    },
};
