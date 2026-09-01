import { DataTypes } from 'sequelize';

/**
 * Sales-specific org grouping, referenced by PortalUser/Invitation for
 * territory-scoped views (e.g. a Manager's "own territory" leads/deals).
 * Not present in the maxpmbd reference - CRM-specific per design doc §2.
 */
const initializeTerritoryModel = (sequelize) => {
    const Territory = sequelize.define('Territory', {
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
        manager_user_id: {
            // Raw userbd user id - not a local FK (identity lives in userbd).
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type:         DataTypes.ENUM('active', 'inactive'),
            allowNull:    false,
            defaultValue: 'active',
        },
    }, {
        tableName:   'territories',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id'] },
            { fields: ['org_id', 'name'], unique: true },
        ],
    });

    return Territory;
};

export default initializeTerritoryModel;
