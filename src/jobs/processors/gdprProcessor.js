const { processGdprRequest } = require("../../services/gdprService");

module.exports = async function gdprProcessor(job) {
  return processGdprRequest(job.data.requestId);
};
