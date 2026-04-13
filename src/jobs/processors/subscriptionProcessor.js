const { processStripeEvent } = require("../../services/billingService");

module.exports = async function subscriptionProcessor(job) {
  return processStripeEvent(job.data.event);
};
