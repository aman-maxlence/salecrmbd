'use strict';

/**
 * Security & Access Control checklist item #12 - a generic, append-only
 * audit trail for sensitive actions (onboarding completion, invitations,
 * integration connect/disconnect) that nothing previously logged anywhere.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('audit_logs')) return;

        await queryInterface.createTable('audit_logs', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            org_id: { type: Sequelize.INTEGER, allowNull: false },
            actor_user_id: { type: Sequelize.INTEGER, allowNull: true },
            action: { type: Sequelize.STRING(100), allowNull: false },
            entity_type: { type: Sequelize.STRING(100), allowNull: true },
            entity_id: { type: Sequelize.STRING(100), allowNull: true },
            details: { type: Sequelize.JSON, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        });

        await queryInterface.addIndex('audit_logs', ['org_id', 'created_at']);
        await queryInterface.addIndex('audit_logs', ['org_id', 'action']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('audit_logs');
    },
};
