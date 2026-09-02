import { DataTypes } from 'sequelize';

/**
 * One row per org - legal/billing company details (contact info, tax ID,
 * bank details) used on invoices and billing documents. Deliberately
 * separate from WorkspaceSettings (which is branding/personalisation) -
 * same reasoning as WorkspaceSettings being separate from userbd's
 * Organization record.
 */
const initializeCompanyDetailsModel = (sequelize) => {
    const CompanyDetails = sequelize.define('CompanyDetails', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        org_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        phone: { type: DataTypes.STRING(30), allowNull: true },
        email: { type: DataTypes.STRING(255), allowNull: true },
        website: { type: DataTypes.STRING(255), allowNull: true },
        company_name: { type: DataTypes.STRING(255), allowNull: true },
        vat_id: { type: DataTypes.STRING(100), allowNull: true },
        address: { type: DataTypes.STRING(500), allowNull: true },
        city: { type: DataTypes.STRING(100), allowNull: true },
        state: { type: DataTypes.STRING(100), allowNull: true },
        bank_name: { type: DataTypes.STRING(255), allowNull: true },
        bank_address: { type: DataTypes.STRING(500), allowNull: true },
        bank_routing_number: { type: DataTypes.STRING(100), allowNull: true },
        bank_account_holder_name: { type: DataTypes.STRING(255), allowNull: true },
        bank_account_number: { type: DataTypes.STRING(100), allowNull: true },
        iban: { type: DataTypes.STRING(100), allowNull: true },
        swift_code: { type: DataTypes.STRING(20), allowNull: true },
        bic: { type: DataTypes.STRING(20), allowNull: true },
    }, {
        tableName: 'company_details',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['org_id'], unique: true },
        ],
    });

    return CompanyDetails;
};

export default initializeCompanyDetailsModel;
