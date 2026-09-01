import { DataTypes } from 'sequelize';

/**
 * A role within an org - the protected "Super Admin" row plus four editable
 * default roles (Admin/Manager/Sales Rep/Support Agent) seeded per org by
 * OrgRoleService.seedDefaultRolesForOrg, and any number of custom roles an
 * org creates afterwards (always all-permissions-false on creation - see
 * design doc §6 security requirement).
 */
const initializeOrgRoleModel = (sequelize) => {
    const OrgRole = sequelize.define('OrgRole', {
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
        role_name: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        description: {
            type:      DataTypes.TEXT,
            allowNull: true,
        },
        is_admin: {
            // True only for the protected Super Admin row - never set on
            // Admin or any custom role. Distinct from role_name so callers
            // don't need the SUPER_ADMIN_ROLE_NAME string to detect it.
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: false,
        },
        permissions: {
            type:         DataTypes.JSON,
            allowNull:    false,
            defaultValue: {},
        },
        is_default: {
            // True for the 4 seeded roles (+ Super Admin) - blocks deletion.
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: false,
        },
        status: {
            type:         DataTypes.ENUM('active', 'inactive'),
            allowNull:    false,
            defaultValue: 'active',
        },
    }, {
        tableName:   'org_roles',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id'] },
            { fields: ['org_id', 'role_name'], unique: true },
            { fields: ['status'] },
        ],
    });

    return OrgRole;
};

export default initializeOrgRoleModel;
