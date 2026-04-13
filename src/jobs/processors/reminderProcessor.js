const { sendEmail } = require("../../services/notificationService");

module.exports = async function reminderProcessor(job) {
  await sendEmail(job.data.template ? job.data : {
    ...job.data,
    template: "meetingReminder",
    variables: {
      recipientName: job.data.recipientName || "there",
      title: job.data.title || "Your meeting",
      joinUrl: job.data.joinUrl || job.data.variables?.joinUrl || "",
      reminderWindow: job.data.reminderWindow || "soon"
    }
  });
  return { reminded: true };
};
