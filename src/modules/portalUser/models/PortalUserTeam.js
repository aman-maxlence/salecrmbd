import { DataTypes } from 'sequelize';

/**
 * Supplementary team memberships, on top of PortalUser.team_id (the
 * "primary" team, which keeps working exactly as before). Only usable when
 * an org has BusinessPreferences.allow_multiple_teams turned on - see
 * PortalUserService.setAdditionalTeams. First many-to-many join table in
 * this codebase; still carries its own `id`, matching every other table
 * here, rather than a bare two-FK link table.
 */
const initializePortalUserTeamModel = (sequelize) => {
    const PortalUserTeam = sequelize.define('PortalUserTeam', {
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
        portal_user_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        team_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
    }, {
        tableName:   'portal_user_teams',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'portal_user_id', 'team_id'], unique: true },
            { fields: ['org_id', 'team_id'] },
        ],
    });

    return PortalUserTeam;
};

export default initializePortalUserTeamModel;
