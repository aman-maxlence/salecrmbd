import { DataTypes } from 'sequelize';

/**
 * One row per browser/device a user has enabled push notifications on
 * (Settings > My Profile / onboarding's "Browser push notifications"
 * toggle - see PushService). A user can have more than one (different
 * browsers/devices), so this is many-to-one against (org_id, user_id), not
 * unique on the pair - uniqueness is on the endpoint itself, enforced at
 * the service layer (findOrCreate) rather than a DB constraint, since a
 * push endpoint URL is too long for a reliable unique index across MySQL
 * charsets/row formats.
 */
const initializePushSubscriptionModel = (sequelize) => {
    const PushSubscription = sequelize.define('PushSubscription', {
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
            // Raw userbd user id, same convention as NotificationLog.user_id.
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        endpoint: {
            type:      DataTypes.STRING(500),
            allowNull: false,
        },
        p256dh: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        auth: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
    }, {
        tableName:   'push_subscriptions',
        timestamps:  true,
        underscored: true,
        createdAt:   'created_at',
        updatedAt:   false,
        indexes: [
            { fields: ['org_id', 'user_id'] },
        ],
    });

    return PushSubscription;
};

export default initializePushSubscriptionModel;
