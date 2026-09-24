import { DataTypes } from 'sequelize';

const initializeTransferOrderLineItemModel = (sequelize) => {
    const TransferOrderLineItem = sequelize.define('TransferOrderLineItem', {
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
        transfer_order_id: {
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
        transferred_quantity: {
            type:         DataTypes.DECIMAL(14, 4),
            allowNull:    false,
            defaultValue: 0,
            comment:      'Deprecated in favor of shipped_quantity/received_quantity - kept for old rows, no longer written to.',
        },
        shipped_quantity: {
            type:         DataTypes.DECIMAL(14, 4),
            allowNull:    false,
            defaultValue: 0,
        },
        received_quantity: {
            type:         DataTypes.DECIMAL(14, 4),
            allowNull:    false,
            defaultValue: 0,
        },
    }, {
        tableName:   'transfer_order_line_items',
        timestamps:  true,
        underscored: true,
        indexes: [
            { name: 'idx_transfer_order_lines_org_order', fields: ['org_id', 'transfer_order_id'] },
            { name: 'idx_transfer_order_lines_org_item', fields: ['org_id', 'item_id'] },
        ],
    });

    return TransferOrderLineItem;
};

export default initializeTransferOrderLineItemModel;
