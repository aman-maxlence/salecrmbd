import initializeUserPreferencesModel from './UserPreferences.js';

export const initializeUserPreferencesModels = (sequelize) => {
    const UserPreferences = initializeUserPreferencesModel(sequelize);
    return { UserPreferences };
};

export default initializeUserPreferencesModels;
