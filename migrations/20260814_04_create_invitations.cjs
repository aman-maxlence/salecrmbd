'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('invitations', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            org_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            email: {
                type: Sequelize.STRING(255),
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
                type: Sequelize.ENUM('pending', 'accepted', 'revoked'),
                allowNull: false,
                defaultValue: 'pending',
            },
            user_id: {
                // Filled in once accepted (raw userbd user id).
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            user_service_invite_id: {
                // userbd's invite id - token/expiry ownership lives entirely in
                // userbd (see InvitationService), mirrored here only for reference.
                type: Sequelize.STRING(255),
                allowNull: true,
            },
            created_by: {
                // Raw userbd user id of the inviter (must have invite_users).
                type: Sequelize.INTEGER,
                allowNull: false,
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

        await queryInterface.addIndex('invitations', ['org_id', 'email']);
        await queryInterface.addIndex('invitations', ['user_service_invite_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('invitations');
    },
};
