const { sendPush } = require("../../services/notificationService");

module.exports = async function pushProcessor(job) {
  return sendPush(job.data);
};
