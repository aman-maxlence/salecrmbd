import { DataTypes } from 'sequelize';

export const BILL_STATUSES = ['unpaid', 'partially_paid', 'paid', 'void'];

const initializeBillModel = (sequelize) => {
    const Bill = sequelize.define('Bill', {
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
        purchase_order_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        bill_number: {
            type:      DataTypes.STRING(30),
            allowNull: false,
        },
        bill_date: {
            type:         DataTypes.DATEONLY,
            allowNull:    false,
            defaultValue: DataTypes.NOW,
        },
        due_date: {
            type:      DataTypes.DATEONLY,
            allowNull: true,
        },
        amount: {
            type:         DataTypes.DECIMAL(14, 4),
            allowNull:    false,
            defaultValue: 0,
        },
        paid_amount: {
            type:         DataTypes.DECIMAL(14, 4),
            allowNull:    false,
            defaultValue: 0,
        },
        status: {
            type:         DataTypes.ENUM(...BILL_STATUSES),
            allowNull:    false,
            defaultValue: 'unpaid',
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
        tableName:   'bills',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'status'] },
            { fields: ['org_id', 'vendor_id'] },
            { fields: ['org_id', 'purchase_order_id'], unique: true },
            { fields: ['org_id', 'bill_number'], unique: true },
        ],
    });

    return Bill;
};

export default initializeBillModel;
