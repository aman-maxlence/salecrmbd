import initializeInvitationModel from './Invitation.js';

export const initializeInvitationModels = (sequelize) => {
    const Invitation = initializeInvitationModel(sequelize);
    return { Invitation };
};

export default initializeInvitationModels;
