import initializeDepartmentModel from './Department.js';

export const initializeDepartmentModels = (sequelize) => {
    const Department = initializeDepartmentModel(sequelize);
    return { Department };
};

export default initializeDepartmentModels;
