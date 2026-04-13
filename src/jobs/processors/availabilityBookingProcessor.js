const { sendEmail } = require("../../services/notificationService");

module.exports = async function availabilityBookingProcessor(job) {
  await sendEmail(job.data);
  return { sent: true };
};
