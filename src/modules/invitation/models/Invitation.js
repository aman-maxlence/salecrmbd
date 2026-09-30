import { DataTypes } from 'sequelize';

/**
 * A pending/accepted/revoked invite into this org. Mirrors maxpmbd's
 * Invitation shape 1:1 (design doc §3.2): the token and its 7-day expiry are
 * entirely userbd's responsibility (see InvitationService.createInvitation's
 * call out to userbd) - this row only tracks the local role/territory
 * assignment and userbd's invite id for reference, so there's deliberately
 * no local expires_at column and no 'expired' status (see is_expired,
 * computed from created_at instead).
 *
 * `invite_url` IS stored here (as opaque display data, not re-derived) so an
 * admin can copy/share the accept-invite link directly instead of relying
 * solely on userbd's best-effort invite email landing in the invitee's
 * inbox - the same URL userbd already emails them.
 */
const initializeInvitationModel = (sequelize) => {
    const Invitation = sequelize.define('Invitation', {
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
        email: {
            type:      DataTypes.STRING(255),
            allowNull: false,
            validate:  { isEmail: true },
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
        invitee_name: {
            // Optional - the invitee always supplies their own real name on
            // About You anyway, this just lets the inviter label the row
            // before it's accepted.
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        status: {
            type:         DataTypes.ENUM('pending', 'accepted', 'revoked'),
            allowNull:    false,
            defaultValue: 'pending',
        },
        user_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        user_service_invite_id: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        invite_url: {
            type:      DataTypes.STRING(500),
            allowNull: true,
        },
        created_by: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        reminder_count: {
            // "Send invitation reminders where applicable" - how many nudge
            // emails this still-pending invite has had (auto or manual).
            type:         DataTypes.INTEGER,
            allowNull:    false,
            defaultValue: 0,
        },
        last_reminder_sent_at: {
            type:      DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName:   'invitations',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'email'] },
            { fields: ['user_service_invite_id'] },
        ],
    });

    return Invitation;
};

export default initializeInvitationModel;
