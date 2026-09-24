'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('technogex_value_packs', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            external_id: {
                type: Sequelize.STRING(36),
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            slug: {
                type: Sequelize.STRING(255),
                allowNull: true,
            },
            active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            source_deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
        });

        await queryInterface.addIndex('technogex_value_packs', ['external_id'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('technogex_value_packs');
    },
};
