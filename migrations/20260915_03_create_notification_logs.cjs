'use strict';

/** Notifications checklist - delivery tracking for onboarding emails. */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('notification_logs')) return;

        await queryInterface.createTable('notification_logs', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            org_id: { type: Sequelize.INTEGER, allowNull: false },
            user_id: { type: Sequelize.INTEGER, allowNull: true },
            type: {
                type: Sequelize.ENUM('onboarding_welcome', 'invitation_accepted', 'onboarding_completion'),
                allowNull: false,
            },
            recipient_email: { type: Sequelize.STRING(255), allowNull: false },
            status: { type: Sequelize.ENUM('sent', 'failed'), allowNull: false, defaultValue: 'sent' },
            error_message: { type: Sequelize.STRING(500), allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        });

        await queryInterface.addIndex('notification_logs', ['org_id', 'created_at']);
        await queryInterface.addIndex('notification_logs', ['org_id', 'type']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('notification_logs');
    },
};
