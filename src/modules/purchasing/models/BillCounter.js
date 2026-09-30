import { DataTypes } from 'sequelize';

/**
 * One row per org, incremented with a row lock inside the same transaction
 * that creates a Bill - unlike InventorySettings.sku_next_number (which has
 * a documented, accepted race between reading/writing the counter and the
 * row it names), this counter is never read/written outside a transaction
 * that also holds the lock, so two concurrent PO receipts can't collide on
 * the same bill_number.
 */
const initializeBillCounterModel = (sequelize) => {
    const BillCounter = sequelize.define('BillCounter', {
        org_id: {
            type:          DataTypes.INTEGER,
            primaryKey:    true,
            allowNull:     false,
        },
        next_number: {
            type:         DataTypes.INTEGER,
            allowNull:    false,
            defaultValue: 1,
        },
    }, {
        tableName:   'bill_counters',
        timestamps:  true,
        underscored: true,
    });

    return BillCounter;
};

export default initializeBillCounterModel;
