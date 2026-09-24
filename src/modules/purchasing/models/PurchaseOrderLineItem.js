import { DataTypes } from 'sequelize';

const initializePurchaseOrderLineItemModel = (sequelize) => {
    const PurchaseOrderLineItem = sequelize.define('PurchaseOrderLineItem', {
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
        purchase_order_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        item_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        quantity: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
        unit_cost: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
        received_quantity: {
            type:         DataTypes.DECIMAL(14, 4),
            allowNull:    false,
            defaultValue: 0,
        },
    }, {
        tableName:   'purchase_order_line_items',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'purchase_order_id'] },
            { fields: ['org_id', 'item_id'] },
        ],
    });

    return PurchaseOrderLineItem;
};

export default initializePurchaseOrderLineItemModel;
