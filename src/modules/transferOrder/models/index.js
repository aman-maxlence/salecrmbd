import initializeTransferOrderModel from './TransferOrder.js';
import initializeTransferOrderLineItemModel from './TransferOrderLineItem.js';

export const initializeTransferOrderModels = (sequelize) => {
    const TransferOrder = initializeTransferOrderModel(sequelize);
    const TransferOrderLineItem = initializeTransferOrderLineItemModel(sequelize);

    return {
        TransferOrder,
        TransferOrderLineItem,
    };
};

export default initializeTransferOrderModels;
