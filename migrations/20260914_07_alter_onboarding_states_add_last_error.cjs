'use strict';

/**
 * Closes a gap found in the "Onboarding Progress" checklist audit: there
 * was no way to persist that a step genuinely failed (as opposed to a
 * normal validation rejection) - `ProcessingStep.tsx`'s own "Retry" UI was
 * driven entirely by transient client-side React state, lost on refresh.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Idempotent: a dev environment running with DB_SYNC_ALTER=true may
        // already have this column from Sequelize's own auto-sync, before
        // this migration was ever recorded as applied (same reasoning as
        // 20260914_01 etc).
        const table = await queryInterface.describeTable('onboarding_states');

        if (!table.last_error) {
            await queryInterface.addColumn('onboarding_states', 'last_error', {
                type: Sequelize.JSON,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('onboarding_states', 'last_error');
    },
};
