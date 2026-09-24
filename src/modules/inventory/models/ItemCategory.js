import { DataTypes } from 'sequelize';

/** Org-scoped, optionally hierarchical (self-referencing parent_id) product category. */
const initializeItemCategoryModel = (sequelize) => {
    const ItemCategory = sequelize.define('ItemCategory', {
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
        parent_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName:   'inventory_item_categories',
        timestamps:  true,
        underscored: true,
        indexes: [
            { name: 'idx_item_categories_org_name', fields: ['org_id', 'name'], unique: true },
            { name: 'idx_item_categories_org_parent', fields: ['org_id', 'parent_id'] },
        ],
    });

    return ItemCategory;
};

export default initializeItemCategoryModel;
