import { DataTypes } from 'sequelize';

const initializeInventoryItemModel = (sequelize) => {
    const InventoryItem = sequelize.define('InventoryItem', {
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
        sku: {
            type:      DataTypes.STRING(100),
            allowNull: false,
        },
        name: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        category: {
            type:      DataTypes.STRING(100),
            allowNull: true,
        },
        unit_price: {
            type:         DataTypes.DECIMAL(14, 4),
            allowNull:    false,
            defaultValue: 0,
        },
        tax: {
            type:         DataTypes.DECIMAL(8, 4),
            allowNull:    false,
            defaultValue: 0,
        },
        uom_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        pricing_tier_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        low_stock_threshold: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: true,
        },
        status: {
            type:         DataTypes.ENUM('active', 'inactive'),
            allowNull:    false,
            defaultValue: 'active',
        },
        barcode: {
            type:      DataTypes.STRING(100),
            allowNull: true,
            comment:   'Defaults to the SKU on create if not supplied - Code128 can encode any string',
        },
        hsn_code: {
            type:      DataTypes.STRING(20),
            allowNull: true,
        },
        upc: {
            type:      DataTypes.STRING(20),
            allowNull: true,
            comment:   'Universal Product Code - a secondary identifier, distinct from sku/barcode.',
        },
        mpn: {
            type:      DataTypes.STRING(50),
            allowNull: true,
            comment:   'Manufacturer Part Number.',
        },
        ean: {
            type:      DataTypes.STRING(20),
            allowNull: true,
            comment:   'European Article Number.',
        },
        isbn: {
            type:      DataTypes.STRING(20),
            allowNull: true,
            comment:   'International Standard Book Number - only meaningful for items that are books.',
        },
        is_returnable: {
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: true,
        },
        preferred_vendor_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        item_type: {
            type:         DataTypes.ENUM('goods', 'service'),
            allowNull:    false,
            defaultValue: 'goods',
        },
        brand: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        manufacturer: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        description: {
            type:      DataTypes.STRING(2000),
            allowNull: true,
        },
        cost_price: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: true,
        },
        sales_account: {
            type:         DataTypes.STRING(100),
            allowNull:    true,
            defaultValue: 'Sales',
            comment:      'Cosmetic only - Sale CRM has no accounting/GL module, this just mirrors the Zoho form field.',
        },
        purchase_account: {
            type:         DataTypes.STRING(100),
            allowNull:    true,
            defaultValue: 'Cost of Goods Sold',
            comment:      'Cosmetic only - see sales_account.',
        },
        track_inventory: {
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: true,
            comment:      'Always false for item_type=service (enforced in ItemService). StockService.adjust() rejects moves against a non-tracked item.',
        },
        front_image_key: {
            type:      DataTypes.STRING(500),
            allowNull: true,
        },
        rear_image_key: {
            type:      DataTypes.STRING(500),
            allowNull: true,
        },
        gallery_image_keys: {
            type:         DataTypes.JSON,
            allowNull:    true,
            defaultValue: [],
        },
        length: {
            type:      DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        width: {
            type:      DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        height: {
            type:      DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        dimension_unit: {
            type:         DataTypes.STRING(10),
            allowNull:    true,
            defaultValue: 'cm',
        },
        weight: {
            type:      DataTypes.DECIMAL(10, 3),
            allowNull: true,
        },
        weight_unit: {
            type:         DataTypes.STRING(10),
            allowNull:    true,
            defaultValue: 'kg',
        },
        category_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
            comment:   'FK to ItemCategory - the `category` string column is kept in sync from this for backward-compatible filtering/grouping.',
        },
        brand_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
            comment:   'FK to ItemBrand - `brand` string column kept in sync from this.',
        },
        manufacturer_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
            comment:   'FK to ItemManufacturer - `manufacturer` string column kept in sync from this.',
        },
        inventory_account: {
            type:         DataTypes.STRING(100),
            allowNull:    true,
            defaultValue: 'Inventory Asset',
            comment:      'Cosmetic only - see sales_account.',
        },
        inventory_valuation_method: {
            type:         DataTypes.ENUM('fifo', 'weighted_average'),
            allowNull:    true,
            defaultValue: 'fifo',
            comment:      'Cosmetic only - Sale CRM does not compute FIFO/weighted-average costing, this just mirrors the form field.',
        },
    }, {
        tableName:   'inventory_items',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id'] },
            { fields: ['org_id', 'sku'], unique: true },
            { fields: ['org_id', 'category'] },
            { fields: ['org_id', 'name'] },
            { fields: ['org_id', 'barcode'] },
        ],
    });

    return InventoryItem;
};

export default initializeInventoryItemModel;
