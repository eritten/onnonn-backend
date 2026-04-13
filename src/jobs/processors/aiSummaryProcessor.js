const { generateSummary } = require("../../services/aiService");

module.exports = async function aiSummaryProcessor(job) {
  return generateSummary(job.data.meetingId);
};
