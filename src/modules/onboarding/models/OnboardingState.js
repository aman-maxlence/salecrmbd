import { DataTypes } from 'sequelize';

/**
 * Per-(org, user) onboarding wizard progress - design doc §4.3. Every
 * invitee tracks their own progress independently, even when several people
 * are onboarding into the same org at once (unique on org_id+user_id).
 */
const initializeOnboardingStateModel = (sequelize) => {
    const OnboardingState = sequelize.define('OnboardingState', {
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
        user_id: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        current_step: {
            type:         DataTypes.STRING(50),
            allowNull:    false,
            defaultValue: 'welcome',
        },
        answers: {
            type:         DataTypes.JSON,
            allowNull:    false,
            defaultValue: {},
        },
        status: {
            type:         DataTypes.ENUM('in_progress', 'completed'),
            allowNull:    false,
            defaultValue: 'in_progress',
        },
    }, {
        tableName:   'onboarding_states',
        timestamps:  true,
        underscored: true,
        indexes: [
            { fields: ['org_id', 'user_id'], unique: true },
        ],
    });

    return OnboardingState;
};

export default initializeOnboardingStateModel;
