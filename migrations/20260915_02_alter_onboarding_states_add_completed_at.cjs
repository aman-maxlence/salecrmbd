'use strict';

/**
 * Onboarding Completion checklist item #8 - a dedicated completion moment,
 * not inferred from the generic `updated_at` (which changes on every later
 * save to the same row, e.g. a future last_error write).
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('onboarding_states');
        if (!table.completed_at) {
            await queryInterface.addColumn('onboarding_states', 'completed_at', {
                type: Sequelize.DATE,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('onboarding_states', 'completed_at');
    },
};
