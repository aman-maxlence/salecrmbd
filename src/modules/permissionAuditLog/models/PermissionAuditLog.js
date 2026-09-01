import { DataTypes } from 'sequelize';

/**
 * One row per role/permission change (design doc §3.1/§3.2 - new vs.
 * maxpmbd, which has no equivalent). Written by OrgRoleService alongside
 * every create/update/delete so QA's "audit log records every change with
 * correct before/after values" requirement (§5) has something to check.
 * role_id is intentionally not a hard FK - a role can be deleted after its
 * trail is written, and the trail must outlive it.
 */
const initializePermissionAuditLogModel = (sequelize) => {
    const PermissionAuditLog = sequelize.define('PermissionAuditLog', {
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
        role_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        changed_by: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        change_type: {
            type:      DataTypes.ENUM('create_role', 'update_role', 'update_permissions', 'delete_role'),
            allowNull: false,
        },
        before_json: {
            type:      DataTypes.JSON,
            allowNull: true,
        },
        after_json: {
            type:      DataTypes.JSON,
            allowNull: true,
        },
    }, {
        tableName:   'permission_audit_logs',
        timestamps:  true,
        underscored: true,
        updatedAt:   false,
        indexes: [
            { fields: ['org_id', 'role_id'] },
        ],
    });

    return PermissionAuditLog;
};

export default initializePermissionAuditLogModel;
