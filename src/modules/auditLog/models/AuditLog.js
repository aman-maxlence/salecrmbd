import { DataTypes } from 'sequelize';

/**
 * Generic audit trail for sensitive actions across modules (Security &
 * Access Control checklist item #12) - distinct from `permissionAuditLog`
 * (which only ever records role/permission-matrix edits) and from
 * `OnboardingState.last_error`/request logs (operational troubleshooting,
 * not an actor-intent record). One row per action: who did what, to what,
 * and when - append-only, never updated or deleted by application code.
 */
const initializeAuditLogModel = (sequelize) => {
    const AuditLog = sequelize.define('AuditLog', {
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
        actor_user_id: {
            // Raw userbd user id of whoever performed the action - not a
            // local FK (identity lives in userbd), same convention as
            // Team.manager_user_id. Null for system-initiated actions.
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        action: {
            // e.g. 'onboarding.completed', 'invitation.created', 'integration.connected'
            type:      DataTypes.STRING(100),
            allowNull: false,
        },
        entity_type: {
            type:      DataTypes.STRING(100),
            allowNull: true,
        },
        entity_id: {
            type:      DataTypes.STRING(100),
            allowNull: true,
        },
        details: {
            type:      DataTypes.JSON,
            allowNull: true,
        },
    }, {
        tableName:   'audit_logs',
        timestamps:  true,
        underscored: true,
        // `underscored` only maps the DB column to snake_case - the JS/JSON
        // attribute stays `createdAt` unless renamed explicitly here, which
        // silently breaks any frontend code expecting `created_at`.
        createdAt:   'created_at',
        updatedAt:   false,
        indexes: [
            { fields: ['org_id', 'created_at'] },
            { fields: ['org_id', 'action'] },
        ],
    });

    return AuditLog;
};

export default initializeAuditLogModel;
