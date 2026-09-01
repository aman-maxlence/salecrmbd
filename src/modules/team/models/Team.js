import { DataTypes } from 'sequelize';

/**
 * A named team, scoped to an org and always nested under exactly one
 * Territory and one Department - mirrors Department.js/Territory.js's
 * shape (org-scoped-unique-name), plus the department/territory FKs and an
 * optional manager, since the "Create Team" form collects all of that.
 */
const initializeTeamModel = (sequelize) => {
    const Team = sequelize.define('Team', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        org_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        department_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        territory_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        manager_user_id: {
            // Raw userbd user id of the team lead - not a local FK, same
            // convention as Territory.manager_user_id (identity lives in userbd).
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
        },
    }, {
        tableName: 'teams',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['org_id'] },
            { fields: ['department_id'] },
            { fields: ['territory_id'] },
            { fields: ['org_id', 'name'], unique: true },
        ],
    });

    return Team;
};

export default initializeTeamModel;
