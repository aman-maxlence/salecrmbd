import initializeVendorModel from './Vendor.js';
import initializePurchaseOrderModel from './PurchaseOrder.js';
import initializePurchaseOrderLineItemModel from './PurchaseOrderLineItem.js';
import initializeBillModel from './Bill.js';
import initializeBillPaymentModel from './BillPayment.js';
import initializeBillCounterModel from './BillCounter.js';

export const initializePurchasingModels = (sequelize) => {
    const Vendor = initializeVendorModel(sequelize);
    const PurchaseOrder = initializePurchaseOrderModel(sequelize);
    const PurchaseOrderLineItem = initializePurchaseOrderLineItemModel(sequelize);
    const Bill = initializeBillModel(sequelize);
    const BillPayment = initializeBillPaymentModel(sequelize);
    const BillCounter = initializeBillCounterModel(sequelize);

    return {
        Vendor,
        PurchaseOrder,
        PurchaseOrderLineItem,
        Bill,
        BillPayment,
        BillCounter,
    };
};

export default initializePurchasingModels;
