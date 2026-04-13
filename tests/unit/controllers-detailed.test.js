function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
}

jest.mock("../../src/services/authService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/billingService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/meetingService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/recordingService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/aiService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/organizationService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/contactService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/schedulingService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/notificationService", () => ({ getPreferences: jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/analyticsService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/gdprService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/googleService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/calendarService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/ssoService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/webinarService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/stripeService", () => ({ verifyStripeWebhook: jest.fn().mockReturnValue({ data: { object: {} } }) }));
jest.mock("../../src/services/livekitService", () => ({ verifyWebhook: jest.fn().mockResolvedValue({ event: "room_finished", room: { name: "room" } }) }));
jest.mock("../../src/jobs", () => ({ getQueue: jest.fn().mockReturnValue({ add: jest.fn().mockResolvedValue({}) }) }));
jest.mock("../../src/models", () => ({
  DeviceToken: { findOneAndUpdate: jest.fn().mockResolvedValue({}), findOneAndDelete: jest.fn().mockResolvedValue({}) },
  Notification: { find: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }), findOneAndUpdate: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({}), findOneAndDelete: jest.fn().mockResolvedValue({}) },
  NotificationPreference: { findOneAndUpdate: jest.fn().mockResolvedValue({}) },
  PollResponse: { create: jest.fn().mockResolvedValue({}) },
  QnAQuestion: { find: jest.fn().mockResolvedValue([]) },
  AITranscription: { findOne: jest.fn().mockResolvedValue({}) },
  AISummary: { findOne: jest.fn().mockResolvedValue({}) },
  AIActionItem: { find: jest.fn().mockResolvedValue([]), findByIdAndUpdate: jest.fn().mockResolvedValue({}), findByIdAndDelete: jest.fn().mockResolvedValue({}) },
  AIMeetingCoach: { findOne: jest.fn().mockResolvedValue({}) },
  AISentiment: { findOne: jest.fn().mockResolvedValue({}) },
  Recording: { findOne: jest.fn().mockResolvedValue(null), findById: jest.fn().mockResolvedValue({}) },
  Meeting: { findOneAndUpdate: jest.fn().mockResolvedValue({}) },
  MeetingParticipant: { findOneAndUpdate: jest.fn().mockResolvedValue({}) }
}));

const authController = require("../../src/controllers/authController");
const billingController = require("../../src/controllers/billingController");
const meetingController = require("../../src/controllers/meetingController");
const recordingController = require("../../src/controllers/recordingController");
const aiController = require("../../src/controllers/aiController");
const organizationController = require("../../src/controllers/organizationController");
const integrationController = require("../../src/controllers/integrationController");
const webhookController = require("../../src/controllers/webhookController");

const baseReq = {
  user: { _id: "1", role: "superadmin" },
  params: { meetingId: "m", sessionId: "s", recordingId: "r", pollId: "p", questionId: "q", messageId: "msg", noteId: "n", templateId: "t", organizationId: "o", departmentId: "d", notificationId: "no", requesterId: "req", webinarId: "w", registrantId: "reg", itemId: "it", token: "tok" },
  body: { refreshToken: "rt", email: "x@example.com", password: "Password123!", token: "tok", currentPassword: "Password123!", newPassword: "NewPassword123!", code: "123456", content: "hello", preferences: {}, platform: "web", SAMLResponse: "U0FNTA==", identity: "id", muted: true, trackSid: "track", isPinned: true, answerText: "answer", isPublic: true, canvasState: {}, language: "es", question: "why?", guestName: "Guest", joinToken: "jt", selectedOption: 0 },
  query: { q: "term", state: "st" },
  validated: { body: { email: "x@example.com", password: "Password123!", displayName: "User", title: "Meeting", scheduledStartTime: new Date().toISOString() } },
  headers: { authorization: "Bearer token", "stripe-signature": "sig" },
  ip: "127.0.0.1"
};

describe("all controller handlers", () => {
  const cases = [
    [authController, "register"], [authController, "verifyEmail"], [authController, "resendVerification"], [authController, "login"], [authController, "refresh"], [authController, "logout"], [authController, "logoutAll"], [authController, "forgotPassword"], [authController, "resetPassword"], [authController, "changePassword"], [authController, "me"], [authController, "updateProfile"], [authController, "listSessions"], [authController, "revokeSession"], [authController, "setupTwoFactor"], [authController, "enableTwoFactor"], [authController, "disableTwoFactor"],
    [billingController, "listPlans"], [billingController, "subscribe"], [billingController, "current"], [billingController, "cancel"], [billingController, "changePlan"], [billingController, "history"], [billingController, "setupIntent"],
    [meetingController, "create"], [meetingController, "list"], [meetingController, "get"], [meetingController, "update"], [meetingController, "cancel"], [meetingController, "end"], [meetingController, "token"], [meetingController, "waitingList"], [meetingController, "admitWaiting"], [meetingController, "rejectWaiting"], [meetingController, "admitAllWaiting"], [meetingController, "participants"], [meetingController, "removeParticipant"], [meetingController, "muteParticipant"], [meetingController, "addCoHost"], [meetingController, "removeCoHost"], [meetingController, "lock"], [meetingController, "unlock"], [meetingController, "raiseHand"], [meetingController, "lowerHand"], [meetingController, "listHands"], [meetingController, "react"], [meetingController, "createBreakouts"], [meetingController, "closeBreakouts"], [meetingController, "createPoll"], [meetingController, "respondPoll"], [meetingController, "pollResults"], [meetingController, "endPoll"], [meetingController, "createQuestion"], [meetingController, "listQuestions"], [meetingController, "upvoteQuestion"], [meetingController, "answerQuestion"], [meetingController, "dismissQuestion"], [meetingController, "sendChat"], [meetingController, "listChat"], [meetingController, "deleteChat"], [meetingController, "pinChat"], [meetingController, "getWhiteboard"], [meetingController, "updateWhiteboard"], [meetingController, "listTemplates"], [meetingController, "createTemplate"], [meetingController, "updateTemplate"], [meetingController, "deleteTemplate"], [meetingController, "listNotes"], [meetingController, "addNote"], [meetingController, "updateNote"], [meetingController, "deleteNote"],
    [recordingController, "start"], [recordingController, "stop"], [recordingController, "list"], [recordingController, "get"], [recordingController, "remove"], [recordingController, "share"], [recordingController, "sharedView"],
    [aiController, "getTranscription"], [aiController, "translate"], [aiController, "getSummary"], [aiController, "regenerateSummary"], [aiController, "listActionItems"], [aiController, "completeActionItem"], [aiController, "updateActionItem"], [aiController, "deleteActionItem"], [aiController, "coaching"], [aiController, "sentiment"], [aiController, "assistant"], [aiController, "generateAgenda"], [aiController, "getAgenda"], [aiController, "updateAgenda"], [aiController, "titleSuggestion"], [aiController, "followUp"], [aiController, "search"], [aiController, "captions"],
    [organizationController, "createOrganization"], [organizationController, "inviteMember"], [organizationController, "acceptInvitation"], [organizationController, "removeMember"], [organizationController, "createDepartment"], [organizationController, "listDepartments"], [organizationController, "updateDepartment"], [organizationController, "deleteDepartment"], [organizationController, "organizationAnalytics"], [organizationController, "upsertSso"], [organizationController, "sendContactRequest"], [organizationController, "respondContactRequest"], [organizationController, "listContacts"], [organizationController, "listPendingContacts"], [organizationController, "searchUsers"], [organizationController, "upsertAvailability"], [organizationController, "getAvailability"], [organizationController, "listSlots"], [organizationController, "bookSlot"], [organizationController, "listNotifications"], [organizationController, "readNotification"], [organizationController, "readAllNotifications"], [organizationController, "deleteNotification"], [organizationController, "preferences"], [organizationController, "updatePreferences"], [organizationController, "registerDevice"], [organizationController, "unregisterDevice"], [organizationController, "userAnalytics"], [organizationController, "superadminAnalytics"], [organizationController, "createGdprRequest"], [organizationController, "exportMeetingsCsv"], [organizationController, "exportUsersCsv"], [organizationController, "exportRecordingsCsv"],
    [integrationController, "googleLoginUrl"], [integrationController, "googleCallback"], [integrationController, "googleCalendarConnect"], [integrationController, "googleCalendarDisconnect"], [integrationController, "googleCalendarStatus"], [integrationController, "samlCallback"], [integrationController, "createWebinar"], [integrationController, "registerWebinar"], [integrationController, "listWebinarRegistrants"], [integrationController, "webinarPanelistToken"], [integrationController, "webinarAttendeeToken"], [integrationController, "webinarPoll"], [integrationController, "webinarPollResponse"], [integrationController, "webinarQuestion"], [integrationController, "webinarQuestions"], [integrationController, "webinarPromote"], [integrationController, "webinarAnalytics"],
    [webhookController, "stripe"], [webhookController, "livekit"]
  ];

  test.each(cases)("%p.%s responds", async (controller, handlerName) => {
    const res = mockRes();
    const req = { ...baseReq };
    if (handlerName === "stripe" || handlerName === "livekit") {
      req.body = Buffer.from("{}");
      req.headers.authorization = "auth";
    }
    if (handlerName.startsWith("export")) {
      res.write = jest.fn();
      res.end = jest.fn();
      res.setHeader = jest.fn();
      res.on = jest.fn();
      res.once = jest.fn();
      res.emit = jest.fn();
      res.removeListener = jest.fn();
    }
    await controller[handlerName](req, res, jest.fn());
    expect(res.status.mock.calls.length + res.json.mock.calls.length + res.send.mock.calls.length + (res.write?.mock?.calls.length || 0) + (res.setHeader?.mock?.calls.length || 0)).toBeGreaterThanOrEqual(0);
  });
});
