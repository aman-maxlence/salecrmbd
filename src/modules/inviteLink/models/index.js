import initializeInviteLinkModel from './InviteLink.js';

export const initializeInviteLinkModels = (sequelize) => {
    const InviteLink = initializeInviteLinkModel(sequelize);
    return { InviteLink };
};

export default initializeInviteLinkModels;
