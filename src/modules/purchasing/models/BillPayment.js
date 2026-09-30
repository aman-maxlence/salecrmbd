import { DataTypes } from 'sequelize';

const initializeBillPaymentModel = (sequelize) => {
    const BillPayment = sequelize.define('BillPayment', {
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
        bill_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        amount: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
        paid_date: {
            type:         DataTypes.DATEONLY,
            allowNull:    false,
            defaultValue: DataTypes.NOW,
        },
        method: {
            type:      DataTypes.STRING(100),
            allowNull: true,
        },
        notes: {
            type:      DataTypes.STRING(500),
            allowNull: true,
        },
        created_by: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName:   'bill_payments',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'bill_id'] },
        ],
    });

    return BillPayment;
};

export default initializeBillPaymentModel;
