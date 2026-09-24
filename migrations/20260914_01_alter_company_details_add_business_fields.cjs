'use strict';

/**
 * Closes gaps found in the "Business / Account Information" checklist audit:
 * industry and business type/category were previously either onboarding-JSON-only
 * (industry) or missing entirely (business_type), country/postal_code were
 * missing from the address fields, and there was no draft-save concept.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Idempotent: a dev environment running with DB_SYNC_ALTER=true may
        // already have these columns from Sequelize's own auto-sync, before
        // this migration was ever recorded as applied (same reasoning as
        // 20260910_01/02).
        const table = await queryInterface.describeTable('company_details');

        if (!table.industry) {
            await queryInterface.addColumn('company_details', 'industry', {
                type: Sequelize.STRING(100),
                allowNull: true,
            });
        }

        if (!table.business_type) {
            await queryInterface.addColumn('company_details', 'business_type', {
                type: Sequelize.STRING(50),
                allowNull: true,
            });
        }

        if (!table.country) {
            await queryInterface.addColumn('company_details', 'country', {
                type: Sequelize.STRING(100),
                allowNull: true,
            });
        }

        if (!table.postal_code) {
            await queryInterface.addColumn('company_details', 'postal_code', {
                type: Sequelize.STRING(20),
                allowNull: true,
            });
        }

        if (!table.status) {
            await queryInterface.addColumn('company_details', 'status', {
                type: Sequelize.ENUM('draft', 'complete'),
                allowNull: false,
                defaultValue: 'complete',
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('company_details', 'status');
        await queryInterface.removeColumn('company_details', 'postal_code');
        await queryInterface.removeColumn('company_details', 'country');
        await queryInterface.removeColumn('company_details', 'business_type');
        await queryInterface.removeColumn('company_details', 'industry');
    },
};
