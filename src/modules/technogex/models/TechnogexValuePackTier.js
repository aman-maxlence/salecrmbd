import { DataTypes } from 'sequelize';

/** Read-only mirror of Technogex's `ValuePackTier` - pricing scoped per (tier, duration, country). */
const initializeTechnogexValuePackTierModel = (sequelize) => {
    const TechnogexValuePackTier = sequelize.define('TechnogexValuePackTier', {
        id: {
            type:          DataTypes.INTEGER,
            primaryKey:    true,
            autoIncrement: true,
            allowNull:     false,
        },
        external_id: {
            type:      DataTypes.STRING(36),
            allowNull: false,
            comment:   'Technogex ValuePackTier.id (UUID).',
        },
        value_pack_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
            comment:   'FK to technogex_value_packs.id (the local mirror row, not the Technogex UUID).',
        },
        tier_type: {
            type:      DataTypes.STRING(30),
            allowNull: false,
        },
        name: {
            type:      DataTypes.STRING(100),
            allowNull: true,
        },
        duration_external_id: {
            type:      DataTypes.STRING(36),
            allowNull: true,
        },
        country_external_id: {
            type:      DataTypes.STRING(36),
            allowNull: true,
        },
        original_price: {
            type:      DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        current_price: {
            type:      DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        is_active: {
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: true,
        },
        source_deleted_at: {
            type:      DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName:   'technogex_value_pack_tiers',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['external_id'], unique: true },
            { fields: ['value_pack_id'] },
        ],
    });

    return TechnogexValuePackTier;
};

export default initializeTechnogexValuePackTierModel;
