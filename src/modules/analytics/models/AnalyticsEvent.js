import { DataTypes } from 'sequelize';

/**
 * Raw onboarding event capture (Analytics & Tracking checklist) - append-
 * only, one row per event. Deliberately just data collection: no
 * aggregation/dashboard is built on top of this yet, but every event
 * needed to compute drop-off-by-step or completion-rate later is captured
 * here (`event_type` + `step` + `org_id`/`user_id` is enough to derive both
 * with a simple query against this table).
 */
const initializeAnalyticsEventModel = (sequelize) => {
    const AnalyticsEvent = sequelize.define('AnalyticsEvent', {
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
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        event_type: {
            // e.g. 'onboarding_started', 'screen_viewed', 'step_completed',
            // 'step_skipped', 'validation_error', 'integration_failed',
            // 'invitation_created', 'onboarding_completed'
            type:      DataTypes.STRING(100),
            allowNull: false,
        },
        step: {
            type:      DataTypes.STRING(50),
            allowNull: true,
        },
        details: {
            type:      DataTypes.JSON,
            allowNull: true,
        },
    }, {
        tableName:   'analytics_events',
        timestamps:  true,
        underscored: true,
        // `underscored` only maps the DB column to snake_case - the JS/JSON
        // attribute stays `createdAt` unless renamed explicitly here, which
        // silently breaks any frontend code expecting `created_at`.
        createdAt:   'created_at',
        updatedAt:   false,
        indexes: [
            { fields: ['org_id', 'event_type'] },
            { fields: ['org_id', 'user_id', 'created_at'] },
        ],
    });

    return AnalyticsEvent;
};

export default initializeAnalyticsEventModel;
