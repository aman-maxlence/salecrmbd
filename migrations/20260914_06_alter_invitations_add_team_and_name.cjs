'use strict';

/**
 * Closes gaps found in the "Team Member Invitation" checklist audit: an
 * invite had no way to capture the invitee's name, and no way to assign
 * them straight into a team (only role + territory existed).
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Idempotent: a dev environment running with DB_SYNC_ALTER=true may
        // already have these columns from Sequelize's own auto-sync, before
        // this migration was ever recorded as applied (same reasoning as
        // 20260914_01 etc).
        const table = await queryInterface.describeTable('invitations');

        if (!table.team_id) {
            await queryInterface.addColumn('invitations', 'team_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }

        if (!table.invitee_name) {
            await queryInterface.addColumn('invitations', 'invitee_name', {
                type: Sequelize.STRING(255),
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('invitations', 'invitee_name');
        await queryInterface.removeColumn('invitations', 'team_id');
    },
};
