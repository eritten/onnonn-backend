function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
}

jest.mock("../../src/services/authService", () => ({
  registerUser: jest.fn().mockResolvedValue({ email: "a@example.com" }),
  verifyEmail: jest.fn().mockResolvedValue({ isEmailVerified: true }),
  sendVerificationEmail: jest.fn().mockResolvedValue("token"),
  loginUser: jest.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r" }),
  refreshSession: jest.fn().mockResolvedValue({ accessToken: "a2" }),
  logoutSession: jest.fn().mockResolvedValue(),
  logoutAllSessions: jest.fn().mockResolvedValue(),
  sendPasswordReset: jest.fn().mockResolvedValue(),
  resetPassword: jest.fn().mockResolvedValue(),
  changePassword: jest.fn().mockResolvedValue(),
  updateProfile: jest.fn().mockResolvedValue({ displayName: "Updated" }),
  listSessions: jest.fn().mockResolvedValue([]),
  revokeSession: jest.fn().mockResolvedValue(),
  generateTwoFactorSetup: jest.fn().mockResolvedValue({ secret: "x" }),
  enableTwoFactor: jest.fn().mockResolvedValue(),
  disableTwoFactor: jest.fn().mockResolvedValue()
}));
jest.mock("../../src/services/billingService", () => ({
  listPlans: jest.fn().mockResolvedValue([]),
  subscribeToPlan: jest.fn().mockResolvedValue({ checkoutUrl: "url" }),
  getCurrentSubscription: jest.fn().mockResolvedValue({}),
  cancelAtPeriodEnd: jest.fn().mockResolvedValue({}),
  changePlan: jest.fn().mockResolvedValue({}),
  listBillingHistory: jest.fn().mockResolvedValue([]),
  createPaymentMethodIntent: jest.fn().mockResolvedValue({ client_secret: "x" })
}));
jest.mock("../../src/services/meetingService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/recordingService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/aiService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/organizationService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/contactService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/schedulingService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
jest.mock("../../src/services/notificationService", () => ({
  getPreferences: jest.fn().mockResolvedValue({})
}));
jest.mock("../../src/services/analyticsService", () => ({
  getUserAnalytics: jest.fn().mockResolvedValue({}),
  getSuperadminAnalytics: jest.fn().mockResolvedValue({})
}));
jest.mock("../../src/services/gdprService", () => ({
  createGdprRequest: jest.fn().mockResolvedValue({})
}));
jest.mock("../../src/services/googleService", () => ({
  buildGoogleOAuthUrl: jest.fn().mockReturnValue("http://google"),
  loginWithGoogleCallback: jest.fn().mockResolvedValue({}),
  connectGoogleCalendar: jest.fn().mockResolvedValue({})
}));
jest.mock("../../src/services/calendarService", () => ({
  disconnectGoogleCalendar: jest.fn().mockResolvedValue(),
  getCalendarStatus: jest.fn().mockResolvedValue({ connected: true })
}));
jest.mock("../../src/services/ssoService", () => ({
  handleSamlCallback: jest.fn().mockResolvedValue({})
}));
jest.mock("../../src/services/webinarService", () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }));
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
  AISentiment: { findOne: jest.fn().mockResolvedValue({}) }
}));

const authController = require("../../src/controllers/authController");
const billingController = require("../../src/controllers/billingController");
const meetingController = require("../../src/controllers/meetingController");
const recordingController = require("../../src/controllers/recordingController");
const aiController = require("../../src/controllers/aiController");
const orgController = require("../../src/controllers/organizationController");
const integrationController = require("../../src/controllers/integrationController");

describe("controllers smoke tests", () => {
  test("auth controller handlers respond", async () => {
    const res = createRes();
    await authController.register({ validated: { body: {} } }, res, jest.fn());
    await authController.login({ validated: { body: {} }, headers: {}, ip: "127.0.0.1" }, res, jest.fn());
    await authController.me({ user: { id: 1 } }, res, jest.fn());
    expect(res.json).toHaveBeenCalled();
  });

  test("billing controller handlers respond", async () => {
    const res = createRes();
    await billingController.listPlans({}, res, jest.fn());
    await billingController.current({ user: { _id: "1" } }, res, jest.fn());
    expect(res.json).toHaveBeenCalled();
  });

  test("meeting/recording/ai controllers respond", async () => {
    const res = createRes();
    const req = { user: { _id: "1" }, params: { meetingId: "m", pollId: "p", questionId: "q", messageId: "x", noteId: "n", templateId: "t", itemId: "i" }, body: {}, query: {}, validated: { body: {} }, headers: {} };
    await meetingController.list(req, res, jest.fn());
    await meetingController.get(req, res, jest.fn());
    await recordingController.list(req, res, jest.fn());
    await aiController.getSummary(req, res, jest.fn());
    expect(res.json).toHaveBeenCalled();
  });

  test("organization and integration controllers respond", async () => {
    const res = createRes();
    const req = { user: { _id: "1", role: "superadmin" }, params: { organizationId: "o", departmentId: "d", webinarId: "w", pollId: "p", registrantId: "r", handle: "h", notificationId: "n", requesterId: "u" }, body: { token: "x" }, query: { state: "s", q: "test" } };
    await orgController.preferences(req, res, jest.fn());
    await orgController.superadminAnalytics(req, res, jest.fn());
    await integrationController.googleLoginUrl(req, res, jest.fn());
    await integrationController.googleCalendarStatus(req, res, jest.fn());
    expect(res.json).toHaveBeenCalled();
  });
});
