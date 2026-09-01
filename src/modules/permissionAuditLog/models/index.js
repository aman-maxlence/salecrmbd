import initializePermissionAuditLogModel from './PermissionAuditLog.js';

export const initializePermissionAuditLogModels = (sequelize) => {
    const PermissionAuditLog = initializePermissionAuditLogModel(sequelize);
    return { PermissionAuditLog };
};

export default initializePermissionAuditLogModels;
