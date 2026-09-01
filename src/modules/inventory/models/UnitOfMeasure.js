import { DataTypes } from 'sequelize';

const initializeUnitOfMeasureModel = (sequelize) => {
    const UnitOfMeasure = sequelize.define('UnitOfMeasure', {
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
            type:      DataTypes.STRING(100),
            allowNull: false,
        },
        abbreviation: {
            type:      DataTypes.STRING(20),
            allowNull: false,
        },
        status: {
            type:         DataTypes.ENUM('active', 'inactive'),
            allowNull:    false,
            defaultValue: 'active',
        },
    }, {
        tableName:   'inventory_uoms',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id'] },
            { fields: ['org_id', 'abbreviation'], unique: true },
        ],
    });

    return UnitOfMeasure;
};

export default initializeUnitOfMeasureModel;
