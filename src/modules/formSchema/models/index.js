import initializeFormSectionModel from './FormSection.js';
import initializeFormFieldDefinitionModel from './FormFieldDefinition.js';
import initializeFormFieldValueModel from './FormFieldValue.js';
import initializeFormFieldExclusionModel from './FormFieldExclusion.js';

export const initializeFormSchemaModels = (sequelize) => {
    const FormSection = initializeFormSectionModel(sequelize);
    const FormFieldDefinition = initializeFormFieldDefinitionModel(sequelize);
    const FormFieldValue = initializeFormFieldValueModel(sequelize);
    const FormFieldExclusion = initializeFormFieldExclusionModel(sequelize);

    return {
        FormSection,
        FormFieldDefinition,
        FormFieldValue,
        FormFieldExclusion,
    };
};

export default initializeFormSchemaModels;
