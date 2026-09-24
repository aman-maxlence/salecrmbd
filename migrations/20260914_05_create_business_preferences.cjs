'use strict';

// Plain JS values, not JSON.stringify'd - matches the existing convention
// for JSON-column defaults in this codebase (see OnboardingState's `answers`
// column, migrations/20260814_06_create_onboarding_states.cjs).
const DEFAULT_ENABLED_MODULES = ['leads', 'deals', 'tasks', 'meetings', 'tickets'];
const DEFAULT_BUSINESS_HOURS = {
    monday: { enabled: true, start: '09:00', end: '18:00' },
    tuesday: { enabled: true, start: '09:00', end: '18:00' },
    wednesday: { enabled: true, start: '09:00', end: '18:00' },
    thursday: { enabled: true, start: '09:00', end: '18:00' },
    friday: { enabled: true, start: '09:00', end: '18:00' },
    saturday: { enabled: false, start: '10:00', end: '14:00' },
    sunday: { enabled: false, start: '10:00', end: '14:00' },
};

/**
 * One row per org - the canonical home for "Business Preferences &
 * Configuration" checklist data: which CRM modules are enabled, what the
 * org sells (product/service categories), default territory/currency for
 * downstream modules, and business hours. Deliberately NOT part of the
 * onboarding wizard's own OnboardingState.answers JSON blob - that's keyed
 * per (org_id, user_id) and becomes permanently unreachable once an
 * invitee's onboarding completes (same defect CompanyDetails had before
 * being split out in an earlier task).
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('business_preferences')) return;

        await queryInterface.createTable('business_preferences', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            org_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            enabled_modules: {
                type: Sequelize.JSON,
                allowNull: false,
                defaultValue: DEFAULT_ENABLED_MODULES,
            },
            product_categories: {
                type: Sequelize.JSON,
                allowNull: false,
                defaultValue: [],
            },
            default_territory_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            default_currency: {
                type: Sequelize.STRING(10),
                allowNull: false,
                defaultValue: 'INR',
            },
            business_hours: {
                type: Sequelize.JSON,
                allowNull: false,
                defaultValue: DEFAULT_BUSINESS_HOURS,
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

        await queryInterface.addIndex('business_preferences', ['org_id'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('business_preferences');
    },
};
