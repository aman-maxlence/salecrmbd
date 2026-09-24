'use strict';

/**
 * Closes a gap found in the "Business Preferences & Configuration" audit:
 * BusinessPreferences.default_territory_id was saved but no downstream
 * module ever read it back - Deal had no territory concept at all to
 * default. Adds it so DealService.createDeal can genuinely apply the org's
 * default territory when one isn't explicitly given.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('deals');
        if (!table.territory_id) {
            await queryInterface.addColumn('deals', 'territory_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('deals', 'territory_id');
    },
};
