import initializePortalUserModel from './PortalUser.js';

export const initializePortalUserModels = (sequelize) => {
    const PortalUser = initializePortalUserModel(sequelize);
    return { PortalUser };
};

export default initializePortalUserModels;
