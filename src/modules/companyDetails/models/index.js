import initializeCompanyDetailsModel from './CompanyDetails.js';

export const initializeCompanyDetailsModels = (sequelize) => {
    const CompanyDetails = initializeCompanyDetailsModel(sequelize);
    return { CompanyDetails };
};

export default initializeCompanyDetailsModels;
