const { Subscription, Invoice, Plan } = require("../models");
const { createCheckoutSession, createSetupIntent, stripe } = require("./stripeService");
const { NotFoundError, PaymentError } = require("../utils/errors");

async function listPlans() {
  return Plan.find().sort({ price: 1 });
}

async function subscribeToPlan(user, planId) {
  const plan = await Plan.findById(planId);
  if (!plan) {
    throw new NotFoundError("Plan not found");
  }
  const subscription = await Subscription.findOne({ user: user._id });
  const session = await createCheckoutSession({
    customerId: user.stripeCustomerId,
    priceId: plan.stripePriceId
  });
  return { checkoutUrl: session.url, plan, subscription };
}

async function getCurrentSubscription(userId) {
  const subscription = await Subscription.findOne({ user: userId }).populate("plan");
  if (!subscription) {
    throw new NotFoundError("Subscription not found");
  }
  return subscription;
}

async function cancelAtPeriodEnd(userId) {
  const subscription = await Subscription.findOne({ user: userId });
  if (!subscription) {
    throw new NotFoundError("Subscription not found");
  }
  subscription.cancelAtPeriodEnd = true;
  await subscription.save();
  if (stripe && subscription.stripeSubscriptionId) {
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
  }
  return subscription;
}

async function changePlan(userId, nextPlanId) {
  const subscription = await Subscription.findOne({ user: userId });
  const nextPlan = await Plan.findById(nextPlanId);
  if (!subscription || !nextPlan) {
    throw new NotFoundError("Subscription or plan not found");
  }
  if (stripe && subscription.stripeSubscriptionId) {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{ id: stripeSubscription.items.data[0].id, price: nextPlan.stripePriceId }],
      proration_behavior: "create_prorations"
    });
  }
  subscription.plan = nextPlan._id;
  await subscription.save();
  return subscription.populate("plan");
}

async function listBillingHistory(userId) {
  return Invoice.find({ user: userId }).sort({ paidAt: -1 });
}

async function createPaymentMethodIntent(user) {
  if (!user.stripeCustomerId) {
    throw new PaymentError("Stripe customer is missing");
  }
  return createSetupIntent(user.stripeCustomerId);
}

async function enforcePlanLimit({ subscription, key, currentValue = 0 }) {
  const plan = await Plan.findById(subscription.plan);
  const limit = plan.limits[key];
  if (limit === 0 || limit === Number.MAX_SAFE_INTEGER) {
    return;
  }
  if (currentValue > limit) {
    throw new PaymentError("Plan limit exceeded", { key, currentValue, limit });
  }
}

async function processStripeEvent(event) {
  const customerId = event.data?.object?.customer;
  const subscriptionId = event.data?.object?.subscription || event.data?.object?.id;
  const subscription = customerId ? await Subscription.findOne({ stripeCustomerId: customerId }) : null;

  if (event.type === "checkout.session.completed" && subscription) {
    subscription.status = "active";
    await subscription.save();
  }

  if (event.type === "invoice.paid" && subscription) {
    await Invoice.findOneAndUpdate(
      { stripeInvoiceId: event.data.object.id },
      {
        user: subscription.user,
        subscription: subscription._id,
        stripeInvoiceId: event.data.object.id,
        amountPaid: event.data.object.amount_paid,
        currency: event.data.object.currency,
        invoicePdfUrl: event.data.object.invoice_pdf,
        hostedInvoiceUrl: event.data.object.hosted_invoice_url,
        paidAt: new Date((event.data.object.status_transitions?.paid_at || Date.now() / 1000) * 1000),
        status: event.data.object.status
      },
      { upsert: true, new: true }
    );
  }

  if (event.type === "invoice.payment_failed" && subscription) {
    subscription.status = "past_due";
    await subscription.save();
  }

  if (event.type === "invoice.payment_action_required" && subscription) {
    subscription.status = "incomplete";
    await subscription.save();
  }

  if (event.type === "customer.subscription.deleted" && subscription) {
    subscription.status = "cancelled";
    await subscription.save();
  }

  if (subscription && subscriptionId) {
    subscription.stripeSubscriptionId = subscriptionId;
    subscription.status = event.data.object.status || subscription.status;
    subscription.currentPeriodStart = event.data.object.current_period_start ? new Date(event.data.object.current_period_start * 1000) : subscription.currentPeriodStart;
    subscription.currentPeriodEnd = event.data.object.current_period_end ? new Date(event.data.object.current_period_end * 1000) : subscription.currentPeriodEnd;
    subscription.cancelAtPeriodEnd = Boolean(event.data.object.cancel_at_period_end);
    await subscription.save();
  }

  return subscription;
}

module.exports = {
  listPlans,
  subscribeToPlan,
  getCurrentSubscription,
  cancelAtPeriodEnd,
  changePlan,
  listBillingHistory,
  createPaymentMethodIntent,
  enforcePlanLimit,
  processStripeEvent
};
