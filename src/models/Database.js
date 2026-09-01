import { Sequelize } from 'sequelize';
import config from '../config/config.js';
import { Logger } from '../utils/index.js';
import initializeRelationships from './relationships.js';
import { Redis } from '../modules/redis/index.js';

let sequelize = null;

const Database = {
    async initialize() {
        try {
            sequelize = new Sequelize(
                config.database.database,
                config.database.username,
                config.database.password,
                {
                    host: config.database.host,
                    port: config.database.port,
                    dialect: config.database.dialect,
                    logging: false,
                    timezone: config.database.timezone,
                    define: { indexes: [] },
                    ...(config.database.ssl && {
                        dialectOptions: { ssl: { rejectUnauthorized: false } },
                    }),
                }
            );

            await sequelize.authenticate();
            Logger.info('SQL Database connection authenticated');

            await Redis.connect();
            Logger.info('Redis cache connection authenticated');

            return sequelize;
        } catch (error) {
            Logger.error('Database connection failed:', error.message);
            throw error;
        }
    },

    /**
     * Sync all models. Add each new module's `initialize<Module>Models`
     * import here as new modules (Deals, Tasks, Meetings, Incentive,
     * Tickets, Reports, Dashboard) are built out, following the Sales Rep
     * module's pattern below.
     */
    async sync() {
        try {
            const { initializeSalesRepModels } = await import('../modules/salesRep/models/index.js');
            const salesRepModels = initializeSalesRepModels(sequelize);

            const { initializeOrgRoleModels } = await import('../modules/orgRole/models/index.js');
            const orgRoleModels = initializeOrgRoleModels(sequelize);

            const { initializeTerritoryModels } = await import('../modules/territory/models/index.js');
            const territoryModels = initializeTerritoryModels(sequelize);

            const { initializeDepartmentModels } = await import('../modules/department/models/index.js');
            const departmentModels = initializeDepartmentModels(sequelize);

            const { initializeTeamModels } = await import('../modules/team/models/index.js');
            const teamModels = initializeTeamModels(sequelize);

            const { initializeWorkspaceSettingsModels } = await import('../modules/workspaceSettings/models/index.js');
            const workspaceSettingsModels = initializeWorkspaceSettingsModels(sequelize);

            const { initializePortalUserModels } = await import('../modules/portalUser/models/index.js');
            const portalUserModels = initializePortalUserModels(sequelize);

            const { initializeInvitationModels } = await import('../modules/invitation/models/index.js');
            const invitationModels = initializeInvitationModels(sequelize);

            const { initializeInviteLinkModels } = await import('../modules/inviteLink/models/index.js');
            const inviteLinkModels = initializeInviteLinkModels(sequelize);

            const { initializePermissionAuditLogModels } = await import('../modules/permissionAuditLog/models/index.js');
            const permissionAuditLogModels = initializePermissionAuditLogModels(sequelize);

            const { initializeOnboardingModels } = await import('../modules/onboarding/models/index.js');
            const onboardingModels = initializeOnboardingModels(sequelize);

            const { initializeInventoryModels } = await import('../modules/inventory/models/index.js');
            const inventoryModels = initializeInventoryModels(sequelize);

            const { initializeDealModels } = await import('../modules/deal/models/index.js');
            const dealModels = initializeDealModels(sequelize);

            const models = {
                ...salesRepModels,
                ...orgRoleModels,
                ...territoryModels,
                ...departmentModels,
                ...teamModels,
                ...workspaceSettingsModels,
                ...portalUserModels,
                ...invitationModels,
                ...inviteLinkModels,
                ...permissionAuditLogModels,
                ...onboardingModels,
                ...inventoryModels,
                ...dealModels,
            };

            this._models = models;
            initializeRelationships(models);

            await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
            if (config.database.syncAlter) {
                await sequelize.sync({ alter: true });
                Logger.info('Database models synchronized');
            } else {
                Logger.info('Database sync skipped (DB_SYNC_ALTER is not true)');
            }
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
            Logger.info('Database models initialized and relationships configured');
        } catch (error) {
            Logger.error('Database sync failed:', error.message);
            throw error;
        }
    },

    getInstance() {
        if (!sequelize) {
            throw new Error('Database not initialized. Call Database.initialize() first.');
        }
        return sequelize;
    },

    getModels() {
        if (!sequelize) {
            throw new Error('Database not initialized. Call Database.initialize() first.');
        }
        return sequelize.models;
    },

    getRedis() {
        return Redis.getClient();
    },

    async close() {
        try {
            if (sequelize) {
                await sequelize.close();
                Logger.info('SQL Database connection closed');
            }
            await Redis.disconnect();
            Logger.info('Redis connection closed');
        } catch (error) {
            Logger.error('Error closing database connections:', error.message);
        }
    },
};

export default Database;
