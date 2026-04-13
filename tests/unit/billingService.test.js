const billingService = require("../../src/services/billingService");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
const { createTestPlan, createTestUser, mockStripeEvent } = require("../helpers");
const { Subscription, Invoice } = require("../../src/models");

describe("billingService", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);

  test("lists plans", async () => {
    await createTestPlan({ slug: "free-a" });
    const plans = await billingService.listPlans();
    expect(plans.length).toBeGreaterThan(0);
  });

  test("returns a checkout url", async () => {
    const plan = await createTestPlan();
    const user = await createTestUser({ plan });
    const result = await billingService.subscribeToPlan(user, plan._id);
    expect(result.checkoutUrl).toBeTruthy();
  });

  test("stores paid invoices from webhook events", async () => {
    const plan = await createTestPlan();
    const user = await createTestUser({ plan, stripeCustomerId: "cus_paid" });
    const subscription = await Subscription.findOne({ user: user._id });
    await billingService.processStripeEvent(mockStripeEvent("invoice.paid", {
      id: "in_1",
      customer: "cus_paid",
      subscription: "sub_1",
      amount_paid: 1000,
      currency: "usd",
      hosted_invoice_url: "https://stripe.test/inv",
      invoice_pdf: "https://stripe.test/inv.pdf",
      status: "paid",
      status_transitions: { paid_at: Math.floor(Date.now() / 1000) }
    }));
    const invoice = await Invoice.findOne({ subscription: subscription._id });
    expect(invoice.amountPaid).toBe(1000);
  });
});
