import { DataTypes } from 'sequelize';

const initializeItemBrandModel = (sequelize) => {
    const ItemBrand = sequelize.define('ItemBrand', {
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
        name: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
    }, {
        tableName:   'inventory_item_brands',
        timestamps:  true,
        underscored: true,
        indexes: [
            { name: 'idx_item_brands_org_name', fields: ['org_id', 'name'], unique: true },
        ],
    });

    return ItemBrand;
};

export default initializeItemBrandModel;
