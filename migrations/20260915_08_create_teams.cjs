'use strict';

/**
 * `teams` previously had no migration at all - it only ever existed via
 * Sequelize's dev-time `sync({ alter: true })`. This is the baseline for a
 * fresh environment, and also fixes the unique index for an environment
 * (like this one) where the table already exists: department is now the
 * direct parent (org hierarchy Country -> Territory -> Department -> Team),
 * so team names are unique per-department, not org-wide.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();

        if (!tables.includes('teams')) {
            await queryInterface.createTable('teams', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                org_id: { type: Sequelize.INTEGER, allowNull: false },
                department_id: { type: Sequelize.INTEGER, allowNull: false },
                territory_id: { type: Sequelize.INTEGER, allowNull: false },
                name: { type: Sequelize.STRING(255), allowNull: false },
                description: { type: Sequelize.TEXT, allowNull: true },
                manager_user_id: { type: Sequelize.INTEGER, allowNull: true },
                status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
                created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
                updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
            });

            await queryInterface.addIndex('teams', ['org_id']);
            await queryInterface.addIndex('teams', ['department_id']);
            await queryInterface.addIndex('teams', ['territory_id']);
            await queryInterface.addIndex('teams', ['org_id', 'department_id', 'name'], { unique: true });
            return;
        }

        // Table already existed (dev auto-sync) - just fix the unique index.
        const indexes = await queryInterface.showIndex('teams');
        const oldUnique = indexes.find((idx) => idx.unique && idx.fields?.length === 2
            && idx.fields.some((f) => f.attribute === 'org_id') && idx.fields.some((f) => f.attribute === 'name'));
        if (oldUnique) {
            await queryInterface.removeIndex('teams', oldUnique.name);
        }
        if (!indexes.some((idx) => idx.name === 'teams_org_id_department_id_name')) {
            await queryInterface.addIndex('teams', ['org_id', 'department_id', 'name'], {
                name: 'teams_org_id_department_id_name',
                unique: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable('teams');
    },
};
