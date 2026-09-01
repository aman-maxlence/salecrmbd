import { DataTypes } from 'sequelize';
import { DEFAULT_CATALOG_FIELDS, DEFAULT_LOW_STOCK_THRESHOLD } from '../../../constants/inventory.js';

const initializeInventorySettingsModel = (sequelize) => {
    const InventorySettings = sequelize.define('InventorySettings', {
        id: {
            type:          DataTypes.INTEGER,
            primaryKey:    true,
            autoIncrement: true,
            allowNull:     false,
        },
        org_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        catalog_fields: {
            type:         DataTypes.JSON,
            allowNull:    false,
            defaultValue: DEFAULT_CATALOG_FIELDS,
        },
        low_stock_threshold: {
            type:         DataTypes.DECIMAL(14, 4),
            allowNull:    false,
            defaultValue: DEFAULT_LOW_STOCK_THRESHOLD,
        },
        reorder_alerts_enabled: {
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: true,
        },
    }, {
        tableName:   'inventory_settings',
        timestamps:  true,
        underscored: true,
        // A field-level `unique: true` (rather than a named index here)
        // isn't reliably diffed by Sequelize's MySQL sync on every
        // `sync({ alter: true })` restart - it can silently add a new
        // duplicate index each time until MySQL's 64-key-per-table limit is
        // hit (this happened - see the cleanup migration/notes). Declaring
        // it as an index instead is stable across restarts.
        indexes: [
            { fields: ['org_id'], unique: true },
        ],
    });

    return InventorySettings;
};

export default initializeInventorySettingsModel;
