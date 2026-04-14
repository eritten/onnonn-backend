const { renderBaseEmail, escapeHtml } = require("./emailBase");

function paragraph(text) {
  return `<p style="margin: 0 0 16px;">${escapeHtml(text)}</p>`;
}

function codeBlock(code) {
  return `<div style="margin: 20px 0; padding: 18px 20px; border-radius: 16px; background: #EEF2FF; color: #312E81; font-size: 28px; font-weight: 800; letter-spacing: 0.18em; text-align: center;">${escapeHtml(code)}</div>`;
}

const templates = {
  emailVerification: ({ name, otp }) => ({
    subject: "Verify your Onnonn email",
    text: `Hello ${name}, your Onnonn verification code is ${otp}. It expires in 10 minutes.`,
    html: renderBaseEmail({
      heading: "Verify your email",
      intro: `Hello ${name}, welcome to Onnonn.`,
      bodyHtml: `${paragraph("Use the verification code below to activate your account and start hosting meetings.")}${codeBlock(otp)}${paragraph("This code expires in 10 minutes.")}`
    })
  }),
  welcomeAfterVerification: ({ name, appUrl }) => ({
    subject: "Your Onnonn account is ready",
    text: `Hello ${name}, your email is verified and your Onnonn account is ready.`,
    html: renderBaseEmail({
      heading: "Youâ€™re all set",
      intro: `Hello ${name}, your email has been verified.`,
      bodyHtml: `${paragraph("Your Onnonn workspace is now ready. You can schedule meetings, invite teammates, and start collaborating right away.")}`,
      buttonLabel: "Open Onnonn",
      buttonUrl: appUrl
    })
  }),
  forgotPassword: ({ name, resetToken }) => ({
    subject: "Reset your Onnonn password",
    text: `Hello ${name}, use this password reset token: ${resetToken}`,
    html: renderBaseEmail({
      heading: "Reset your password",
      intro: `Hello ${name}, we received a request to reset your password.`,
      bodyHtml: `${paragraph("Use the reset token below to finish updating your password.")}${codeBlock(resetToken)}${paragraph("If you did not request this, you can safely ignore this email.")}`
    })
  }),
  passwordResetConfirmation: ({ name, appUrl }) => ({
    subject: "Your Onnonn password was changed",
    text: `Hello ${name}, your password has been changed successfully.`,
    html: renderBaseEmail({
      heading: "Password updated",
      intro: `Hello ${name}, your password was changed successfully.`,
      bodyHtml: `${paragraph("If this was you, no further action is needed. If not, please secure your account immediately.")}`,
      buttonLabel: "Review account",
      buttonUrl: appUrl
    })
  }),
  meetingInvitation: ({ recipientName, title, joinUrl, scheduledTime, meetingId }) => ({
    subject: `Invitation: ${title}`,
    text: `${recipientName}, you are invited to ${title}${scheduledTime ? ` on ${scheduledTime}` : ""}. Meeting ID: ${meetingId || "N/A"}. Join: ${joinUrl}`,
    html: renderBaseEmail({
      heading: "Meeting invitation",
      intro: `Hello ${recipientName}, youâ€™ve been invited to a meeting on Onnonn.`,
      bodyHtml: `${paragraph(`Meeting: ${title}`)}${meetingId ? paragraph(`Meeting ID: ${meetingId}`) : ""}${scheduledTime ? paragraph(`Scheduled for: ${scheduledTime}`) : paragraph("This meeting is available to join instantly.")}`,
      buttonLabel: "Join meeting",
      buttonUrl: joinUrl
    })
  }),
  meetingUpdate: ({ recipientName, title, joinUrl, summary }) => ({
    subject: `Updated: ${title}`,
    text: `${recipientName}, your meeting "${title}" was updated. ${summary} Join: ${joinUrl}`,
    html: renderBaseEmail({
      heading: "Meeting updated",
      intro: `Hello ${recipientName}, thereâ€™s an update to your Onnonn meeting.`,
      bodyHtml: `${paragraph(`Meeting: ${title}`)}${paragraph(summary)}`,
      buttonLabel: "View meeting",
      buttonUrl: joinUrl
    })
  }),
  meetingCancellation: ({ recipientName, title }) => ({
    subject: `Cancelled: ${title}`,
    text: `${recipientName}, the meeting "${title}" has been cancelled.`,
    html: renderBaseEmail({
      heading: "Meeting cancelled",
      intro: `Hello ${recipientName}, the following meeting has been cancelled.`,
      bodyHtml: `${paragraph(`Meeting: ${title}`)}${paragraph("No further action is needed from you.")}`
    })
  }),
  meetingReminder: ({ recipientName, title, joinUrl, reminderWindow }) => ({
    subject: `Reminder: ${title}`,
    text: `${recipientName}, your meeting "${title}" starts in ${reminderWindow}. Join: ${joinUrl}`,
    html: renderBaseEmail({
      heading: "Meeting reminder",
      intro: `Hello ${recipientName}, your Onnonn meeting is coming up soon.`,
      bodyHtml: `${paragraph(`"${title}" starts in ${reminderWindow}.`)}`,
      buttonLabel: "Join meeting",
      buttonUrl: joinUrl
    })
  }),
  recordingReady: ({ recipientName, title, recordingUrl }) => ({
    subject: `Recording ready: ${title}`,
    text: `${recipientName}, the recording for "${title}" is ready: ${recordingUrl}`,
    html: renderBaseEmail({
      heading: "Recording ready",
      intro: `Hello ${recipientName}, your meeting recording is ready.`,
      bodyHtml: `${paragraph(`The recording for "${title}" is now available.`)}`,
      buttonLabel: "View recording",
      buttonUrl: recordingUrl
    })
  }),
  webinarRegistrationConfirmation: ({ recipientName, title, joinToken }) => ({
    subject: `Youâ€™re registered for ${title}`,
    text: `${recipientName}, youâ€™re registered for ${title}. Your join token is ${joinToken}.`,
    html: renderBaseEmail({
      heading: "Webinar registration confirmed",
      intro: `Hello ${recipientName}, your seat is confirmed.`,
      bodyHtml: `${paragraph(`Youâ€™re registered for "${title}". Keep the join token below handy for entry.`)}${codeBlock(joinToken)}`
    })
  }),
  webinarRecordingAvailable: ({ recipientName, title, recordingUrl }) => ({
    subject: `Webinar recording available: ${title}`,
    text: `${recipientName}, the recording for ${title} is now available: ${recordingUrl}`,
    html: renderBaseEmail({
      heading: "Webinar recording available",
      intro: `Hello ${recipientName}, your webinar recording is ready.`,
      bodyHtml: `${paragraph(`You can now watch the recording for "${title}".`)}`,
      buttonLabel: "Watch recording",
      buttonUrl: recordingUrl
    })
  }),
  organizationInvitation: ({ recipientName, organizationName, inviteToken }) => ({
    subject: `Invitation to join ${organizationName}`,
    text: `${recipientName}, you were invited to join ${organizationName}. Invitation token: ${inviteToken}`,
    html: renderBaseEmail({
      heading: "Organization invitation",
      intro: `Hello ${recipientName}, youâ€™ve been invited to join ${organizationName} on Onnonn.`,
      bodyHtml: `${paragraph("Use the invitation token below to accept your invite.")}${codeBlock(inviteToken)}`
    })
  }),
  subscriptionConfirmation: ({ recipientName, planName, appUrl }) => ({
    subject: `Your Onnonn ${planName} plan is active`,
    text: `${recipientName}, your ${planName} subscription is active.`,
    html: renderBaseEmail({
      heading: "Subscription confirmed",
      intro: `Hello ${recipientName}, your subscription is active.`,
      bodyHtml: `${paragraph(`Your Onnonn ${planName} plan is now ready to use.`)}`,
      buttonLabel: "Open billing",
      buttonUrl: appUrl
    })
  }),
  paymentFailed: ({ recipientName, appUrl }) => ({
    subject: "Action needed: payment failed",
    text: `${recipientName}, a recent payment for your Onnonn account failed. Update your payment method: ${appUrl}`,
    html: renderBaseEmail({
      heading: "Payment failed",
      intro: `Hello ${recipientName}, we couldnâ€™t process your latest payment.`,
      bodyHtml: `${paragraph("Please update your payment details to avoid any interruption to your subscription.")}`,
      buttonLabel: "Update payment method",
      buttonUrl: appUrl
    })
  }),
  accountSuspended: ({ recipientName, reason, appUrl }) => ({
    subject: "Your Onnonn account has been suspended",
    text: `${recipientName}, your account has been suspended. Reason: ${reason}`,
    html: renderBaseEmail({
      heading: "Account suspended",
      intro: `Hello ${recipientName}, your Onnonn account has been suspended.`,
      bodyHtml: `${paragraph(`Reason: ${reason}`)}${paragraph("If you think this is a mistake, please contact support.")}`,
      buttonLabel: "Contact support",
      buttonUrl: appUrl
    })
  }),
  followUpEmailGenerated: ({ recipientName, title, body, appUrl }) => ({
    subject: `Follow-up ready for ${title}`,
    text: `${recipientName}, a follow-up email draft was generated for ${title}. ${body}`,
    html: renderBaseEmail({
      heading: "Follow-up draft ready",
      intro: `Hello ${recipientName}, your follow-up draft is ready.`,
      bodyHtml: `${paragraph(`Meeting: ${title}`)}${paragraph(body)}`,
      buttonLabel: "Review follow-up",
      buttonUrl: appUrl
    })
  }),
  actionItemAssigned: ({ recipientName, task, deadline, appUrl }) => ({
    subject: "New Onnonn action item assigned",
    text: `${recipientName}, you were assigned: ${task}${deadline ? `, due ${deadline}` : ""}.`,
    html: renderBaseEmail({
      heading: "Action item assigned",
      intro: `Hello ${recipientName}, youâ€™ve been assigned a new action item.`,
      bodyHtml: `${paragraph(`Task: ${task}`)}${deadline ? paragraph(`Deadline: ${deadline}`) : ""}`,
      buttonLabel: "View action items",
      buttonUrl: appUrl
    })
  }),
 gdprExportReady: ({ recipientName, downloadUrl }) => ({
    subject: "Your GDPR data export is ready",
    text: `${recipientName}, your GDPR data export is ready: ${downloadUrl}`,
    html: renderBaseEmail({
      heading: "Data export ready",
      intro: `Hello ${recipientName}, your requested data export is ready.`,
      bodyHtml: `${paragraph("You can download the export securely using the button below.")}`,
      buttonLabel: "Download export",
      buttonUrl: downloadUrl
    })
  }),
  gdprDeletionConfirmation: ({ recipientName }) => ({
    subject: "Your data deletion request is complete",
    text: `${recipientName}, your Onnonn data deletion request has been completed.`,
    html: renderBaseEmail({
      heading: "Deletion complete",
      intro: `Hello ${recipientName}, your data deletion request has been completed.`,
      bodyHtml: `${paragraph("Weâ€™ve processed the deletion or anonymization of your personal data associated with Onnonn.")}`
    })
  })
};

module.exports = { templates };

