import { DataTypes } from 'sequelize';

const initializeStockAdjustmentModel = (sequelize) => {
    const StockAdjustment = sequelize.define('StockAdjustment', {
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
        type: {
            type:      DataTypes.ENUM('receive', 'issue', 'transfer'),
            allowNull: false,
        },
        quantity: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
        from_warehouse_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        to_warehouse_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        reason: {
            type:      DataTypes.STRING(500),
            allowNull: true,
        },
        created_by: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName:   'inventory_stock_adjustments',
        timestamps:  true,
        underscored: true,
        updatedAt:   false,
        indexes: [
            { fields: ['org_id', 'item_id'] },
            { fields: ['org_id', 'created_at'] },
        ],
    });

    return StockAdjustment;
};

export default initializeStockAdjustmentModel;
