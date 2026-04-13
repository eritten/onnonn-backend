const { computeMeetingAnalytics } = require("../../services/analyticsService");

module.exports = async function analyticsProcessor(job) {
  return computeMeetingAnalytics(job.data.meetingId);
};
