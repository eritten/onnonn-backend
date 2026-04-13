const { asyncHandler } = require("../utils/asyncHandler");
const organizationService = require("../services/organizationService");
const contactService = require("../services/contactService");
const schedulingService = require("../services/schedulingService");
const notificationService = require("../services/notificationService");
const analyticsService = require("../services/analyticsService");
const gdprService = require("../services/gdprService");
const exportService = require("../services/exportService");
const { DeviceToken, Notification } = require("../models");

module.exports = {
  createOrganization: asyncHandler(async (req, res) => res.status(201).json({ organization: await organizationService.createOrganization(req.user._id, req.body) })),
  inviteMember: asyncHandler(async (req, res) => res.json(await organizationService.inviteMember(req.params.organizationId, req.body.email, req.body.role))),
  acceptInvitation: asyncHandler(async (req, res) => res.status(201).json({ membership: await organizationService.acceptInvitation(req.body.token, req.user._id) })),
  removeMember: asyncHandler(async (req, res) => res.status(204).send(await organizationService.removeMember(req.params.organizationId, req.params.userId))),
  listMembers: asyncHandler(async (req, res) => res.json({ members: await organizationService.listMembers(req.params.organizationId) })),
  updateSettings: asyncHandler(async (req, res) => res.json({ organization: await organizationService.updateSettings(req.params.organizationId, req.body) })),
  createDepartment: asyncHandler(async (req, res) => res.status(201).json({ department: await organizationService.createDepartment(req.params.organizationId, req.body) })),
  listDepartments: asyncHandler(async (req, res) => res.json({ departments: await organizationService.listDepartments(req.params.organizationId) })),
  updateDepartment: asyncHandler(async (req, res) => res.json({ department: await organizationService.updateDepartment(req.params.departmentId, req.body) })),
  deleteDepartment: asyncHandler(async (req, res) => res.status(204).send(await organizationService.deleteDepartment(req.params.departmentId))),
  organizationAnalytics: asyncHandler(async (req, res) => res.json({ analytics: await organizationService.getOrganizationAnalytics(req.params.organizationId) })),
  upsertSso: asyncHandler(async (req, res) => res.json({ configuration: await organizationService.upsertSsoConfiguration(req.params.organizationId, req.body) })),
  sendContactRequest: asyncHandler(async (req, res) => res.status(201).json({ request: await contactService.sendContactRequest(req.user._id, req.body.userId) })),
  respondContactRequest: asyncHandler(async (req, res) => res.json({ request: await contactService.respondToContactRequest(req.params.requesterId, req.user._id, req.body.status) })),
  listContacts: asyncHandler(async (req, res) => res.json({ contacts: await contactService.listContacts(req.user._id) })),
  listPendingContacts: asyncHandler(async (req, res) => res.json({ requests: await contactService.listPendingRequests(req.user._id) })),
  blockContact: asyncHandler(async (req, res) => res.json({ request: await contactService.blockContact(req.params.requesterId, req.user._id) })),
  searchUsers: asyncHandler(async (req, res) => res.json({ users: await contactService.searchUsers(req.query.q, req.user._id) })),
  upsertAvailability: asyncHandler(async (req, res) => res.json({ availability: await schedulingService.upsertAvailability(req.user._id, req.body) })),
  getAvailability: asyncHandler(async (req, res) => res.json({ availability: await schedulingService.getAvailabilityByHandle(req.params.handle) })),
  listSlots: asyncHandler(async (req, res) => res.json({ slots: await schedulingService.listAvailableSlots(req.params.handle) })),
  bookSlot: asyncHandler(async (req, res) => res.status(201).json(await schedulingService.bookAvailability(req.params.handle, req.body))),
  listNotifications: asyncHandler(async (req, res) => res.json({ notifications: await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }) })),
  readNotification: asyncHandler(async (req, res) => res.json({ notification: await Notification.findOneAndUpdate({ _id: req.params.notificationId, user: req.user._id }, { isRead: true }, { new: true }) })),
  readAllNotifications: asyncHandler(async (req, res) => res.json({ updated: await Notification.updateMany({ user: req.user._id }, { isRead: true }) })),
  deleteNotification: asyncHandler(async (req, res) => res.status(204).send(await Notification.findOneAndDelete({ _id: req.params.notificationId, user: req.user._id }))),
  preferences: asyncHandler(async (req, res) => res.json({ preferences: await notificationService.getPreferences(req.user._id) })),
  updatePreferences: asyncHandler(async (req, res) => res.json({ preferences: await notificationService.updatePreferences(req.user._id, req.body.preferences) })),
  registerDevice: asyncHandler(async (req, res) => res.status(201).json({ deviceToken: await DeviceToken.findOneAndUpdate({ token: req.body.token }, { user: req.user._id, platform: req.body.platform }, { upsert: true, new: true }) })),
  unregisterDevice: asyncHandler(async (req, res) => res.status(204).send(await DeviceToken.findOneAndDelete({ token: req.body.token, user: req.user._id }))),
  userAnalytics: asyncHandler(async (req, res) => res.json({ analytics: await analyticsService.getUserAnalytics(req.user._id) })),
  superadminAnalytics: asyncHandler(async (_req, res) => res.json({ analytics: await analyticsService.getSuperadminAnalytics() })),
  createGdprRequest: asyncHandler(async (req, res) => res.status(201).json({ request: await gdprService.createGdprRequest(req.user._id, req.body.type) })),
  exportMeetingsCsv: asyncHandler(async (req, res) => exportService.streamMeetingsCsv(res, req.user.role === "superadmin" ? {} : { host: req.user._id })),
  exportUsersCsv: asyncHandler(async (_req, res) => exportService.streamUsersCsv(res)),
  exportRecordingsCsv: asyncHandler(async (req, res) => exportService.streamRecordingsCsv(res, req.user.role === "superadmin" ? {} : { host: req.user._id }))
};
