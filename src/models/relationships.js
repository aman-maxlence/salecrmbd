/**
 * Wire up Sequelize associations across modules here as they're added
 * (e.g. Deal.belongsTo(SalesRep), Incentive.belongsTo(SalesRep), etc.)
 * @param {object} models - flat map of all initialized models
 */
export default function initializeRelationships(models) {
    // Example for when Deals is added:
    // models.Deal.belongsTo(models.SalesRep, { foreignKey: 'owner_sales_rep_id', as: 'owner' });
}
