'use strict';

/**
 * Org hierarchy restructure: Department now nests under exactly one
 * Territory (Country -> Territory -> Department -> Team). NOT NULL is safe
 * here because this ships alongside a one-off cleanup of all existing
 * Territory/Department/Team test data (see project notes) - there are no
 * pre-existing department rows left to violate the constraint.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('departments');
        if (!table.territory_id) {
            await queryInterface.addColumn('departments', 'territory_id', {
                type: Sequelize.INTEGER,
                allowNull: false,
            });
        }

        const indexes = await queryInterface.showIndex('departments');
        if (!indexes.some((idx) => idx.name === 'departments_territory_id')) {
            await queryInterface.addIndex('departments', ['territory_id'], { name: 'departments_territory_id' });
        }

        // Old org-wide unique (org_id, name) no longer holds - the same
        // department name can now exist under different territories.
        const oldUnique = indexes.find((idx) => idx.unique && idx.fields?.length === 2
            && idx.fields.some((f) => f.attribute === 'org_id') && idx.fields.some((f) => f.attribute === 'name'));
        if (oldUnique) {
            await queryInterface.removeIndex('departments', oldUnique.name);
        }
        if (!indexes.some((idx) => idx.name === 'departments_org_id_territory_id_name')) {
            await queryInterface.addIndex('departments', ['org_id', 'territory_id', 'name'], {
                name: 'departments_org_id_territory_id_name',
                unique: true,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('departments', 'departments_org_id_territory_id_name');
        await queryInterface.removeIndex('departments', 'departments_territory_id');
        await queryInterface.removeColumn('departments', 'territory_id');
    },
};
