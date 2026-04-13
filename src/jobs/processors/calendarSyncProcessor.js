const { syncMeetingCreate, syncMeetingUpdate, syncMeetingDelete } = require("../../services/calendarService");

module.exports = async function calendarSyncProcessor(job) {
  if (job.data.action === "create") {
    return syncMeetingCreate(job.data.meetingId);
  }
  if (job.data.action === "update") {
    return syncMeetingUpdate(job.data.meetingId);
  }
  return syncMeetingDelete(job.data.meetingId);
};
