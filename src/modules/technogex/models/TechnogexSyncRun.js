import { DataTypes } from 'sequelize';

/** One row per TechnogexSyncService run - the admin-visible sync log/status source. */
const initializeTechnogexSyncRunModel = (sequelize) => {
    const TechnogexSyncRun = sequelize.define('TechnogexSyncRun', {
        id: {
            type:          DataTypes.INTEGER,
            primaryKey:    true,
            autoIncrement: true,
            allowNull:     false,
        },
        family: {
            type:      DataTypes.ENUM('products', 'design_items', 'value_packs', 'all'),
            allowNull: false,
        },
        status: {
            type:         DataTypes.ENUM('running', 'success', 'partial', 'failed'),
            allowNull:    false,
            defaultValue: 'running',
        },
        started_at: {
            type:      DataTypes.DATE,
            allowNull: false,
        },
        finished_at: {
            type:      DataTypes.DATE,
            allowNull: true,
        },
        fetched_count: {
            type:         DataTypes.INTEGER,
            allowNull:    false,
            defaultValue: 0,
        },
        upserted_count: {
            type:         DataTypes.INTEGER,
            allowNull:    false,
            defaultValue: 0,
        },
        soft_deleted_count: {
            type:         DataTypes.INTEGER,
            allowNull:    false,
            defaultValue: 0,
        },
        error_message: {
            type:      DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName:   'technogex_sync_runs',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['family', 'started_at'] },
        ],
    });

    return TechnogexSyncRun;
};

export default initializeTechnogexSyncRunModel;
