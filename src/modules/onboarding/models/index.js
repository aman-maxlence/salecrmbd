import initializeOnboardingStateModel from './OnboardingState.js';

export const initializeOnboardingModels = (sequelize) => {
    const OnboardingState = initializeOnboardingStateModel(sequelize);
    return { OnboardingState };
};

export default initializeOnboardingModels;
