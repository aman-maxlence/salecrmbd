'use strict';

/**
 * Backs "Send invitation reminders where applicable" - tracks how many
 * nudges a pending invite has had and when the last one went out, so the
 * reminder job doesn't nag more than a few times or more often than every
 * few days.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('invitations');

        if (!table.reminder_count) {
            await queryInterface.addColumn('invitations', 'reminder_count', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            });
        }

        if (!table.last_reminder_sent_at) {
            await queryInterface.addColumn('invitations', 'last_reminder_sent_at', {
                type: Sequelize.DATE,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('invitations', 'last_reminder_sent_at');
        await queryInterface.removeColumn('invitations', 'reminder_count');
    },
};
