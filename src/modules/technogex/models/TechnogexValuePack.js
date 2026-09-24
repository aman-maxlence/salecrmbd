import { DataTypes } from 'sequelize';

/** Read-only mirror of Technogex's `ValuePack` (bundled category offers). */
const initializeTechnogexValuePackModel = (sequelize) => {
    const TechnogexValuePack = sequelize.define('TechnogexValuePack', {
        id: {
            type:          DataTypes.INTEGER,
            primaryKey:    true,
            autoIncrement: true,
            allowNull:     false,
        },
        external_id: {
            type:      DataTypes.STRING(36),
            allowNull: false,
            comment:   'Technogex ValuePack.id (UUID).',
        },
        name: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        slug: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        active: {
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: true,
        },
        source_deleted_at: {
            type:      DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName:   'technogex_value_packs',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['external_id'], unique: true },
        ],
    });

    return TechnogexValuePack;
};

export default initializeTechnogexValuePackModel;
