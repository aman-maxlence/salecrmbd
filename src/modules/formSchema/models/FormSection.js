import { DataTypes } from 'sequelize';

/**
 * One group of fields on a module's form - can nest under another section
 * of the *same* entity_type via parent_section_id, and can be conditional
 * on another field's current value via visibility_rule, e.g.
 * `{ fieldKey: 'item_type', operator: 'equals', value: 'goods' }`.
 */
const initializeFormSectionModel = (sequelize) => {
    const FormSection = sequelize.define('FormSection', {
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
            comment:   'Which module\'s form this belongs to, e.g. "inventory_item" - see the per-entity seed schema under formSchema/schemas.',
        },
        parent_section_id: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        heading: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
        description: {
            type:      DataTypes.TEXT,
            allowNull: true,
        },
        position: {
            type:         DataTypes.INTEGER,
            allowNull:    false,
            defaultValue: 0,
        },
        visibility_rule: {
            type:      DataTypes.JSON,
            allowNull: true,
        },
    }, {
        tableName:   'form_sections',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'entity_type'] },
            { fields: ['org_id', 'entity_type', 'parent_section_id'] },
        ],
    });

    return FormSection;
};

export default initializeFormSectionModel;
