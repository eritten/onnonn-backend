const fs = require("node:fs/promises");
const { finalizeRecording } = require("../../services/recordingService");

module.exports = async function recordingProcessingProcessor(job) {
  let fileBuffer = job.data.fileBuffer;
  if (!fileBuffer && job.data.sourceUrl) {
    const response = await fetch(job.data.sourceUrl);
    if (response.ok) {
      fileBuffer = Buffer.from(await response.arrayBuffer());
    }
  }
  if (!fileBuffer && job.data.sourcePath) {
    try {
      fileBuffer = await fs.readFile(job.data.sourcePath);
    } catch (_error) {
      // Source path may be on a different host; ignore and let finalize handle missing data.
    }
  }
  return finalizeRecording({ ...job.data, fileBuffer });
};
