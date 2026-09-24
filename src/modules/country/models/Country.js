import { DataTypes } from 'sequelize';

/**
 * Top level of the org hierarchy, sitting above Territory (Country ->
 * Territory -> Team/Department). Unlike Territory (a free-text org-defined
 * grouping), a Country row is always a real-world country the org picked
 * from the shared `country-selector` list on the frontend - `code` is that
 * list's ISO alpha-2 value, kept here so it can't drift from the source list.
 */
const initializeCountryModel = (sequelize) => {
    const Country = sequelize.define('Country', {
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
            // ISO alpha-2, from the frontend's country-selector list (e.g. 'IN', 'AU').
            type:      DataTypes.STRING(10),
            allowNull: false,
        },
        status: {
            type:         DataTypes.ENUM('active', 'inactive'),
            allowNull:    false,
            defaultValue: 'active',
        },
    }, {
        tableName:   'countries',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id'] },
            { fields: ['org_id', 'code'], unique: true },
        ],
    });

    return Country;
};

export default initializeCountryModel;
