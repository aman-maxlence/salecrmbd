'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('invite_links', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            org_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                unique: true,
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
                type: Sequelize.ENUM('active', 'revoked'),
                allowNull: false,
                defaultValue: 'active',
            },
            user_service_link_token: {
                // userbd's invite-link token - token ownership lives entirely in
                // userbd (see OrgInviteLinkService), mirrored here only for
                // matching the ORG_INVITE_LINK_JOINED webhook back to this row.
                type: Sequelize.STRING(255),
                allowNull: true,
            },
            created_by: {
                // Raw userbd user id of the admin who created/last regenerated the link.
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

        await queryInterface.addIndex('invite_links', ['user_service_link_token']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('invite_links');
    },
};
