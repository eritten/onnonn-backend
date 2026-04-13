const { generateSentiment, generateCoachingReport } = require("../../services/aiService");

module.exports = async function aiAnalysisProcessor(job) {
  const sentiment = await generateSentiment(job.data.meetingId);
  const coach = await generateCoachingReport(job.data.meetingId);
  return { sentiment, coach };
};
