import { DataTypes } from 'sequelize';

const initializeDealLineItemModel = (sequelize) => {
    const DealLineItem = sequelize.define('DealLineItem', {
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
        unit_price: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
        tax: {
            type:         DataTypes.DECIMAL(8, 4),
            allowNull:    false,
            defaultValue: 0,
        },
        pricing_tier_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        warehouse_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName:   'deal_line_items',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'deal_id'] },
            { fields: ['org_id', 'item_id'] },
        ],
    });

    return DealLineItem;
};

export default initializeDealLineItemModel;
