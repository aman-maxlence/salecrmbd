import { DataTypes } from 'sequelize';

const initializeItemManufacturerModel = (sequelize) => {
    const ItemManufacturer = sequelize.define('ItemManufacturer', {
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
        tableName:   'inventory_item_manufacturers',
        timestamps:  true,
        underscored: true,
        indexes: [
            { name: 'idx_item_manufacturers_org_name', fields: ['org_id', 'name'], unique: true },
        ],
    });

    return ItemManufacturer;
};

export default initializeItemManufacturerModel;
