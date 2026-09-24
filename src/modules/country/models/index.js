import initializeCountryModel from './Country.js';

export const initializeCountryModels = (sequelize) => {
    const Country = initializeCountryModel(sequelize);
    return { Country };
};

export default initializeCountryModels;
