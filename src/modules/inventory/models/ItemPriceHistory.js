import { DataTypes } from 'sequelize';

const initializeItemPriceHistoryModel = (sequelize) => {
    const ItemPriceHistory = sequelize.define('ItemPriceHistory', {
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
        unit_price: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
        changed_by: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName:   'inventory_item_price_history',
        timestamps:  true,
        underscored: true,
        updatedAt:   false,
        indexes: [
            { fields: ['org_id', 'item_id'] },
        ],
    });

    return ItemPriceHistory;
};

export default initializeItemPriceHistoryModel;
