import { DataTypes } from 'sequelize';

/**
 * The Roles & Permissions / Onboarding source of truth for a userbd user
 * inside this org: which OrgRole they have, which Territory, and whether
 * they've finished the onboarding wizard (has_onboarded gates dashboard
 * access - design doc §4.1/§4.3).
 *
 * Deliberately independent of the existing `sales_reps` table (see
 * ../../salesRep) - that table is left untouched in this pass; reconciling
 * the two is an explicit open item (design doc §8), not done here.
 *
 * Rows are created idempotently by the webhook handlers in
 * src/modules/webhook/service/WebhookService.js, same trigger points as
 * SalesRep (SETUP_ADMIN_USER -> Super Admin role, USER_INVITE_ACCEPTED ->
 * the invited role), always starting has_onboarded: false.
 */
const initializePortalUserModel = (sequelize) => {
    const PortalUser = sequelize.define('PortalUser', {
        id: {
            type:          DataTypes.INTEGER,
            primaryKey:    true,
            autoIncrement: true,
            allowNull:     false,
        },
        user_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        org_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        role_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        territory_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        team_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        manager_id: {
            // Raw userbd user id of whoever this person reports to - not a
            // local FK (identity lives in userbd), same convention as
            // Territory.manager_user_id. Independent of Team.manager_user_id
            // (the team's official lead) - this is this specific person's
            // own "reports to", picked from their team's other members.
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type:         DataTypes.ENUM('active', 'inactive', 'suspended'),
            allowNull:    false,
            defaultValue: 'active',
        },
        has_onboarded: {
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: false,
        },
        // Dual-access preview: lets an org admin (is_dual_access=true, set
        // when their PortalUser is created - see WebhookService.handleAdminSetup)
        // flip active_context to 'user' to see the app the way a member with
        // preview_role_id's permissions would. getWithRole substitutes that
        // role in when active_context is 'user' - nothing else needs to
        // change since every permission check already reads through it.
        is_dual_access: {
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: false,
        },
        active_context: {
            type:         DataTypes.ENUM('admin', 'user'),
            allowNull:    false,
            defaultValue: 'admin',
        },
        preview_role_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName:   'portal_users',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['user_id', 'org_id'], unique: true },
            { fields: ['org_id'] },
            { fields: ['role_id'] },
            { fields: ['team_id'] },
        ],
    });

    return PortalUser;
};

export default initializePortalUserModel;
