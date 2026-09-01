class PermissionAuditLogService {
    constructor(models) {
        this.models = models;
    }

    async record(orgId, roleId, changedBy, changeType, before, after, { transaction } = {}) {
        const { PermissionAuditLog } = this.models;
        return PermissionAuditLog.create(
            {
                org_id: orgId,
                role_id: roleId,
                changed_by: changedBy,
                change_type: changeType,
                before_json: before ?? null,
                after_json: after ?? null,
            },
            { ...(transaction && { transaction }) }
        );
    }

    async listForRole(orgId, roleId) {
        const { PermissionAuditLog } = this.models;
        return PermissionAuditLog.findAll({
            where: { org_id: orgId, role_id: roleId },
            order: [['created_at', 'DESC']],
        });
    }
}

export default PermissionAuditLogService;
