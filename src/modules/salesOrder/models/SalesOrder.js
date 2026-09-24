import { DataTypes } from 'sequelize';

export const SALES_ORDER_STATUSES = ['pending', 'partially_fulfilled', 'fulfilled', 'cancelled'];

const initializeSalesOrderModel = (sequelize) => {
    const SalesOrder = sequelize.define('SalesOrder', {
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
        deal_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
            comment:   'Informational only, no FK constraint - the Deal this order was created from, if any',
        },
        warehouse_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        customer_name: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        customer_email: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        customer_phone: {
            type:      DataTypes.STRING(30),
            allowNull: true,
        },
        status: {
            type:         DataTypes.ENUM(...SALES_ORDER_STATUSES),
            allowNull:    false,
            defaultValue: 'pending',
        },
        order_date: {
            type:         DataTypes.DATEONLY,
            allowNull:    false,
            defaultValue: DataTypes.NOW,
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
        tableName:   'sales_orders',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'status'] },
            { fields: ['org_id', 'deal_id'] },
        ],
    });

    return SalesOrder;
};

export default initializeSalesOrderModel;
