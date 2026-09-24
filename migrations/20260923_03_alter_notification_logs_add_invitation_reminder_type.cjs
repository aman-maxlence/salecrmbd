'use strict';

/** Extends notification_logs.type to cover the new invitation-reminder email. */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('notification_logs', 'type', {
            type: Sequelize.ENUM(
                'onboarding_welcome',
                'invitation_accepted',
                'onboarding_completion',
                'deal_update',
                'territory_update',
                'invitation_reminder'
            ),
            allowNull: false,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn('notification_logs', 'type', {
            type: Sequelize.ENUM(
                'onboarding_welcome',
                'invitation_accepted',
                'onboarding_completion',
                'deal_update',
                'territory_update'
            ),
            allowNull: false,
        });
    },
};
