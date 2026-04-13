import { api } from "./api";

export const billingService = {
  plans: () => api.get("/billing/plans").then((response) => response.data.plans),
  subscription: () => api.get("/billing/subscription").then((response) => response.data.subscription),
  invoices: () => api.get("/billing/invoices").then((response) => response.data.invoices)
};

export const recordingService = {
  list: (params) => api.get("/recordings", { params }).then((response) => response.data),
  get: (recordingId) => api.get(`/recordings/${recordingId}`).then((response) => response.data.recording),
  start: (meetingId) => api.post(`/recordings/meetings/${meetingId}/start`).then((response) => response.data.recording),
  stop: (recordingId) => api.post(`/recordings/${recordingId}/stop`).then((response) => response.data.recording),
  remove: (recordingId) => api.delete(`/recordings/${recordingId}`).then((response) => response.data.recording),
  share: (recordingId, payload) => api.post(`/recordings/${recordingId}/share`, payload).then((response) => response.data)
};

export const aiService = {
  transcription: (meetingId) => api.get(`/ai/meetings/${meetingId}/transcription`).then((response) => response.data.transcription),
  summary: (meetingId) => api.get(`/ai/meetings/${meetingId}/summary`).then((response) => response.data.summary),
  actionItems: (meetingId) => api.get(`/ai/meetings/${meetingId}/action-items`).then((response) => response.data.items),
  coaching: (meetingId) => api.get(`/ai/meetings/${meetingId}/coaching`).then((response) => response.data.report),
  sentiment: (meetingId) => api.get(`/ai/meetings/${meetingId}/sentiment`).then((response) => response.data.sentiment),
  assistant: (meetingId, question) => api.post(`/ai/meetings/${meetingId}/assistant`, { question }).then((response) => response.data),
  followUp: (meetingId) => api.post(`/ai/meetings/${meetingId}/follow-up`).then((response) => response.data.draft),
  search: (query) => api.get("/ai/search", { params: { q: query } }).then((response) => response.data.results),
  captions: (meetingId, payload) => api.post(`/ai/meetings/${meetingId}/captions`, payload).then((response) => response.data.caption)
};

export const orgService = {
  create: (payload) => api.post("/org", payload).then((response) => response.data.organization),
  analytics: (organizationId) => api.get(`/org/${organizationId}/analytics`).then((response) => response.data.analytics),
  invite: (organizationId, payload) => api.post(`/org/${organizationId}/invitations`, payload),
  acceptInvite: (token) => api.post("/org/invitations/accept", { token }),
  members: (organizationId) => api.get(`/org/${organizationId}/members`).then((response) => response.data.members),
  removeMember: (organizationId, userId) => api.delete(`/org/${organizationId}/members/${userId}`),
  updateSettings: (organizationId, payload) => api.patch(`/org/${organizationId}/settings`, payload).then((response) => response.data.organization),
  departments: (organizationId) => api.get(`/org/${organizationId}/departments`).then((response) => response.data.departments),
  createDepartment: (organizationId, payload) => api.post(`/org/${organizationId}/departments`, payload).then((response) => response.data.department),
  updateDepartment: (departmentId, payload) => api.patch(`/org/departments/${departmentId}`, payload).then((response) => response.data.department),
  deleteDepartment: (departmentId) => api.delete(`/org/departments/${departmentId}`),
  contacts: () => api.get("/org/contacts").then((response) => response.data.contacts),
  pendingContacts: () => api.get("/org/contacts/pending").then((response) => response.data.requests),
  searchUsers: (q) => api.get("/org/users/search", { params: { q } }).then((response) => response.data.users),
  sendContactRequest: (userId) => api.post("/org/contacts/requests", { userId }),
  respondContactRequest: (requesterId, status) => api.post(`/org/contacts/requests/${requesterId}/respond`, { status }),
  blockContact: (requesterId) => api.post(`/org/contacts/requests/${requesterId}/block`),
  notifications: () => api.get("/org/notifications").then((response) => response.data.notifications),
  readNotification: (notificationId) => api.post(`/org/notifications/${notificationId}/read`),
  readAllNotifications: () => api.post("/org/notifications/read-all"),
  deleteNotification: (notificationId) => api.delete(`/org/notifications/${notificationId}`),
  getPreferences: () => api.get("/org/notification-preferences").then((response) => response.data.preferences),
  updatePreferences: (preferences) => api.patch("/org/notification-preferences", { preferences }).then((response) => response.data.preferences),
  registerDevice: (payload) => api.post("/org/device-tokens", payload),
  userAnalytics: () => api.get("/org/analytics/me").then((response) => response.data.analytics),
  superadminAnalytics: () => api.get("/org/analytics/superadmin").then((response) => response.data.analytics),
  requestGdpr: (type) => api.post("/org/gdpr/requests", { type }).then((response) => response.data.request),
  upsertAvailability: (payload) => api.put("/org/availability", payload).then((response) => response.data.availability),
  getAvailability: (handle) => api.get(`/org/availability/${handle}`).then((response) => response.data.availability),
  getSlots: (handle) => api.get(`/org/availability/${handle}/slots`).then((response) => response.data.slots),
  bookSlot: (handle, payload) => api.post(`/org/availability/${handle}/book`, payload).then((response) => response.data),
  googleCalendarStatus: () => api.get("/calendar/google/status").then((response) => response.data),
  googleCalendarConnect: (code) => api.post("/calendar/google/connect", { code }).then((response) => response.data),
  googleCalendarDisconnect: () => api.delete("/calendar/google/disconnect"),
  webinars: {
    create: (payload) => api.post("/webinars", payload).then((response) => response.data.webinar)
  }
};
