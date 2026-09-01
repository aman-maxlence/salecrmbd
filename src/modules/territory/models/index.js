import initializeTerritoryModel from './Territory.js';

export const initializeTerritoryModels = (sequelize) => {
    const Territory = initializeTerritoryModel(sequelize);
    return { Territory };
};

export default initializeTerritoryModels;
