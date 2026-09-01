import { DataTypes } from 'sequelize';

const initializePricingTierModel = (sequelize) => {
    const PricingTier = sequelize.define('PricingTier', {
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
        discount_percent: {
            type:         DataTypes.DECIMAL(8, 4),
            allowNull:    false,
            defaultValue: 0,
        },
        status: {
            type:         DataTypes.ENUM('active', 'inactive'),
            allowNull:    false,
            defaultValue: 'active',
        },
    }, {
        tableName:   'inventory_pricing_tiers',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id'] },
            { fields: ['org_id', 'name'], unique: true },
        ],
    });

    return PricingTier;
};

export default initializePricingTierModel;
