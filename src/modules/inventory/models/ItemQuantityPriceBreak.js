import { DataTypes } from 'sequelize';

/**
 * "Buy N+, pay less" volume pricing - distinct from PricingTier (a flat
 * org-wide discount% per customer tier). Each row says "at this quantity or
 * more, the unit price is this" for one item; resolving a price for a given
 * quantity means picking the row with the highest min_quantity that's still
 * <= the requested quantity (see ItemService._resolveQuantityPrice).
 */
const initializeItemQuantityPriceBreakModel = (sequelize) => {
    const ItemQuantityPriceBreak = sequelize.define('ItemQuantityPriceBreak', {
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
        min_quantity: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        unit_price: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
    }, {
        tableName:   'inventory_item_quantity_price_breaks',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'item_id'] },
            { fields: ['org_id', 'item_id', 'min_quantity'], unique: true },
        ],
    });

    return ItemQuantityPriceBreak;
};

export default initializeItemQuantityPriceBreakModel;
