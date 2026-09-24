import initializeAnalyticsEventModel from './AnalyticsEvent.js';

export const initializeAnalyticsModels = (sequelize) => {
    const AnalyticsEvent = initializeAnalyticsEventModel(sequelize);
    return { AnalyticsEvent };
};

export default initializeAnalyticsModels;
