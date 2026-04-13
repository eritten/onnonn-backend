const { Contact, ContactRequest, User } = require("../models");
const { ConflictError, NotFoundError } = require("../utils/errors");

async function sendContactRequest(requesterId, recipientId) {
  if (requesterId.toString() === recipientId.toString()) {
    throw new ConflictError("Cannot send a contact request to yourself");
  }
  const existingInverse = await Contact.findOne({ requester: recipientId, recipient: requesterId, status: "blocked" });
  if (existingInverse) {
    throw new ConflictError("You cannot send a request to this user");
  }
  const request = await ContactRequest.findOneAndUpdate(
    { requester: requesterId, recipient: recipientId },
    { status: "pending" },
    { upsert: true, new: true }
  );
  await Contact.findOneAndUpdate(
    { requester: requesterId, recipient: recipientId },
    { status: "pending" },
    { upsert: true, new: true }
  );
  return request;
}

async function respondToContactRequest(requesterId, recipientId, status) {
  const request = await ContactRequest.findOneAndUpdate({ requester: requesterId, recipient: recipientId }, { status }, { new: true });
  if (!request) {
    throw new NotFoundError("Contact request not found");
  }
  await Contact.findOneAndUpdate({ requester: requesterId, recipient: recipientId }, { status }, { new: true, upsert: true });
  if (status === "accepted") {
    await Contact.findOneAndUpdate(
      { requester: recipientId, recipient: requesterId },
      { status: "accepted" },
      { new: true, upsert: true }
    );
  }
  if (status === "blocked") {
    await Contact.findOneAndUpdate(
      { requester: recipientId, recipient: requesterId },
      { status: "blocked" },
      { new: true, upsert: true }
    );
  }
  return request;
}

async function blockContact(requesterId, recipientId) {
  return respondToContactRequest(requesterId, recipientId, "blocked");
}

async function listContacts(userId) {
  return Contact.find({ status: "accepted", $or: [{ requester: userId }, { recipient: userId }] }).populate("requester recipient");
}

async function listPendingRequests(userId) {
  return ContactRequest.find({ recipient: userId, status: "pending" }).populate("requester");
}

async function searchUsers(term, currentUserId) {
  const filter = {
    $or: [{ displayName: { $regex: term, $options: "i" } }, { email: { $regex: term, $options: "i" } }]
  };
  if (currentUserId) {
    filter._id = { $ne: currentUserId };
  }
  return User.find(filter).limit(20);
}

module.exports = { sendContactRequest, respondToContactRequest, blockContact, listContacts, listPendingRequests, searchUsers };
