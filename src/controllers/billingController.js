const { asyncHandler } = require("../utils/asyncHandler");
const billingService = require("../services/billingService");

module.exports = {
  listPlans: asyncHandler(async (_req, res) => res.json({ plans: await billingService.listPlans() })),
  subscribe: asyncHandler(async (req, res) => res.json(await billingService.subscribeToPlan(req.user, req.body.planId))),
  current: asyncHandler(async (req, res) => res.json({ subscription: await billingService.getCurrentSubscription(req.user._id) })),
  cancel: asyncHandler(async (req, res) => res.json({ subscription: await billingService.cancelAtPeriodEnd(req.user._id) })),
  changePlan: asyncHandler(async (req, res) => res.json({ subscription: await billingService.changePlan(req.user._id, req.body.planId) })),
  history: asyncHandler(async (req, res) => res.json({ invoices: await billingService.listBillingHistory(req.user._id) })),
  setupIntent: asyncHandler(async (req, res) => res.json(await billingService.createPaymentMethodIntent(req.user)))
};
