import initializeFormSectionModel from './FormSection.js';
import initializeFormFieldDefinitionModel from './FormFieldDefinition.js';
import initializeFormFieldValueModel from './FormFieldValue.js';

export const initializeFormSchemaModels = (sequelize) => {
    const FormSection = initializeFormSectionModel(sequelize);
    const FormFieldDefinition = initializeFormFieldDefinitionModel(sequelize);
    const FormFieldValue = initializeFormFieldValueModel(sequelize);

    return {
        FormSection,
        FormFieldDefinition,
        FormFieldValue,
    };
};

export default initializeFormSchemaModels;
