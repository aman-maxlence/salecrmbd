'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('onboarding_states', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            org_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            user_id: {
                // Keyed by (org_id, user_id), not just user_id - the same person
                // could in principle onboard into more than one org over time,
                // and each org's invitee tracks progress independently (doc §4.3).
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            current_step: {
                type: Sequelize.STRING(50),
                allowNull: false,
                defaultValue: 'welcome',
            },
            answers: {
                type: Sequelize.JSON,
                allowNull: false,
                defaultValue: {},
            },
            status: {
                type: Sequelize.ENUM('in_progress', 'completed'),
                allowNull: false,
                defaultValue: 'in_progress',
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
        });

        await queryInterface.addIndex('onboarding_states', ['org_id', 'user_id'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('onboarding_states');
    },
};
