import { DataTypes } from 'sequelize';

const initializeVendorModel = (sequelize) => {
    const Vendor = sequelize.define('Vendor', {
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
        email: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        phone: {
            type:      DataTypes.STRING(30),
            allowNull: true,
        },
        address: {
            type:      DataTypes.STRING(500),
            allowNull: true,
        },
        status: {
            type:         DataTypes.ENUM('active', 'inactive'),
            allowNull:    false,
            defaultValue: 'active',
        },
    }, {
        tableName:   'vendors',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'name'], unique: true },
        ],
    });

    return Vendor;
};

export default initializeVendorModel;
