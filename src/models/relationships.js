/**
 * Wire up Sequelize associations across modules here as they're added
 * (e.g. Deal.belongsTo(SalesRep), Incentive.belongsTo(SalesRep), etc.)
 * @param {object} models - flat map of all initialized models
 */
export default function initializeRelationships(models) {
    const {
        OrgRole, Territory, Department, Team, PortalUser, Invitation, InviteLink,
        InventoryItem, UnitOfMeasure, PricingTier, Warehouse,
        StockLevel, ItemPriceHistory, LowStockAlert, StockAdjustment,
        Deal, DealLineItem,
    } = models;

    PortalUser.belongsTo(OrgRole, { foreignKey: 'role_id', as: 'role' });
    OrgRole.hasMany(PortalUser, { foreignKey: 'role_id', as: 'portalUsers' });

    PortalUser.belongsTo(Territory, { foreignKey: 'territory_id', as: 'territory' });
    Territory.hasMany(PortalUser, { foreignKey: 'territory_id', as: 'portalUsers' });

    // A Team always nests under exactly one Department and one Territory.
    Team.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
    Department.hasMany(Team, { foreignKey: 'department_id', as: 'teams' });

    Team.belongsTo(Territory, { foreignKey: 'territory_id', as: 'territory' });
    Territory.hasMany(Team, { foreignKey: 'territory_id', as: 'teams' });

    PortalUser.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });
    Team.hasMany(PortalUser, { foreignKey: 'team_id', as: 'members' });

    Invitation.belongsTo(OrgRole, { foreignKey: 'role_id', as: 'role' });
    Invitation.belongsTo(Territory, { foreignKey: 'territory_id', as: 'territory' });

    InviteLink.belongsTo(OrgRole, { foreignKey: 'role_id', as: 'role' });
    InviteLink.belongsTo(Territory, { foreignKey: 'territory_id', as: 'territory' });

    InventoryItem.belongsTo(UnitOfMeasure, { foreignKey: 'uom_id', as: 'uom' });
    InventoryItem.belongsTo(PricingTier, { foreignKey: 'pricing_tier_id', as: 'pricingTier' });
    InventoryItem.hasMany(StockLevel, { foreignKey: 'item_id', as: 'stockLevels' });
    InventoryItem.hasMany(ItemPriceHistory, { foreignKey: 'item_id', as: 'priceHistory' });
    InventoryItem.hasMany(DealLineItem, { foreignKey: 'item_id', as: 'dealLineItems' });
    InventoryItem.hasMany(LowStockAlert, { foreignKey: 'item_id', as: 'lowStockAlerts' });
    InventoryItem.hasMany(StockAdjustment, { foreignKey: 'item_id', as: 'adjustments' });

    StockLevel.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });
    StockLevel.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
    Warehouse.hasMany(StockLevel, { foreignKey: 'warehouse_id', as: 'stockLevels' });

    ItemPriceHistory.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });

    LowStockAlert.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });
    LowStockAlert.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

    StockAdjustment.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });

    Deal.hasMany(DealLineItem, { foreignKey: 'deal_id', as: 'lineItems' });
    DealLineItem.belongsTo(Deal, { foreignKey: 'deal_id', as: 'deal' });
    DealLineItem.belongsTo(InventoryItem, { foreignKey: 'item_id', as: 'item' });
    DealLineItem.belongsTo(PricingTier, { foreignKey: 'pricing_tier_id', as: 'pricingTier' });
    DealLineItem.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
}
