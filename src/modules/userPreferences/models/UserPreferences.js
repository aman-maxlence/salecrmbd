import { DataTypes } from 'sequelize';

/**
 * One row per (org_id, user_id) - personal display/notification preferences.
 * Distinct from CompanyDetails (org-wide legal/billing) and WorkspaceSettings
 * (org-wide branding) - this is the one preferences table that's actually
 * scoped to a single person, not the whole org.
 */
const initializeUserPreferencesModel = (sequelize) => {
    const UserPreferences = sequelize.define('UserPreferences', {
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
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        date_format: {
            type: DataTypes.ENUM('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'),
            allowNull: false,
            defaultValue: 'DD/MM/YYYY',
        },
        currency: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'INR',
        },
        deal_update_notifications: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        territory_update_notifications: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        browser_push_notifications: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    }, {
        tableName: 'user_preferences',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'user_id'], unique: true },
        ],
    });

    return UserPreferences;
};

export default initializeUserPreferencesModel;
