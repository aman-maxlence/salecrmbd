'use strict';

/**
 * Backs "Track onboarding abandonment" - marks when a stale in-progress
 * onboarding was swept and reported, so the sweep job doesn't re-track the
 * same abandonment every run. Cleared whenever the user makes new progress
 * (see OnboardingService._saveStep), so abandoning again later re-tracks.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('onboarding_states');
        if (!table.abandoned_tracked_at) {
            await queryInterface.addColumn('onboarding_states', 'abandoned_tracked_at', {
                type: Sequelize.DATE,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('onboarding_states', 'abandoned_tracked_at');
    },
};
