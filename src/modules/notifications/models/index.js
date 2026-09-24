import initializeNotificationLogModel from './NotificationLog.js';
import initializeNotificationTemplateModel from './NotificationTemplate.js';

export const initializeNotificationModels = (sequelize) => {
    const NotificationLog = initializeNotificationLogModel(sequelize);
    const NotificationTemplate = initializeNotificationTemplateModel(sequelize);
    return { NotificationLog, NotificationTemplate };
};

export default initializeNotificationModels;
