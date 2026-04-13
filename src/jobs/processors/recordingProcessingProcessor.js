const { finalizeRecording } = require("../../services/recordingService");

module.exports = async function recordingProcessingProcessor(job) {
  let fileBuffer = job.data.fileBuffer;
  if (!fileBuffer && job.data.sourceUrl) {
    const response = await fetch(job.data.sourceUrl);
    if (response.ok) {
      fileBuffer = Buffer.from(await response.arrayBuffer());
    }
  }
  return finalizeRecording({ ...job.data, fileBuffer });
};
