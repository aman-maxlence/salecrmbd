import { DataTypes } from 'sequelize';

/**
 * A single, reusable, non-email-bound join link per org (Slack-style
 * "Invite with a link") - the CRM-side counterpart of Invitation.js.
 * userbd owns the actual token/domain-check/account-creation (see its
 * OrgInviteLink model); this row only tracks the local role/territory
 * assignment given to whoever joins via the link, mirroring exactly how
 * Invitation tracks role/territory for userbd's per-email Invite.
 */
const initializeInviteLinkModel = (sequelize) => {
    const InviteLink = sequelize.define('InviteLink', {
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
        territory_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type:         DataTypes.ENUM('active', 'revoked'),
            allowNull:    false,
            defaultValue: 'active',
        },
        user_service_link_token: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        created_by: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
    }, {
        tableName:   'invite_links',
        timestamps:  true,
        underscored: true,
        // A field-level `unique: true` (rather than a named index here)
        // isn't reliably diffed by Sequelize's MySQL sync on every
        // `sync({ alter: true })` restart - it can silently add a new
        // duplicate index each time until MySQL's 64-key-per-table limit is
        // hit (this happened - see the cleanup migration/notes). Declaring
        // it as an index instead is stable across restarts.
        indexes: [
            { fields: ['org_id'], unique: true },
            { fields: ['user_service_link_token'] },
        ],
    });

    return InviteLink;
};

export default initializeInviteLinkModel;
