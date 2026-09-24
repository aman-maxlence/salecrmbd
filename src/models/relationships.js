/**
 * Wire up Sequelize associations across modules here as they're added
 * (e.g. Deal.belongsTo(SalesRep), Incentive.belongsTo(SalesRep), etc.)
 * @param {object} models - flat map of all initialized models
 */
export default function initializeRelationships(models) {
    const {
        OrgRole, Country, Territory, Department, Team, PortalUser, Invitation, InviteLink,
        InventoryItem, UnitOfMeasure, PricingTier, Warehouse,
        StockLevel, ItemPriceHistory, LowStockAlert, StockAdjustment,
        Deal, DealLineItem,
        Vendor, PurchaseOrder, PurchaseOrderLineItem,
        SalesOrder, SalesOrderLineItem,
        TransferOrder, TransferOrderLineItem,
        Package, PackageLineItem,
        ItemCategory, ItemBrand, ItemManufacturer,
        TechnogexProduct, TechnogexProductPackage,
        TechnogexDesignItem, TechnogexValuePack, TechnogexValuePackTier,
        FormSection, FormFieldDefinition, FormFieldValue,
    } = models;

    PortalUser.belongsTo(OrgRole, { foreignKey: 'role_id', as: 'role' });
    OrgRole.hasMany(PortalUser, { foreignKey: 'role_id', as: 'portalUsers' });

    // Org hierarchy: Country -> Territory -> Department -> Team.
    Territory.belongsTo(Country, { foreignKey: 'country_id', as: 'country' });
    Country.hasMany(Territory, { foreignKey: 'country_id', as: 'territories' });

    PortalUser.belongsTo(Territory, { foreignKey: 'territory_id', as: 'territory' });
    Territory.hasMany(PortalUser, { foreignKey: 'territory_id', as: 'portalUsers' });

    Department.belongsTo(Territory, { foreignKey: 'territory_id', as: 'territory' });
    Territory.hasMany(Department, { foreignKey: 'territory_id', as: 'departments' });

    // A Team always nests under exactly one Department, which implies its
    // Territory - `territory_id` is still stored directly on Team (kept in
    // sync by TeamService, never taken as independent input) for cheap
    // direct filtering.
    Team.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
    Department.hasMany(Team, { foreignKey: 'department_id', as: 'teams' });

    Team.belongsTo(Territory, { foreignKey: 'territory_id', as: 'territory' });
    Territory.hasMany(Team, { foreignKey: 'territory_id', as: 'teams' });

    PortalUser.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });
    Team.hasMany(PortalUser, { foreignKey: 'team_id', as: 'members' });

    Invitation.belongsTo(OrgRole, { foreignKey: 'role_id', as: 'role' });
    Invitation.belongsTo(Territory, { foreignKey: 'territory_id', as: 'territory' });
    Invitation.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

    InviteLink.belongsTo(OrgRole, { foreignKey: 'role_id', as: 'role' });
    InviteLink.belongsTo(Territory, { foreignKey: 'territory_id', as: 'territory' });

    InventoryItem.belongsTo(UnitOfMeasure, { foreignKey: 'uom_id', as: 'uom' });
    InventoryItem.belongsTo(PricingTier, { foreignKey: 'pricing_tier_id', as: 'pricingTier' });
    InventoryItem.hasMany(StockLevel, { foreignKey: 'item_id', as: 'stockLevels' });
    InventoryItem.hasMany(ItemPriceHistory, { foreignKey: 'item_id', as: 'priceHistory' });
    InventoryItem.hasMany(DealLineItem, { foreignKey: 'item_id', as: 'dealLineItems' });
    InventoryItem.hasMany(LowStockAlert, { foreignKey: 'item_id', as: 'lowStockAlerts' });
    InventoryItem.hasMany(StockAdjustment, { foreignKey: 'item_id', as: 'adjustments' });
    InventoryItem.belongsTo(Vendor, { foreignKey: 'preferred_vendor_id', as: 'preferredVendor' });
    InventoryItem.belongsTo(ItemCategory, { foreignKey: 'category_id', as: 'categoryRef' });
    InventoryItem.belongsTo(ItemBrand, { foreignKey: 'brand_id', as: 'brandRef' });
    InventoryItem.belongsTo(ItemManufacturer, { foreignKey: 'manufacturer_id', as: 'manufacturerRef' });
    ItemCategory.belongsTo(ItemCategory, { foreignKey: 'parent_id', as: 'parent' });
    ItemCategory.hasMany(ItemCategory, { foreignKey: 'parent_id', as: 'children' });

    // ==================== GENERIC FORM SCHEMA (sections/fields, any entity_type) ====================

    FormSection.belongsTo(FormSection, { foreignKey: 'parent_section_id', as: 'parent' });
    FormSection.hasMany(FormSection, { foreignKey: 'parent_section_id', as: 'childSections' });
    FormSection.hasMany(FormFieldDefinition, { foreignKey: 'section_id', as: 'fieldDefinitions' });
    FormFieldDefinition.belongsTo(FormSection, { foreignKey: 'section_id', as: 'section' });
    FormFieldDefinition.hasMany(FormFieldValue, { foreignKey: 'field_id', as: 'values', onDelete: 'CASCADE' });
    FormFieldValue.belongsTo(FormFieldDefinition, { foreignKey: 'field_id', as: 'fieldDefinition' });

    StockLevel.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });
    StockLevel.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
    Warehouse.hasMany(StockLevel, { foreignKey: 'warehouse_id', as: 'stockLevels' });

    ItemPriceHistory.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });

    LowStockAlert.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });
    LowStockAlert.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

    StockAdjustment.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });
    StockAdjustment.belongsTo(Warehouse, { foreignKey: 'from_warehouse_id', as: 'fromWarehouse' });
    StockAdjustment.belongsTo(Warehouse, { foreignKey: 'to_warehouse_id', as: 'toWarehouse' });

    Deal.hasMany(DealLineItem, { foreignKey: 'deal_id', as: 'lineItems' });
    DealLineItem.belongsTo(Deal, { foreignKey: 'deal_id', as: 'deal' });
    DealLineItem.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });
    DealLineItem.belongsTo(PricingTier, { foreignKey: 'pricing_tier_id', as: 'pricingTier' });
    DealLineItem.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

    // ==================== TECHNOGEX CATALOG (read-only mirror) ====================

    TechnogexProduct.hasMany(TechnogexProductPackage, { foreignKey: 'product_id', as: 'packages' });
    TechnogexProductPackage.belongsTo(TechnogexProduct, { foreignKey: 'product_id', as: 'product' });

    TechnogexValuePack.hasMany(TechnogexValuePackTier, { foreignKey: 'value_pack_id', as: 'tiers' });
    TechnogexValuePackTier.belongsTo(TechnogexValuePack, { foreignKey: 'value_pack_id', as: 'valuePack' });

    // DealLineItem/SalesOrderLineItem.source_ref_id points at exactly one of
    // these three mirror tables, picked by source_type at the app level -
    // constraints:false lets Sequelize eager-load whichever one applies
    // without a single rigid FK (same "app-validated reference" pattern as
    // SalesOrder.deal_id).
    for (const LineItem of [DealLineItem, SalesOrderLineItem]) {
        LineItem.belongsTo(TechnogexProductPackage, { foreignKey: 'source_ref_id', constraints: false, as: 'technogexProductPackage' });
        LineItem.belongsTo(TechnogexDesignItem, { foreignKey: 'source_ref_id', constraints: false, as: 'technogexDesignItem' });
        LineItem.belongsTo(TechnogexValuePackTier, { foreignKey: 'source_ref_id', constraints: false, as: 'technogexValuePackTier' });
    }

    // ==================== VENDORS / PURCHASE ORDERS ====================

    Vendor.hasMany(PurchaseOrder, { foreignKey: 'vendor_id', as: 'purchaseOrders' });
    PurchaseOrder.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'vendor' });
    PurchaseOrder.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

    PurchaseOrder.hasMany(PurchaseOrderLineItem, { foreignKey: 'purchase_order_id', as: 'lineItems' });
    PurchaseOrderLineItem.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id', as: 'purchaseOrder' });
    PurchaseOrderLineItem.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });

    // ==================== SALES ORDERS ====================

    SalesOrder.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
    SalesOrder.hasMany(SalesOrderLineItem, { foreignKey: 'sales_order_id', as: 'lineItems' });
    SalesOrderLineItem.belongsTo(SalesOrder, { foreignKey: 'sales_order_id', as: 'salesOrder' });
    SalesOrderLineItem.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });

    // ==================== TRANSFER ORDERS ====================

    TransferOrder.belongsTo(Warehouse, { foreignKey: 'from_warehouse_id', as: 'fromWarehouse' });
    TransferOrder.belongsTo(Warehouse, { foreignKey: 'to_warehouse_id', as: 'toWarehouse' });
    TransferOrder.hasMany(TransferOrderLineItem, { foreignKey: 'transfer_order_id', as: 'lineItems' });
    TransferOrderLineItem.belongsTo(TransferOrder, { foreignKey: 'transfer_order_id', as: 'transferOrder' });
    TransferOrderLineItem.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });

    // ==================== PACKAGES / SHIPMENTS ====================

    SalesOrder.hasMany(Package, { foreignKey: 'sales_order_id', as: 'packages' });
    Package.belongsTo(SalesOrder, { foreignKey: 'sales_order_id', as: 'salesOrder' });
    Package.hasMany(PackageLineItem, { foreignKey: 'package_id', as: 'lineItems' });
    PackageLineItem.belongsTo(Package, { foreignKey: 'package_id', as: 'package' });
    PackageLineItem.belongsTo(SalesOrderLineItem, { foreignKey: 'sales_order_line_item_id', as: 'salesOrderLineItem' });
}
