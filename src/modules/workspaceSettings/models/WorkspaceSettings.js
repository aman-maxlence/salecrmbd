import { DataTypes } from 'sequelize';

export const START_PAGES = ['dashboard', 'deals', 'inventory'];
export const THEME_PALETTES = ['sunset', 'orchid', 'meadow', 'lagoon', 'blossom', 'ember', 'twilight'];
export const FONT_PREFERENCES = ['Inter', 'Poppins', 'Roboto', 'Manrope', 'Lato', 'Nunito'];

/**
 * One row per org - Sale CRM's own workspace branding/personalisation
 * (logo, display name, location, default landing page, font, accent theme).
 * Deliberately separate from userbd's Organization record (which owns the
 * org's canonical legal name/domain shared across all products) - these are
 * Sale-CRM-specific presentation preferences, same reasoning as
 * InventorySettings being its own per-org row instead of overloading
 * Organization.
 */
const initializeWorkspaceSettingsModel = (sequelize) => {
    const WorkspaceSettings = sequelize.define('WorkspaceSettings', {
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
        logo_url: {
            type: DataTypes.STRING(1000),
            allowNull: true,
        },
        company_name: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        location: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        default_start_page: {
            type: DataTypes.ENUM(...START_PAGES),
            allowNull: false,
            defaultValue: 'dashboard',
        },
        font_preference: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'Inter',
        },
        theme_palette: {
            type: DataTypes.ENUM(...THEME_PALETTES),
            allowNull: false,
            defaultValue: 'sunset',
        },
    }, {
        tableName: 'workspace_settings',
        timestamps: true,
        underscored: true,
        indexes: [
            // Named via the `indexes` array (not a field-level `unique: true`) -
            // that form isn't reliably diffed by Sequelize's MySQL sync.on
            // every `sync({ alter: true })` restart, which can silently pile up
            // duplicate indexes until MySQL's 64-key-per-table limit is hit.
            { fields: ['org_id'], unique: true },
        ],
    });

    return WorkspaceSettings;
};

export default initializeWorkspaceSettingsModel;
