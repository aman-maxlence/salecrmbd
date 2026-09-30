'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();

        if (!tables.includes('bills')) {
            await queryInterface.createTable('bills', {
                id: {
                    type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false,
                },
                org_id: { type: Sequelize.INTEGER, allowNull: false },
                vendor_id: { type: Sequelize.INTEGER, allowNull: false },
                purchase_order_id: { type: Sequelize.INTEGER, allowNull: false },
                bill_number: { type: Sequelize.STRING(30), allowNull: false },
                bill_date: { type: Sequelize.DATEONLY, allowNull: false },
                due_date: { type: Sequelize.DATEONLY, allowNull: true },
                amount: { type: Sequelize.DECIMAL(14, 4), allowNull: false, defaultValue: 0 },
                paid_amount: { type: Sequelize.DECIMAL(14, 4), allowNull: false, defaultValue: 0 },
                status: {
                    type: Sequelize.ENUM('unpaid', 'partially_paid', 'paid', 'void'),
                    allowNull: false,
                    defaultValue: 'unpaid',
                },
                notes: { type: Sequelize.STRING(1000), allowNull: true },
                created_by: { type: Sequelize.INTEGER, allowNull: true },
                created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
                updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            });
            await queryInterface.addIndex('bills', ['org_id', 'status'], { name: 'bills_org_id_status' });
            await queryInterface.addIndex('bills', ['org_id', 'vendor_id'], { name: 'bills_org_id_vendor_id' });
            await queryInterface.addIndex('bills', ['org_id', 'purchase_order_id'], { name: 'bills_org_id_purchase_order_id', unique: true });
            await queryInterface.addIndex('bills', ['org_id', 'bill_number'], { name: 'bills_org_id_bill_number', unique: true });
        }

        if (!tables.includes('bill_payments')) {
            await queryInterface.createTable('bill_payments', {
                id: {
                    type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false,
                },
                org_id: { type: Sequelize.INTEGER, allowNull: false },
                bill_id: { type: Sequelize.INTEGER, allowNull: false },
                amount: { type: Sequelize.DECIMAL(14, 4), allowNull: false },
                paid_date: { type: Sequelize.DATEONLY, allowNull: false },
                method: { type: Sequelize.STRING(100), allowNull: true },
                notes: { type: Sequelize.STRING(500), allowNull: true },
                created_by: { type: Sequelize.INTEGER, allowNull: true },
                created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
                updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            });
            await queryInterface.addIndex('bill_payments', ['org_id', 'bill_id'], { name: 'bill_payments_org_id_bill_id' });
        }

        if (!tables.includes('bill_counters')) {
            await queryInterface.createTable('bill_counters', {
                org_id: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false },
                next_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
                created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
                updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable('bill_payments');
        await queryInterface.dropTable('bills');
        await queryInterface.dropTable('bill_counters');
    },
};
