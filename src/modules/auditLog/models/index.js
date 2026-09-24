import initializeAuditLogModel from './AuditLog.js';

export const initializeAuditLogModels = (sequelize) => {
    const AuditLog = initializeAuditLogModel(sequelize);
    return { AuditLog };
};

export default initializeAuditLogModels;
