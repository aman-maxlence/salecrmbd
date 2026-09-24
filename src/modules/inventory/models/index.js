import initializeInventorySettingsModel from './InventorySettings.js';
import initializeUnitOfMeasureModel from './UnitOfMeasure.js';
import initializePricingTierModel from './PricingTier.js';
import initializeWarehouseModel from './Warehouse.js';
import initializeInventoryItemModel from './InventoryItem.js';
import initializeItemPriceHistoryModel from './ItemPriceHistory.js';
import initializeStockLevelModel from './StockLevel.js';
import initializeStockAdjustmentModel from './StockAdjustment.js';
import initializeLowStockAlertModel from './LowStockAlert.js';
import initializeItemCategoryModel from './ItemCategory.js';
import initializeItemBrandModel from './ItemBrand.js';
import initializeItemManufacturerModel from './ItemManufacturer.js';

export const initializeInventoryModels = (sequelize) => {
    const InventorySettings = initializeInventorySettingsModel(sequelize);
    const UnitOfMeasure = initializeUnitOfMeasureModel(sequelize);
    const PricingTier = initializePricingTierModel(sequelize);
    const Warehouse = initializeWarehouseModel(sequelize);
    const InventoryItem = initializeInventoryItemModel(sequelize);
    const ItemPriceHistory = initializeItemPriceHistoryModel(sequelize);
    const StockLevel = initializeStockLevelModel(sequelize);
    const StockAdjustment = initializeStockAdjustmentModel(sequelize);
    const LowStockAlert = initializeLowStockAlertModel(sequelize);
    const ItemCategory = initializeItemCategoryModel(sequelize);
    const ItemBrand = initializeItemBrandModel(sequelize);
    const ItemManufacturer = initializeItemManufacturerModel(sequelize);

    return {
        InventorySettings,
        UnitOfMeasure,
        PricingTier,
        Warehouse,
        InventoryItem,
        ItemPriceHistory,
        StockLevel,
        StockAdjustment,
        LowStockAlert,
        ItemCategory,
        ItemBrand,
        ItemManufacturer,
    };
};

export default initializeInventoryModels;
