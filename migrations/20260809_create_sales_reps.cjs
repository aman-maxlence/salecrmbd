'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('sales_reps', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            org_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            role: {
                type: Sequelize.ENUM('admin', 'member'),
                allowNull: false,
                defaultValue: 'member',
            },
            status: {
                type: Sequelize.ENUM('active', 'inactive'),
                allowNull: false,
                defaultValue: 'active',
            },
            metadata: {
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

        await queryInterface.addIndex('sales_reps', ['user_id', 'org_id'], { unique: true });
        await queryInterface.addIndex('sales_reps', ['org_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('sales_reps');
    },
};
