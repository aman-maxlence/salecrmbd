import initializeDealModel from './Deal.js';
import initializeDealLineItemModel from './DealLineItem.js';

export const initializeDealModels = (sequelize) => {
    const Deal = initializeDealModel(sequelize);
    const DealLineItem = initializeDealLineItemModel(sequelize);
    return { Deal, DealLineItem };
};

export default initializeDealModels;
