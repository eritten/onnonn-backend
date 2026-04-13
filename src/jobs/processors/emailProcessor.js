const { sendEmail } = require("../../services/notificationService");

module.exports = async function emailProcessor(job) {
  await sendEmail(job.data);
  return { sent: true };
};
