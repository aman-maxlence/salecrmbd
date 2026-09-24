'use strict';

/**
 * Backs "Support configurable notification templates" - an org can override
 * the subject/heading/body text of any system email; leaving a field null
 * falls back to the hardcoded default in templates/index.js.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('notification_templates')) return;

        await queryInterface.createTable('notification_templates', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            org_id: { type: Sequelize.INTEGER, allowNull: false },
            type: {
                type: Sequelize.ENUM(
                    'onboarding_welcome',
                    'invitation_accepted',
                    'invitation_reminder',
                    'onboarding_completion',
                    'deal_update',
                    'territory_update'
                ),
                allowNull: false,
            },
            subject: { type: Sequelize.STRING(255), allowNull: true },
            heading: { type: Sequelize.STRING(255), allowNull: true },
            body_text: { type: Sequelize.TEXT, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        });

        await queryInterface.addIndex('notification_templates', ['org_id', 'type'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('notification_templates');
    },
};
