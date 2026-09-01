import { DataTypes } from 'sequelize';

const initializeWarehouseModel = (sequelize) => {
    const Warehouse = sequelize.define('Warehouse', {
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
        code: {
            type:      DataTypes.STRING(50),
            allowNull: false,
        },
        location: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        status: {
            type:         DataTypes.ENUM('active', 'inactive'),
            allowNull:    false,
            defaultValue: 'active',
        },
    }, {
        tableName:   'inventory_warehouses',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id'] },
            { fields: ['org_id', 'code'], unique: true },
            { fields: ['org_id', 'name'], unique: true },
        ],
    });

    return Warehouse;
};

export default initializeWarehouseModel;
