import initializePushSubscriptionModel from './PushSubscription.js';

export const initializePushModels = (sequelize) => {
    const PushSubscription = initializePushSubscriptionModel(sequelize);
    return { PushSubscription };
};

export default initializePushModels;
