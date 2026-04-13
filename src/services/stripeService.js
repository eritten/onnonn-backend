const { stripe } = require("../config/stripe");
const { PaymentError } = require("../utils/errors");
const env = require("../config/env");

async function createCustomer({ email, name }) {
  if (!stripe) {
    return { id: `cus_mock_${Date.now()}`, email, name };
  }
  return stripe.customers.create({ email, name });
}

async function createCheckoutSession({ customerId, priceId, successPath = "/billing/success", cancelPath = "/billing/cancel" }) {
  if (!stripe) {
    return { url: `${env.frontendUrl}/mock-checkout?priceId=${priceId}` };
  }
  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.frontendUrl}${successPath}`,
    cancel_url: `${env.frontendUrl}${cancelPath}`
  });
}

async function createSetupIntent(customerId) {
  if (!stripe) {
    return { client_secret: "seti_mock_secret" };
  }
  return stripe.setupIntents.create({ customer: customerId });
}

function verifyStripeWebhook(payload, signature) {
  if (!stripe) {
    return JSON.parse(payload);
  }
  try {
    return stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
  } catch (error) {
    throw new PaymentError("Invalid Stripe webhook signature");
  }
}

module.exports = { createCustomer, createCheckoutSession, createSetupIntent, verifyStripeWebhook, stripe };
