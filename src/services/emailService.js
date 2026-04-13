const { transporter } = require("../config/mailer");
const env = require("../config/env");
const { templates } = require("../templates/emailTemplates");
const { User, NotificationPreference } = require("../models");

function renderTemplate(template, variables = {}) {
  if (!template) {
    return null;
  }
  const renderer = templates[template];
  if (!renderer) {
    throw new Error(`Unknown email template: ${template}`);
  }
  return renderer({
    appUrl: env.frontendUrl,
    recipientName: "there",
    ...variables
  });
}

async function sendEmail({ to, subject, html, text, template, variables }) {
  const rendered = renderTemplate(template, variables);
  const recipientEmail = Array.isArray(to) ? null : to;
  if (recipientEmail) {
    const user = await User.findOne({ email: recipientEmail.toLowerCase() }).select("_id");
    if (user) {
      const preferenceRecord = await NotificationPreference.findOne({ user: user._id });
      const preferences = preferenceRecord?.preferences || {};
      if (preferences.email?.enabled === false || preferences[template]?.email === false) {
        return { skipped: true, reason: "email_preference_disabled" };
      }
    }
  }
  return transporter.sendMail({
    from: env.emailFrom,
    to,
    subject: subject || rendered?.subject,
    html: html || rendered?.html,
    text: text || rendered?.text
  });
}

module.exports = { sendEmail, renderTemplate };
