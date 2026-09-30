import { DataTypes } from 'sequelize';

const initializeStockLevelModel = (sequelize) => {
    const StockLevel = sequelize.define('StockLevel', {
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
        item_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        warehouse_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        // Where within the warehouse this stock physically sits - a placement
        // tag only, never part of the quantity-accounting key (that stays
        // item+warehouse) or the receive/issue/transfer locking path, so
        // adding it doesn't touch the existing stock-ledger logic at all.
        location_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        quantity: {
            type:         DataTypes.DECIMAL(14, 4),
            allowNull:    false,
            defaultValue: 0,
        },
        version: {
            type:         DataTypes.INTEGER,
            allowNull:    false,
            defaultValue: 0,
        },
    }, {
        tableName:   'inventory_stock_levels',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'item_id', 'warehouse_id'], unique: true },
            { fields: ['org_id', 'item_id'] },
        ],
    });

    return StockLevel;
};

export default initializeStockLevelModel;
