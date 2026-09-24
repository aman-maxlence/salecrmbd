import initializeTechnogexProductModel from './TechnogexProduct.js';
import initializeTechnogexProductPackageModel from './TechnogexProductPackage.js';
import initializeTechnogexDesignItemModel from './TechnogexDesignItem.js';
import initializeTechnogexValuePackModel from './TechnogexValuePack.js';
import initializeTechnogexValuePackTierModel from './TechnogexValuePackTier.js';
import initializeTechnogexSyncRunModel from './TechnogexSyncRun.js';

export const initializeTechnogexModels = (sequelize) => {
    const TechnogexProduct = initializeTechnogexProductModel(sequelize);
    const TechnogexProductPackage = initializeTechnogexProductPackageModel(sequelize);
    const TechnogexDesignItem = initializeTechnogexDesignItemModel(sequelize);
    const TechnogexValuePack = initializeTechnogexValuePackModel(sequelize);
    const TechnogexValuePackTier = initializeTechnogexValuePackTierModel(sequelize);
    const TechnogexSyncRun = initializeTechnogexSyncRunModel(sequelize);

    return {
        TechnogexProduct,
        TechnogexProductPackage,
        TechnogexDesignItem,
        TechnogexValuePack,
        TechnogexValuePackTier,
        TechnogexSyncRun,
    };
};

export default initializeTechnogexModels;
