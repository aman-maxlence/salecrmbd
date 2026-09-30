import initializePortalUserModel from './PortalUser.js';
import initializePortalUserTeamModel from './PortalUserTeam.js';

export const initializePortalUserModels = (sequelize) => {
    const PortalUser = initializePortalUserModel(sequelize);
    const PortalUserTeam = initializePortalUserTeamModel(sequelize);
    return { PortalUser, PortalUserTeam };
};

export default initializePortalUserModels;
