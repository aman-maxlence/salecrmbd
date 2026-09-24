import initializeBusinessPreferencesModel from './BusinessPreferences.js';

export const initializeBusinessPreferencesModels = (sequelize) => {
    const BusinessPreferences = initializeBusinessPreferencesModel(sequelize);
    return { BusinessPreferences };
};

export default initializeBusinessPreferencesModels;
