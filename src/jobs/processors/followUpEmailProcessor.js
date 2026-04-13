const { generateFollowUpEmail } = require("../../services/aiService");
const { MeetingParticipant, Meeting } = require("../../models");
const { sendEmail } = require("../../services/notificationService");

module.exports = async function followUpEmailProcessor(job) {
  const draft = await generateFollowUpEmail(job.data.meetingId);
  if (job.data.send) {
    const participants = await MeetingParticipant.find({ meeting: job.data.meetingId, email: { $ne: null } });
    const meeting = await Meeting.findById(job.data.meetingId);
    await Promise.all(participants.map((participant) => sendEmail({
      to: participant.email,
      template: "followUpEmailGenerated",
      variables: {
        recipientName: participant.guestName || participant.email || "there",
        title: meeting.title,
        body: draft
      }
    })));
  }
  return { draft };
};
