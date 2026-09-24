import initializeIntegrationConnectionModel from './IntegrationConnection.js';

export const initializeIntegrationModels = (sequelize) => {
    const IntegrationConnection = initializeIntegrationConnectionModel(sequelize);
    return { IntegrationConnection };
};

export default initializeIntegrationModels;
