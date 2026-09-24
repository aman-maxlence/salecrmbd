import { DataTypes } from 'sequelize';

export const PURCHASE_ORDER_STATUSES = ['draft', 'ordered', 'partially_received', 'received', 'cancelled'];

const initializePurchaseOrderModel = (sequelize) => {
    const PurchaseOrder = sequelize.define('PurchaseOrder', {
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
        vendor_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        warehouse_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type:         DataTypes.ENUM(...PURCHASE_ORDER_STATUSES),
            allowNull:    false,
            defaultValue: 'draft',
        },
        order_date: {
            type:         DataTypes.DATEONLY,
            allowNull:    false,
            defaultValue: DataTypes.NOW,
        },
        expected_date: {
            type:      DataTypes.DATEONLY,
            allowNull: true,
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
        tableName:   'purchase_orders',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'status'] },
            { fields: ['org_id', 'vendor_id'] },
        ],
    });

    return PurchaseOrder;
};

export default initializePurchaseOrderModel;
