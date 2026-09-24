import { DataTypes } from 'sequelize';
import { FORM_FIELD_TYPES } from '../constants.js';

/**
 * One field on a module's form. `is_builtin` is the key distinction:
 * - true  - the field maps to a real column on the entity's own table
 *           (e.g. InventoryItem.sku). Only label/required/visible/position/
 *           section/visibility_rule are admin-editable here; field_type and
 *           field_key are fixed at seed time to match the real column, and
 *           the row can be hidden but never deleted (see FormSchemaService).
 * - false - a genuinely custom field with no backing column. Its values are
 *           stored in FormFieldValue (EAV), validated against field_type/
 *           required by FormSchemaService before anything is persisted.
 */
const initializeFormFieldDefinitionModel = (sequelize) => {
    const FormFieldDefinition = sequelize.define('FormFieldDefinition', {
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
        section_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
            comment:   'Null means "unassigned" - a builtin field waiting to be placed into a section an admin creates (see FormSchemaService.getUnassignedFields).',
        },
        field_key: {
            type:      DataTypes.STRING(100),
            allowNull: false,
        },
        label: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        field_type: {
            type:      DataTypes.ENUM(...FORM_FIELD_TYPES),
            allowNull: false,
        },
        required: {
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: false,
        },
        visible: {
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: true,
        },
        position: {
            type:         DataTypes.INTEGER,
            allowNull:    false,
            defaultValue: 0,
        },
        options: {
            type:      DataTypes.JSON,
            allowNull: true,
            comment:   'Array of choice strings - required for select/radio/checkbox.',
        },
        visibility_rule: {
            type:      DataTypes.JSON,
            allowNull: true,
        },
        is_builtin: {
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: false,
        },
    }, {
        tableName:   'form_field_definitions',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'entity_type', 'field_key'], unique: true },
            { fields: ['org_id', 'entity_type', 'section_id', 'position'] },
        ],
    });

    return FormFieldDefinition;
};

export default initializeFormFieldDefinitionModel;
