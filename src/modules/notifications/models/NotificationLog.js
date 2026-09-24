import { DataTypes } from 'sequelize';

/**
 * Delivery record for every notification email this app sends (Notifications
 * checklist item #7 "track delivery status" / #8 "handle failed delivery").
 * One row per send attempt - a failed send is still logged here (status:
 * 'failed' + error_message), never silently dropped.
 */
const initializeNotificationLogModel = (sequelize) => {
    const NotificationLog = sequelize.define('NotificationLog', {
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
        user_id: {
            // Raw userbd user id of the recipient - not a local FK.
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        type: {
            type:      DataTypes.ENUM(
                'onboarding_welcome', 'invitation_accepted', 'onboarding_completion',
                'deal_update', 'territory_update', 'invitation_reminder'
            ),
            allowNull: false,
        },
        recipient_email: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        status: {
            type:         DataTypes.ENUM('sent', 'failed'),
            allowNull:    false,
            defaultValue: 'sent',
        },
        error_message: {
            type:      DataTypes.STRING(500),
            allowNull: true,
        },
    }, {
        tableName:   'notification_logs',
        timestamps:  true,
        underscored: true,
        // `underscored` only maps the DB column to snake_case - the JS/JSON
        // attribute stays `createdAt` unless renamed explicitly here, which
        // silently breaks any frontend code expecting `created_at`.
        createdAt:   'created_at',
        updatedAt:   false,
        indexes: [
            { fields: ['org_id', 'created_at'] },
            { fields: ['org_id', 'type'] },
        ],
    });

    return NotificationLog;
};

export default initializeNotificationLogModel;
