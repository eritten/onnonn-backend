const { Recording } = require("../../models");
const { generateTranscription } = require("../../services/aiService");

module.exports = async function aiTranscriptionProcessor(job) {
  const recording = await Recording.findById(job.data.recordingId);
  return generateTranscription(recording);
};
