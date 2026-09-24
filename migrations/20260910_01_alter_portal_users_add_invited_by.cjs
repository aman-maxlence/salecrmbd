'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Idempotent: a dev environment running with DB_SYNC_ALTER=true may
        // already have this column from Sequelize's own auto-sync, before
        // this migration was ever recorded as applied.
        const table = await queryInterface.describeTable('portal_users');
        if (table.invited_by_user_id) return;

        await queryInterface.addColumn('portal_users', 'invited_by_user_id', {
            // Raw userbd user id of whoever sent the Invitation this row was
            // created from (Invitation.created_by) - null for the org's first
            // user (self-registered, nobody invited them) and for invite-link
            // joins (no per-email Invitation to trace back to).
            type: Sequelize.INTEGER,
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('portal_users', 'invited_by_user_id');
    },
};
