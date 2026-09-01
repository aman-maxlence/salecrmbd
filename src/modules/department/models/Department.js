import { DataTypes } from 'sequelize';

/**
 * A named organizational department (Sales, Marketing, ...), scoped to an
 * org - mirrors Territory.js exactly (same org-scoped-unique-name shape),
 * plus a description and a head, since the "Add Department" form collects
 * both.
 */
const initializeDepartmentModel = (sequelize) => {
    const Department = sequelize.define('Department', {
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
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        head_user_id: {
            // Raw userbd user id of the department head - not a local FK, same
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
        tableName: 'departments',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['org_id'] },
            { fields: ['org_id', 'name'], unique: true },
        ],
    });

    return Department;
};

export default initializeDepartmentModel;
