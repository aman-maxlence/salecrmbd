import { DataTypes } from 'sequelize';

/**
 * A location nested inside a Warehouse - "Warehouse & Stock Location
 * Management" checklist's missing sub-location concept. Strictly
 * hierarchical (Zone > Aisle > Rack > Bin, enforced in
 * StockLocationService, not here) via a self-referencing parent, same
 * pattern as ItemCategory's parent_id.
 */
const initializeStockLocationModel = (sequelize) => {
    const StockLocation = sequelize.define('StockLocation', {
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
        warehouse_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        parent_location_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        type: {
            type:      DataTypes.ENUM('zone', 'aisle', 'rack', 'bin'),
            allowNull: false,
        },
        name: {
            type:      DataTypes.STRING(100),
            allowNull: false,
        },
        code: {
            type:      DataTypes.STRING(50),
            allowNull: true,
        },
        status: {
            type:         DataTypes.ENUM('active', 'inactive'),
            allowNull:    false,
            defaultValue: 'active',
        },
    }, {
        tableName:   'inventory_stock_locations',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'warehouse_id'] },
            { fields: ['org_id', 'parent_location_id'] },
        ],
    });

    return StockLocation;
};

export default initializeStockLocationModel;
