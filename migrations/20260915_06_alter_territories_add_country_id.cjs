'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Idempotent: a dev environment running with DB_SYNC_ALTER=true may
        // already have this column from Sequelize's own auto-sync, before
        // this migration was ever recorded as applied.
        const table = await queryInterface.describeTable('territories');
        if (!table.country_id) {
            await queryInterface.addColumn('territories', 'country_id', {
                // Nullable - existing territories predate Country and aren't
                // forced to backfill one.
                type: Sequelize.INTEGER,
                allowNull: true,
            });
        }

        const indexes = await queryInterface.showIndex('territories');
        if (!indexes.some((idx) => idx.name === 'territories_country_id')) {
            await queryInterface.addIndex('territories', ['country_id'], { name: 'territories_country_id' });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('territories', 'territories_country_id');
        await queryInterface.removeColumn('territories', 'country_id');
    },
};
