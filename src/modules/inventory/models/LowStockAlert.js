import { DataTypes } from 'sequelize';

const initializeLowStockAlertModel = (sequelize) => {
    const LowStockAlert = sequelize.define('LowStockAlert', {
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
        threshold: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
        quantity: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
        status: {
            type:         DataTypes.ENUM('open', 'resolved'),
            allowNull:    false,
            defaultValue: 'open',
        },
        notified_at: {
            type:      DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName:   'inventory_low_stock_alerts',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'status'] },
            { fields: ['org_id', 'item_id', 'warehouse_id', 'status'] },
        ],
    });

    return LowStockAlert;
};

export default initializeLowStockAlertModel;
