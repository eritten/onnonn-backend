const { Notification, NotificationPreference, DeviceToken } = require("../models");
const { firebaseAdmin } = require("../config/firebase");
const { sendEmail: sendTemplatedEmail } = require("./emailService");

async function createNotification({ userId, type, title, message, metadata = {} }) {
  return Notification.create({ user: userId, type, title, message, metadata });
}

async function getPreferences(userId) {
  return NotificationPreference.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { preferences: {} } },
    { upsert: true, new: true }
  );
}

async function updatePreferences(userId, preferences) {
  return NotificationPreference.findOneAndUpdate(
    { user: userId },
    { preferences },
    { upsert: true, new: true }
  );
}

async function shouldSend(userId, type, channel) {
  const preferences = await getPreferences(userId);
  const config = preferences.preferences?.[type];
  if (!config) {
    return true;
  }
  return Boolean(config[channel]);
}

async function sendEmail(payload) {
  return sendTemplatedEmail(payload);
}

async function sendPush({ userId, title, body, data = {} }) {
  const tokens = await DeviceToken.find({ user: userId });
  if (!tokens.length || !firebaseAdmin.apps.length) {
    return { sent: 0 };
  }
  const results = await Promise.all(tokens.map((token) => firebaseAdmin.messaging().send({
    token: token.token,
    notification: { title, body },
    data
  })));
  return { sent: results.length };
}

module.exports = { createNotification, getPreferences, updatePreferences, shouldSend, sendEmail, sendPush };
