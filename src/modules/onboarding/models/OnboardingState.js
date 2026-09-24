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
        last_error: {
            // Set when a step genuinely fails (an unexpected/server-side
            // error, not a normal 4xx validation rejection like "name is
            // required") - {step, message, occurredAt}. Cleared on the next
            // successful save/skip/complete. Distinct from a validation
            // error, which is just shown as a toast and never persisted.
            type:         DataTypes.JSON,
            allowNull:    true,
            defaultValue: null,
        },
        completed_at: {
            // The real completion moment - distinct from `updated_at`
            // (Sequelize's generic timestamp), which changes on every
            // later save to this same row (e.g. a future last_error write)
            // and would silently corrupt any attempt to infer completion
            // time from it.
            type:      DataTypes.DATE,
            allowNull: true,
        },
        abandoned_tracked_at: {
            // Set by the abandonment sweep job (see OnboardingService.
            // runAbandonmentSweep) the first time this still-in_progress row
            // goes stale - prevents re-tracking the same abandonment every
            // sweep. Cleared on the next real step save, so a user who
            // resumes and later abandons again gets tracked a second time.
            type:      DataTypes.DATE,
            allowNull: true,
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
