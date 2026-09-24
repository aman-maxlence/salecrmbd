import initializeSalesOrderModel from './SalesOrder.js';
import initializeSalesOrderLineItemModel from './SalesOrderLineItem.js';
import initializePackageModel from './Package.js';
import initializePackageLineItemModel from './PackageLineItem.js';

export const initializeSalesOrderModels = (sequelize) => {
    const SalesOrder = initializeSalesOrderModel(sequelize);
    const SalesOrderLineItem = initializeSalesOrderLineItemModel(sequelize);
    const Package = initializePackageModel(sequelize);
    const PackageLineItem = initializePackageLineItemModel(sequelize);

    return {
        SalesOrder,
        SalesOrderLineItem,
        Package,
        PackageLineItem,
    };
};

export default initializeSalesOrderModels;
