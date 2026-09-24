import { DataTypes } from 'sequelize';

export const PACKAGE_STATUSES = ['packed', 'shipped', 'delivered'];

/**
 * A shipping record layered on top of an already-fulfilled Sales Order line
 * - doesn't touch stock itself, fulfillment already deducted it. Purely
 * carrier/tracking/status bookkeeping.
 */
const initializePackageModel = (sequelize) => {
    const Package = sequelize.define('Package', {
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
        sales_order_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        carrier: {
            type:      DataTypes.STRING(100),
            allowNull: true,
        },
        tracking_number: {
            type:      DataTypes.STRING(100),
            allowNull: true,
        },
        status: {
            type:         DataTypes.ENUM(...PACKAGE_STATUSES),
            allowNull:    false,
            defaultValue: 'packed',
        },
        shipped_date: {
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
        tableName:   'packages',
        timestamps:  true,
        underscored: true,
        indexes: [
            { name: 'idx_packages_org_sales_order', fields: ['org_id', 'sales_order_id'] },
        ],
    });

    return Package;
};

export default initializePackageModel;
