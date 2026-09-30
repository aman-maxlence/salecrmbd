import { DataTypes } from 'sequelize';

/**
 * Records a builtin field an org explicitly deleted from its form, so
 * `FormSchemaService._syncMissingBuiltinFields` - which otherwise
 * auto-backfills any registry field an org is "missing" - knows not to
 * silently re-add it on the next schema fetch. Custom (is_builtin: false)
 * fields never need this: deleting one just removes its row, and nothing
 * ever re-creates a custom field from a registry.
 */
const initializeFormFieldExclusionModel = (sequelize) => {
    const FormFieldExclusion = sequelize.define('FormFieldExclusion', {
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
        field_key: {
            type:      DataTypes.STRING(100),
            allowNull: false,
        },
    }, {
        tableName:   'form_field_exclusions',
        timestamps:  true,
        underscored: true,
        updatedAt:   false,
        indexes: [
            { fields: ['org_id', 'entity_type', 'field_key'], unique: true },
        ],
    });

    return FormFieldExclusion;
};

export default initializeFormFieldExclusionModel;
