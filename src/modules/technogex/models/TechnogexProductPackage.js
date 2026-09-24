import { DataTypes } from 'sequelize';

/** Read-only mirror of Technogex's `ProductPackages` (Low/Mid/High pricing tiers per product). */
const initializeTechnogexProductPackageModel = (sequelize) => {
    const TechnogexProductPackage = sequelize.define('TechnogexProductPackage', {
        id: {
            type:          DataTypes.INTEGER,
            primaryKey:    true,
            autoIncrement: true,
            allowNull:     false,
        },
        external_id: {
            type:      DataTypes.STRING(36),
            allowNull: false,
            comment:   'Technogex ProductPackages.id (UUID).',
        },
        product_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
            comment:   'FK to technogex_products.id (the local mirror row, not the Technogex UUID).',
        },
        package_type: {
            type:      DataTypes.ENUM('Low', 'Mid', 'High'),
            allowNull: false,
        },
        tentative_monthly_price: {
            type:      DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        final_monthly_price: {
            type:      DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        display_price: {
            type:      DataTypes.JSON,
            allowNull: true,
            comment:   'Per-currency starting price, mirrored verbatim from Technogex, e.g. {"INR": 999.00, "USD": 45.00}.',
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
        tableName:   'technogex_product_packages',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['external_id'], unique: true },
            { fields: ['product_id'] },
        ],
    });

    return TechnogexProductPackage;
};

export default initializeTechnogexProductPackageModel;
