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
            { fieldKey: 'description', label: 'Description', fieldType: 'textarea', position: 5 },
        ],
    },
    {
        heading: 'Pricing & Tax',
        fields: [
            { fieldKey: 'unit_price', label: 'Unit Price', fieldType: 'number', position: 0 },
            { fieldKey: 'cost_price', label: 'Cost Price', fieldType: 'number', position: 1 },
            { fieldKey: 'tax', label: 'Tax (%)', fieldType: 'number', position: 2 },
        ],
    },
    {
        heading: 'Stock & Tracking',
        fields: [
            { fieldKey: 'track_inventory', label: 'Track Inventory', fieldType: 'boolean', position: 0 },
            { fieldKey: 'uom_id', label: 'Unit of Measure', fieldType: 'select', position: 1 },
            { fieldKey: 'low_stock_threshold', label: 'Low Stock Threshold', fieldType: 'number', position: 2 },
            { fieldKey: 'barcode', label: 'Barcode', fieldType: 'text', position: 3 },
        ],
    },
];

export default INVENTORY_ITEM_SCHEMA;
