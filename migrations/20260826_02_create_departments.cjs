'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('departments', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            org_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            head_user_id: {
                // Raw userbd user id of the department head - not a local FK,
                // same convention as Territory.manager_user_id (identity lives in userbd).
                type: Sequelize.INTEGER,
                allowNull: true,
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

        await queryInterface.addIndex('departments', ['org_id']);
        await queryInterface.addIndex('departments', ['org_id', 'name'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('departments');
    },
};
