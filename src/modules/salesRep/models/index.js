import initializeSalesRepModel from './SalesRep.js';

export function initializeSalesRepModels(sequelize) {
    const SalesRep = initializeSalesRepModel(sequelize);
    return { SalesRep };
}

export default initializeSalesRepModels;
