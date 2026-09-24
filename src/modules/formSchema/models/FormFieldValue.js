import { DataTypes } from 'sequelize';

/**
 * A custom (non-builtin) field's stored value for one entity row. `entity_id`
 * is a loosely-coupled reference (no DB-level FK) - it can point at
 * inventory_items.id today and, say, deals.id tomorrow, depending on
 * `entity_type`, the same "app-validated reference, not a rigid FK" pattern
 * already used elsewhere in this codebase (e.g. SalesOrder.deal_id).
 */
const initializeFormFieldValueModel = (sequelize) => {
    const FormFieldValue = sequelize.define('FormFieldValue', {
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
        entity_type: {
            type:      DataTypes.STRING(100),
            allowNull: false,
        },
        entity_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        field_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        value: {
            type:      DataTypes.JSON,
            allowNull: true,
        },
    }, {
        tableName:   'form_field_values',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'entity_type', 'entity_id'] },
            { fields: ['entity_type', 'entity_id', 'field_id'], unique: true },
        ],
    });

    return FormFieldValue;
};

export default initializeFormFieldValueModel;
