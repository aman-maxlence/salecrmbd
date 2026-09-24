import { DataTypes } from 'sequelize';

const initializeSalesOrderLineItemModel = (sequelize) => {
    const SalesOrderLineItem = sequelize.define('SalesOrderLineItem', {
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
        sales_order_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        item_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
            comment:   'Null when source_type is not \'local\' - see source_type/source_ref_id.',
        },
        source_type: {
            type:         DataTypes.ENUM('local', 'technogex_product_package', 'technogex_design_item', 'technogex_value_pack_tier'),
            allowNull:    false,
            defaultValue: 'local',
        },
        source_ref_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
            comment:   'FK to the mirror table named by source_type (technogex_product_packages/technogex_design_items/technogex_value_pack_tiers.id) - resolved in application code, no single-column DB FK since it can point at three different tables.',
        },
        source_meta: {
            type:      DataTypes.JSON,
            allowNull: true,
            comment:   'Frozen snapshot of what was picked at add-time (tier name, duration, country, currency, display price) so this line stays accurate even if the mirrored catalog row later changes or is marked source_deleted_at.',
        },
        quantity: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
        unit_price: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
        tax: {
            type:         DataTypes.DECIMAL(8, 4),
            allowNull:    false,
            defaultValue: 0,
        },
        fulfilled_quantity: {
            type:         DataTypes.DECIMAL(14, 4),
            allowNull:    false,
            defaultValue: 0,
        },
    }, {
        tableName:   'sales_order_line_items',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'sales_order_id'] },
            { fields: ['org_id', 'item_id'] },
        ],
    });

    return SalesOrderLineItem;
};

export default initializeSalesOrderLineItemModel;
