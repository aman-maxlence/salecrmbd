import { DataTypes } from 'sequelize';

/** Read-only mirror of Technogex's `DesignItem` (licensed design marketplace assets). */
const initializeTechnogexDesignItemModel = (sequelize) => {
    const TechnogexDesignItem = sequelize.define('TechnogexDesignItem', {
        id: {
            type:          DataTypes.INTEGER,
            primaryKey:    true,
            autoIncrement: true,
            allowNull:     false,
        },
        external_id: {
            type:      DataTypes.STRING(36),
            allowNull: false,
            comment:   'Technogex DesignItem.id (UUID).',
        },
        category_external_id: {
            type:      DataTypes.STRING(36),
            allowNull: true,
        },
        title: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        base_price: {
            type:         DataTypes.DECIMAL(10, 2),
            allowNull:    false,
            defaultValue: 0,
        },
        licensing_type: {
            type:         DataTypes.ENUM('standard', 'commercial', 'exclusive'),
            allowNull:    false,
            defaultValue: 'standard',
        },
        formats: {
            type:      DataTypes.JSON,
            allowNull: true,
        },
        preview_images: {
            type:      DataTypes.JSON,
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
        tableName:   'technogex_design_items',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['external_id'], unique: true },
            { fields: ['category_external_id'] },
        ],
    });

    return TechnogexDesignItem;
};

export default initializeTechnogexDesignItemModel;
