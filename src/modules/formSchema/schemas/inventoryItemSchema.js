/**
 * Default section/field layout for entity_type 'inventory_item', seeded once
 * per org (see FormSchemaService.ensureDefaultSchema). Every field below is
 * `is_builtin: true` - its value lives on a real InventoryItem column and is
 * rendered by ItemFormPage's renderBuiltinField, never through the generic
 * custom-field/EAV path. An admin can still hide, relabel, reorder, move, or
 * flip required/visible on any of these from Settings -> Form Builder, and
 * can add genuinely custom fields (e.g. manufacturer_id, dimensions, more
 * identifiers) alongside them - this is just the starting set every org
 * needs to create an item at all (Name is always required server-side; SKU,
 * Category, Unit Price and Tax's required-ness is admin-configurable, see
 * ItemService._catalogFields).
 */
export const ENTITY_TYPE = 'inventory_item';

export const INVENTORY_ITEM_SCHEMA = [
    {
        heading: 'Basic Info',
        fields: [
            { fieldKey: 'name', label: 'Item Name', fieldType: 'text', required: true, position: 0 },
            { fieldKey: 'item_type', label: 'Type', fieldType: 'radio', position: 1 },
            { fieldKey: 'sku', label: 'SKU', fieldType: 'text', position: 2 },
            { fieldKey: 'category_id', label: 'Category', fieldType: 'select', position: 3 },
            { fieldKey: 'brand_id', label: 'Brand', fieldType: 'select', position: 4 },
            { fieldKey: 'manufacturer_id', label: 'Manufacturer', fieldType: 'select', position: 5 },
            { fieldKey: 'description', label: 'Description', fieldType: 'textarea', position: 6 },
        ],
    },
    {
        heading: 'Pricing & Tax',
        fields: [
            { fieldKey: 'unit_price', label: 'Unit Price', fieldType: 'number', position: 0 },
            { fieldKey: 'cost_price', label: 'Cost Price', fieldType: 'number', position: 1 },
            { fieldKey: 'tax', label: 'Tax (%)', fieldType: 'number', position: 2 },
            { fieldKey: 'pricing_tier_id', label: 'Pricing Tier', fieldType: 'select', position: 3 },
            { fieldKey: 'scheduled_price', label: 'Scheduled Price', fieldType: 'number', position: 4 },
            { fieldKey: 'price_effective_date', label: 'Effective Date', fieldType: 'date', position: 5 },
        ],
    },
    {
        heading: 'Stock & Tracking',
        fields: [
            { fieldKey: 'track_inventory', label: 'Track Inventory', fieldType: 'boolean', position: 0 },
            { fieldKey: 'uom_id', label: 'Unit of Measure', fieldType: 'select', position: 1 },
            { fieldKey: 'low_stock_threshold', label: 'Low Stock Threshold', fieldType: 'number', position: 2 },
            { fieldKey: 'barcode', label: 'Barcode', fieldType: 'text', position: 3 },
            // Previously only changeable via the Delete/Reactivate buttons on
            // ItemDetailPage/ItemListPage, never directly on the form itself
            // (Item/Product Management checklist finding).
            { fieldKey: 'status', label: 'Status', fieldType: 'select', options: ['active', 'inactive'], position: 4 },
        ],
    },
    {
        // Physical specs + secondary identifiers - coded on the form since
        // the product's very first pass, but never actually reachable
        // before now because nothing seeded them into any org's default
        // schema (Form Builder checklist audit finding).
        heading: 'Specifications & Identifiers',
        fields: [
            { fieldKey: 'length', label: 'Length', fieldType: 'number', position: 0 },
            { fieldKey: 'width', label: 'Width', fieldType: 'number', position: 1 },
            { fieldKey: 'height', label: 'Height', fieldType: 'number', position: 2 },
            { fieldKey: 'dimension_unit', label: 'Dimension Unit', fieldType: 'select', position: 3 },
            { fieldKey: 'weight', label: 'Weight', fieldType: 'number', position: 4 },
            { fieldKey: 'weight_unit', label: 'Weight Unit', fieldType: 'select', position: 5 },
            { fieldKey: 'upc', label: 'UPC', fieldType: 'text', position: 6 },
            { fieldKey: 'mpn', label: 'MPN', fieldType: 'text', position: 7 },
            { fieldKey: 'ean', label: 'EAN', fieldType: 'text', position: 8 },
            { fieldKey: 'isbn', label: 'ISBN', fieldType: 'text', position: 9 },
        ],
    },
];

export default INVENTORY_ITEM_SCHEMA;
