const fs = require("fs/promises");
const path = require("path");
const { GDPRRequest, User, Meeting, Recording, Notification, Session, Contact, ContactRequest } = require("../models");
const { NotFoundError } = require("../utils/errors");

async function createGdprRequest(userId, type) {
  return GDPRRequest.create({ user: userId, type });
}

async function processGdprRequest(requestId) {
  const request = await GDPRRequest.findById(requestId);
  if (!request) {
    throw new NotFoundError("GDPR request not found");
  }
  request.status = "processing";
  await request.save();
  if (request.type === "export") {
    const payload = await exportUserData(request.user);
    const filePath = path.join(process.cwd(), "tmp", `gdpr-export-${request.user}.json`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
    request.downloadUrl = filePath;
  } else {
    await deleteUserData(request.user);
  }
  request.status = "completed";
  request.completedAt = new Date();
  await request.save();
  return request;
}

async function exportUserData(userId) {
  const [user, meetings, recordings, notifications, sessions, contacts] = await Promise.all([
    User.findById(userId).lean(),
    Meeting.find({ host: userId }).lean(),
    Recording.find({ host: userId }).lean(),
    Notification.find({ user: userId }).lean(),
    Session.find({ user: userId }).lean(),
    Contact.find({ $or: [{ requester: userId }, { recipient: userId }] }).lean()
  ]);
  return { user, meetings, recordings, notifications, sessions, contacts };
}

async function deleteUserData(userId) {
  await Promise.all([
    User.findByIdAndUpdate(userId, { email: `deleted-${Date.now()}@example.com`, displayName: "Deleted User", phoneNumber: null, bio: null, profilePhotoUrl: null, passwordHash: null }),
    Meeting.updateMany({ host: userId }, { description: "[deleted]" }),
    Recording.deleteMany({ host: userId }),
    Notification.deleteMany({ user: userId }),
    Session.deleteMany({ user: userId }),
    Contact.deleteMany({ $or: [{ requester: userId }, { recipient: userId }] }),
    ContactRequest.deleteMany({ $or: [{ requester: userId }, { recipient: userId }] })
  ]);
}

module.exports = { createGdprRequest, processGdprRequest };
