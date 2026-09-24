import initializeVendorModel from './Vendor.js';
import initializePurchaseOrderModel from './PurchaseOrder.js';
import initializePurchaseOrderLineItemModel from './PurchaseOrderLineItem.js';

export const initializePurchasingModels = (sequelize) => {
    const Vendor = initializeVendorModel(sequelize);
    const PurchaseOrder = initializePurchaseOrderModel(sequelize);
    const PurchaseOrderLineItem = initializePurchaseOrderLineItemModel(sequelize);

    return {
        Vendor,
        PurchaseOrder,
        PurchaseOrderLineItem,
    };
};

export default initializePurchasingModels;
