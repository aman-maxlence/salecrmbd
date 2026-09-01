import initializeTeamModel from './Team.js';

export const initializeTeamModels = (sequelize) => {
    const Team = initializeTeamModel(sequelize);
    return { Team };
};

export default initializeTeamModels;
