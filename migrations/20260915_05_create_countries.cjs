'use strict';

/**
 * New top level of the org hierarchy, sitting above Territory
 * (Country -> Territory -> Team/Department).
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('countries')) return;

        await queryInterface.createTable('countries', {
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
            code: {
                type: Sequelize.STRING(10),
                allowNull: false,
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

        await queryInterface.addIndex('countries', ['org_id']);
        await queryInterface.addIndex('countries', ['org_id', 'code'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('countries');
    },
};
