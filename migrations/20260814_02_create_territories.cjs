'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('territories', {
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
            manager_user_id: {
                // Raw userbd user id of the territory's manager - not a local FK,
                // same convention as PortalUser.user_id (identity lives in userbd).
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

        await queryInterface.addIndex('territories', ['org_id']);
        await queryInterface.addIndex('territories', ['org_id', 'name'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('territories');
    },
};
