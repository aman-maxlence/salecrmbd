import initializeWorkspaceSettingsModel from './WorkspaceSettings.js';

export const initializeWorkspaceSettingsModels = (sequelize) => {
    const WorkspaceSettings = initializeWorkspaceSettingsModel(sequelize);
    return { WorkspaceSettings };
};

export default initializeWorkspaceSettingsModels;
