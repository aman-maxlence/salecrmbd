import { DataTypes } from 'sequelize';
import { NOTIFICATION_TEMPLATE_TYPE_VALUES } from '../constants.js';

/**
 * Per-org override of a system email's subject/heading/body text ("Support
 * configurable notification templates"). A missing row, or a row with all
 * three fields null, means "use the hardcoded default" - see
 * NotificationService._buildEmail.
 */
const initializeNotificationTemplateModel = (sequelize) => {
    const NotificationTemplate = sequelize.define('NotificationTemplate', {
        id: {
            type:          DataTypes.INTEGER,
            primaryKey:    true,
            autoIncrement: true,
            allowNull:     false,
        },
        org_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        type: {
            type:      DataTypes.ENUM(...NOTIFICATION_TEMPLATE_TYPE_VALUES),
            allowNull: false,
        },
        subject: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        heading: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        body_text: {
            type:      DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName:   'notification_templates',
        timestamps:  true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['org_id', 'type'] },
        ],
    });

    return NotificationTemplate;
};

export default initializeNotificationTemplateModel;
