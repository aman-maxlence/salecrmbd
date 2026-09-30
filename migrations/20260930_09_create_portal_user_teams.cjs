'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();
        if (!tables.includes('portal_user_teams')) {
            await queryInterface.createTable('portal_user_teams', {
                id: {
                    type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false,
                },
                org_id: { type: Sequelize.INTEGER, allowNull: false },
                portal_user_id: { type: Sequelize.INTEGER, allowNull: false },
                team_id: { type: Sequelize.INTEGER, allowNull: false },
                created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
                updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            });
            await queryInterface.addIndex('portal_user_teams', ['org_id', 'portal_user_id', 'team_id'], {
                name: 'portal_user_teams_org_user_team', unique: true,
            });
            await queryInterface.addIndex('portal_user_teams', ['org_id', 'team_id'], {
                name: 'portal_user_teams_org_team',
            });
        }

        const bpTable = await queryInterface.describeTable('business_preferences');
        if (!bpTable.allow_multiple_teams) {
            await queryInterface.addColumn('business_preferences', 'allow_multiple_teams', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable('portal_user_teams');
        await queryInterface.removeColumn('business_preferences', 'allow_multiple_teams');
    },
};
