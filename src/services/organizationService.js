const dayjs = require("dayjs");
const { Organization, OrganizationMember, Department, OrganizationInvitation, SSOConfiguration, Meeting, User } = require("../models");
const { randomToken, hashToken } = require("../utils/crypto");
const { sendEmail } = require("./notificationService");
const { AuthorizationError, NotFoundError } = require("../utils/errors");

async function createOrganization(ownerId, payload) {
  const organization = await Organization.create({ ...payload, owner: ownerId });
  await OrganizationMember.create({ organization: organization._id, user: ownerId, role: "owner" });
  return organization;
}

async function inviteMember(organizationId, email, role) {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new NotFoundError("Organization not found");
  }
  const token = randomToken();
  await OrganizationInvitation.create({
    organization: organizationId,
    email,
    role,
    tokenHash: hashToken(token),
    expiresAt: dayjs().add(7, "day").toDate()
  });
  await sendEmail({
    to: email,
    template: "organizationInvitation",
    variables: {
      recipientName: email,
      organizationName: organization?.name || "your organization",
      inviteToken: token
    }
  });
  return { token };
}

async function acceptInvitation(token, userId) {
  const invitation = await OrganizationInvitation.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
    acceptedAt: null
  });
  if (!invitation) {
    throw new AuthorizationError("Invitation is invalid or expired");
  }
  const user = await User.findById(userId).select("email");
  if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new AuthorizationError("Invitation email does not match the authenticated user");
  }
  invitation.acceptedAt = new Date();
  await invitation.save();
  return OrganizationMember.create({ organization: invitation.organization, user: userId, role: invitation.role });
}

async function removeMember(organizationId, userId) {
  return OrganizationMember.findOneAndDelete({ organization: organizationId, user: userId });
}

async function listMembers(organizationId) {
  return OrganizationMember.find({ organization: organizationId }).populate("user department");
}

async function updateSettings(organizationId, payload) {
  return Organization.findByIdAndUpdate(organizationId, payload, { new: true });
}

async function createDepartment(organizationId, payload) {
  return Department.create({ organization: organizationId, ...payload });
}

async function listDepartments(organizationId) {
  return Department.find({ organization: organizationId });
}

async function updateDepartment(departmentId, payload) {
  return Department.findByIdAndUpdate(departmentId, payload, { new: true });
}

async function deleteDepartment(departmentId) {
  return Department.findByIdAndDelete(departmentId);
}

async function getOrganizationAnalytics(organizationId) {
  const members = await OrganizationMember.find({ organization: organizationId }).select("user");
  const userIds = members.map((member) => member.user);
  const stats = await Meeting.aggregate([
    { $match: { host: { $in: userIds } } },
    { $group: { _id: null, totalMeetings: { $sum: 1 }, totalMinutes: { $sum: { $ifNull: ["$actualDuration", 0] } }, avgParticipants: { $avg: "$analytics.participantCount" } } }
  ]);
  return stats[0] || { totalMeetings: 0, totalMinutes: 0, avgParticipants: 0 };
}

async function upsertSsoConfiguration(organizationId, payload) {
  return SSOConfiguration.findOneAndUpdate({ organization: organizationId }, payload, { upsert: true, new: true });
}

module.exports = {
  createOrganization,
  inviteMember,
  acceptInvitation,
  removeMember,
  listMembers,
  updateSettings,
  createDepartment,
  listDepartments,
  updateDepartment,
  deleteDepartment,
  getOrganizationAnalytics,
  upsertSsoConfiguration
};
