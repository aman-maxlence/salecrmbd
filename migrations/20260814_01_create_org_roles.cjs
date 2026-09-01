'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('org_roles', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            org_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            role_name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            is_admin: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            permissions: {
                type: Sequelize.JSON,
                allowNull: false,
                defaultValue: {},
            },
            is_default: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            status: {
                type: Sequelize.ENUM('active', 'inactive'),
                allowNull: false,
                defaultValue: 'active',
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

        await queryInterface.addIndex('org_roles', ['org_id']);
        await queryInterface.addIndex('org_roles', ['org_id', 'role_name'], { unique: true });
        await queryInterface.addIndex('org_roles', ['status']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('org_roles');
    },
};
