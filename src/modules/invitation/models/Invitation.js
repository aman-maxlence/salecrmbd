import { DataTypes } from 'sequelize';

/**
 * A pending/accepted/revoked invite into this org. Mirrors maxpmbd's
 * Invitation shape 1:1 (design doc §3.2): the token and its 7-day expiry are
 * entirely userbd's responsibility (see InvitationService.createInvitation's
 * call out to userbd) - this row only tracks the local role/territory
 * assignment and userbd's invite id for reference, so there's deliberately
 * no local token/expires_at column and no 'expired' status.
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
        created_by: {
            type:      DataTypes.INTEGER,
            allowNull: false,
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
