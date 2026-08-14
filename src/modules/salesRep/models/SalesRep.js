import { DataTypes } from 'sequelize';

/**
 * Local mirror of a userbd user, scoped to this org, inside Sale CRM.
 * Mirrors maxpmbd's `portal_users` pattern: userbd owns identity/auth, but
 * every product keeps its own local row per (user_id, org_id) so in-product
 * foreign keys (Deal/Incentive assignee
 * fields) point at a local id instead of the raw external user id - the same
 * way maxpmbd's TaskAssignee.portalUserId references portal_users.id.
 *
 * Rows here are created by the webhook handlers in
 * src/modules/webhook/service/WebhookService.js when userbd notifies this
 * service of a registration (SETUP_ADMIN_USER) or invite acceptance
 * (USER_INVITE_ACCEPTED) - see ../../webhook/service/WebhookService.js.
 */
const initializeSalesRepModel = (sequelize) => {
    const SalesRep = sequelize.define('SalesRep', {
        id: {
            type:          DataTypes.INTEGER,
            primaryKey:    true,
            autoIncrement: true,
            allowNull:     false,
        },
        user_id: {
            // Raw user id from userbd - the only place this ever appears;
            // everything else in this service should join through this row.
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        org_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        role: {
            // Mirrors userbd's OrgUser.role at the moment of sync (admin who
            // self-registered, or a regular invited member). Not kept live
            // in sync after that - re-sync on next webhook event if needed.
            type:         DataTypes.ENUM('admin', 'member'),
            allowNull:    false,
            defaultValue: 'member',
        },
        status: {
            type:         DataTypes.ENUM('active', 'inactive'),
            allowNull:    false,
            defaultValue: 'active',
        },
        metadata: {
            type:         DataTypes.JSON,
            allowNull:    true,
            defaultValue: {},
        },
    }, {
        tableName:   'sales_reps',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['user_id', 'org_id'], unique: true },
            { fields: ['org_id'] },
        ],
    });

    return SalesRep;
};

export default initializeSalesRepModel;
