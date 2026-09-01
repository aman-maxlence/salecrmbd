'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('permission_audit_logs', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            org_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            role_id: {
                // Not a hard FK: a role can be deleted after its audit trail is
                // written, and the trail must survive that (same reasoning as
                // maxpmbd's TicketActivityLog / ErrorLog activity tables).
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            changed_by: {
                // Raw userbd user id of whoever made the change.
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            change_type: {
                type: Sequelize.ENUM('create_role', 'update_role', 'update_permissions', 'delete_role'),
                allowNull: false,
            },
            before_json: {
                type: Sequelize.JSON,
                allowNull: true,
            },
            after_json: {
                type: Sequelize.JSON,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
        });

        await queryInterface.addIndex('permission_audit_logs', ['org_id', 'role_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('permission_audit_logs');
    },
};
