import { DataTypes } from 'sequelize';

const initializePackageLineItemModel = (sequelize) => {
    const PackageLineItem = sequelize.define('PackageLineItem', {
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
        package_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        sales_order_line_item_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        quantity: {
            type:      DataTypes.DECIMAL(14, 4),
            allowNull: false,
        },
    }, {
        tableName:   'package_line_items',
        timestamps:  true,
        underscored: true,
        indexes: [
            { name: 'idx_package_lines_org_package', fields: ['org_id', 'package_id'] },
        ],
    });

    return PackageLineItem;
};

export default initializePackageLineItemModel;
