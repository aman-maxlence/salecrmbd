'use strict';

/**
 * Lets an admin copy/share the accept-invite link directly (e.g. over
 * WhatsApp/Slack) instead of relying solely on userbd's best-effort invite
 * email - stores the same URL userbd already constructs and emails.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('invitations');
        if (!table.invite_url) {
            await queryInterface.addColumn('invitations', 'invite_url', {
                type: Sequelize.STRING(500),
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('invitations', 'invite_url');
    },
};
