const { stringify } = require("csv-stringify");
const { Meeting, Recording, User } = require("../models");

async function streamMeetingsCsv(res, filter = {}) {
  const stringifier = stringify({ header: true, columns: ["meetingId", "title", "status", "scheduledStartTime", "actualDuration"] });
  res.setHeader("Content-Type", "text/csv");
  stringifier.pipe(res);
  const cursor = Meeting.find(filter).cursor();
  for await (const meeting of cursor) {
    stringifier.write([meeting.meetingId, meeting.title, meeting.status, meeting.scheduledStartTime?.toISOString(), meeting.actualDuration || 0]);
  }
  stringifier.end();
}

async function streamUsersCsv(res) {
  const stringifier = stringify({ header: true, columns: ["email", "displayName", "role", "isActive"] });
  res.setHeader("Content-Type", "text/csv");
  stringifier.pipe(res);
  const cursor = User.find().cursor();
  for await (const user of cursor) {
    stringifier.write([user.email, user.displayName, user.role, user.isActive]);
  }
  stringifier.end();
}

async function streamRecordingsCsv(res, filter = {}) {
  const stringifier = stringify({ header: true, columns: ["id", "status", "fileSizeBytes", "fileUrl"] });
  res.setHeader("Content-Type", "text/csv");
  stringifier.pipe(res);
  const cursor = Recording.find(filter).cursor();
  for await (const recording of cursor) {
    stringifier.write([recording._id.toString(), recording.status, recording.fileSizeBytes || 0, recording.fileUrl || ""]);
  }
  stringifier.end();
}

module.exports = { streamMeetingsCsv, streamUsersCsv, streamRecordingsCsv };
