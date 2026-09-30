'use strict';

/**
 * Lets a builtin form field (e.g. Pricing Tier, Scheduled Price) actually be
 * deleted per org, instead of only hideable - this table remembers which
 * builtin field_keys an org explicitly removed, so the auto-backfill in
 * FormSchemaService._syncMissingBuiltinFields doesn't silently resurrect them.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('form_field_exclusions')) return;

        await queryInterface.createTable('form_field_exclusions', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            org_id: { type: Sequelize.INTEGER, allowNull: false },
            entity_type: { type: Sequelize.STRING(100), allowNull: false },
            field_key: { type: Sequelize.STRING(100), allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        });
        await queryInterface.addIndex('form_field_exclusions', ['org_id', 'entity_type', 'field_key'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('form_field_exclusions');
    },
};
