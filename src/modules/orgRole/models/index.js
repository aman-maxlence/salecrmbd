import initializeOrgRoleModel from './OrgRole.js';

export const initializeOrgRoleModels = (sequelize) => {
    const OrgRole = initializeOrgRoleModel(sequelize);
    return { OrgRole };
};

export default initializeOrgRoleModels;
