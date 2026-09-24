import { DataTypes } from 'sequelize';

const DEFAULT_ENABLED_MODULES = ['leads', 'deals', 'tasks', 'meetings', 'tickets', 'inventory'];
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
 * One row per org - "Business Preferences & Configuration": which CRM
 * modules are enabled (consumed by salecrmfe's main-layout nav filtering -
 * previously captured during onboarding but never read back anywhere),
 * product/service categories, default territory/currency for downstream
 * modules, and business hours.
 */
const initializeBusinessPreferencesModel = (sequelize) => {
    const BusinessPreferences = sequelize.define('BusinessPreferences', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        org_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        enabled_modules: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: DEFAULT_ENABLED_MODULES,
        },
        product_categories: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
        default_territory_id: {
            // Not a hard FK - a cleared/deleted territory should degrade to
            // "no default" rather than blocking the territory's own deletion.
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        default_currency: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'INR',
        },
        business_hours: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: DEFAULT_BUSINESS_HOURS,
        },
    }, {
        tableName: 'business_preferences',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['org_id'], unique: true },
        ],
    });

    return BusinessPreferences;
};

export default initializeBusinessPreferencesModel;
