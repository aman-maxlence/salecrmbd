'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('portal_users', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            user_id: {
                // Raw user id from userbd - see SalesRep.user_id for the same
                // convention. PortalUser is intentionally independent of the
                // existing sales_reps table (not merged in this pass).
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            org_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            role_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'org_roles', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            territory_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'territories', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            status: {
                type: Sequelize.ENUM('active', 'inactive', 'suspended'),
                allowNull: false,
                defaultValue: 'active',
            },
            has_onboarded: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
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

        await queryInterface.addIndex('portal_users', ['user_id', 'org_id'], { unique: true });
        await queryInterface.addIndex('portal_users', ['org_id']);
        await queryInterface.addIndex('portal_users', ['role_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('portal_users');
    },
};
