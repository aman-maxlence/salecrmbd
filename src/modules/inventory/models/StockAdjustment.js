import { DataTypes } from 'sequelize';

const initializeStockAdjustmentModel = (sequelize) => {
    const StockAdjustment = sequelize.define('StockAdjustment', {
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
        item_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        type: {
            type:      DataTypes.ENUM('receive', 'issue', 'transfer'),
            allowNull: false,
        },
        quantity: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
        from_warehouse_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        to_warehouse_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        reason: {
            type:      DataTypes.STRING(500),
            allowNull: true,
        },
        // What date this movement is meant to represent (e.g. "opening stock
        // as of Jan 1") - separate from created_at (when the row was actually
        // entered). Display-only, defaults to today when not given.
        effective_date: {
            type:      DataTypes.DATEONLY,
            allowNull: true,
        },
        reference_type: {
            type:      DataTypes.STRING(50),
            allowNull: true,
            comment:   'e.g. "purchase_order" / "sales_order" - what caused this movement',
        },
        reference_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        reference_number: {
            type:      DataTypes.STRING(50),
            allowNull: true,
        },
        // Freeform note distinct from `reason` (which is often a short,
        // structured category like "Damaged"/"Lost" in the UI) - lets a user
        // add real context without overloading that field's meaning.
        notes: {
            type:      DataTypes.STRING(500),
            allowNull: true,
        },
        // Only meaningful for type='receive' - which shelf location within
        // the warehouse this receipt was placed at, mirroring opening
        // stock's own location picker.
        location_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type:         DataTypes.ENUM('draft', 'applied'),
            allowNull:    false,
            defaultValue: 'applied',
            comment:      'draft rows are recorded but have not moved stock yet - see StockService.createDraftAdjustment/applyAdjustment',
        },
        created_by: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName:   'inventory_stock_adjustments',
        timestamps:  true,
        underscored: true,
        updatedAt:   false,
        indexes: [
            { fields: ['org_id', 'item_id'] },
            { fields: ['org_id', 'created_at'] },
        ],
    });

    return StockAdjustment;
};

export default initializeStockAdjustmentModel;
