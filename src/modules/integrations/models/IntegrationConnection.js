import { DataTypes } from 'sequelize';

/**
 * One org's connection to one third-party provider (Integration Setup
 * checklist). `access_token`/`refresh_token` are stored encrypted
 * (CryptoHelper) - never read/write them directly, always through
 * IntegrationService. `provider_key` is not a DB enum on purpose - new
 * providers are added purely in constants/providers.js, no migration needed.
 */
const initializeIntegrationConnectionModel = (sequelize) => {
    const IntegrationConnection = sequelize.define('IntegrationConnection', {
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
        provider_key: {
            type:      DataTypes.STRING(100),
            allowNull: false,
        },
        status: {
            type:         DataTypes.ENUM('connected', 'disconnected', 'failed'),
            allowNull:    false,
            defaultValue: 'connected',
        },
        external_account_id: {
            // Whatever identifies the connected account on the provider's
            // side (email, team id, workspace id) - display-only.
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        access_token: {
            type:      DataTypes.TEXT,
            allowNull: true,
        },
        refresh_token: {
            type:      DataTypes.TEXT,
            allowNull: true,
        },
        token_expires_at: {
            type:      DataTypes.DATE,
            allowNull: true,
        },
        connected_by_user_id: {
            // Raw userbd user id - not a local FK (identity lives in userbd),
            // same convention as Team.manager_user_id.
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        last_error: {
            type:      DataTypes.JSON,
            allowNull: true,
        },
    }, {
        tableName:   'integration_connections',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'provider_key'], unique: true },
        ],
    });

    return IntegrationConnection;
};

export default initializeIntegrationConnectionModel;
