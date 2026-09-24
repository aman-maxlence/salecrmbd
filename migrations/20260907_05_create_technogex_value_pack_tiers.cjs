'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('technogex_value_pack_tiers', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            external_id: {
                type: Sequelize.STRING(36),
                allowNull: false,
            },
            value_pack_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'technogex_value_packs', key: 'id' },
                onDelete: 'CASCADE',
            },
            tier_type: {
                type: Sequelize.STRING(30),
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING(100),
                allowNull: true,
            },
            duration_external_id: {
                type: Sequelize.STRING(36),
                allowNull: true,
            },
            country_external_id: {
                type: Sequelize.STRING(36),
                allowNull: true,
            },
            original_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
            },
            current_price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
            },
            is_active: {
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

        await queryInterface.addIndex('technogex_value_pack_tiers', ['external_id'], { unique: true });
        await queryInterface.addIndex('technogex_value_pack_tiers', ['value_pack_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('technogex_value_pack_tiers');
    },
};
