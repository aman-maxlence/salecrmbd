import { DataTypes } from 'sequelize';

export const TRANSFER_ORDER_STATUSES = ['pending', 'in_transit', 'completed', 'cancelled'];

const initializeTransferOrderModel = (sequelize) => {
    const TransferOrder = sequelize.define('TransferOrder', {
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
        from_warehouse_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        to_warehouse_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type:         DataTypes.ENUM(...TRANSFER_ORDER_STATUSES),
            allowNull:    false,
            defaultValue: 'pending',
        },
        notes: {
            type:      DataTypes.STRING(1000),
            allowNull: true,
        },
        created_by: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName:   'transfer_orders',
        timestamps:  true,
        underscored: true,
        indexes: [
            { name: 'idx_transfer_orders_org_status', fields: ['org_id', 'status'] },
        ],
    });

    return TransferOrder;
};

export default initializeTransferOrderModel;
