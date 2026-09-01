import { DataTypes } from 'sequelize';

const initializeDealModel = (sequelize) => {
    const Deal = sequelize.define('Deal', {
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
        title: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        stage: {
            type:         DataTypes.STRING(50),
            allowNull:    false,
            defaultValue: 'open',
        },
        status: {
            type:         DataTypes.ENUM('open', 'won', 'lost'),
            allowNull:    false,
            defaultValue: 'open',
        },
        owner_user_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName:   'deals',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id'] },
            { fields: ['org_id', 'status'] },
        ],
    });

    return Deal;
};

export default initializeDealModel;
