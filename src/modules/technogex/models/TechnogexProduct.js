import { DataTypes } from 'sequelize';

/**
 * Read-only mirror of Technogex's `Products` table, kept in sync by
 * TechnogexSyncService. Global (no org_id) - Technogex's catalog is one
 * shared list every CRM org can quote from, not per-tenant data.
 */
const initializeTechnogexProductModel = (sequelize) => {
    const TechnogexProduct = sequelize.define('TechnogexProduct', {
        id: {
            type:          DataTypes.INTEGER,
            primaryKey:    true,
            autoIncrement: true,
            allowNull:     false,
        },
        external_id: {
            type:      DataTypes.STRING(36),
            allowNull: false,
            comment:   'Technogex Products.id (UUID) - the sync job\'s dedupe key.',
        },
        name: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        description: {
            type:      DataTypes.STRING(2000),
            allowNull: true,
        },
        category_external_id: {
            type:      DataTypes.STRING(36),
            allowNull: true,
        },
        slug: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        product_type: {
            type:         DataTypes.ENUM('single', 'combo'),
            allowNull:    true,
        },
        image_url: {
            type:      DataTypes.STRING(500),
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
            comment:   'Set when this row disappears from a Technogex sync fetch (soft-deleted/archived there) - never hard-deleted locally so existing line items keep their source_meta snapshot.',
        },
        last_synced_at: {
            type:      DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName:   'technogex_products',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['external_id'], unique: true },
            { fields: ['category_external_id'] },
        ],
    });

    return TechnogexProduct;
};

export default initializeTechnogexProductModel;
