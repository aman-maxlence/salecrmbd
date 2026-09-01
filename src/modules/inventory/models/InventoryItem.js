import { DataTypes } from 'sequelize';

const initializeInventoryItemModel = (sequelize) => {
    const InventoryItem = sequelize.define('InventoryItem', {
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
        sku: {
            type:      DataTypes.STRING(100),
            allowNull: false,
        },
        name: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        category: {
            type:      DataTypes.STRING(100),
            allowNull: true,
        },
        unit_price: {
            type:         DataTypes.DECIMAL(14, 4),
            allowNull:    false,
            defaultValue: 0,
        },
        tax: {
            type:         DataTypes.DECIMAL(8, 4),
            allowNull:    false,
            defaultValue: 0,
        },
        uom_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        pricing_tier_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        low_stock_threshold: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: true,
        },
        status: {
            type:         DataTypes.ENUM('active', 'inactive'),
            allowNull:    false,
            defaultValue: 'active',
        },
    }, {
        tableName:   'inventory_items',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id'] },
            { fields: ['org_id', 'sku'], unique: true },
            { fields: ['org_id', 'category'] },
            { fields: ['org_id', 'name'] },
        ],
    });

    return InventoryItem;
};

export default initializeInventoryItemModel;
