jest.mock("../../src/services/notificationService", () => ({
  sendEmail: jest.fn().mockResolvedValue({}),
  sendPush: jest.fn().mockResolvedValue({})
}));
jest.mock("../../src/services/recordingService", () => ({
  finalizeRecording: jest.fn().mockResolvedValue({})
}));
jest.mock("../../src/services/aiService", () => ({
  generateSummary: jest.fn().mockResolvedValue({}),
  generateSentiment: jest.fn().mockResolvedValue({}),
  generateCoachingReport: jest.fn().mockResolvedValue({}),
  generateFollowUpEmail: jest.fn().mockResolvedValue("draft")
}));
jest.mock("../../src/services/billingService", () => ({
  processStripeEvent: jest.fn().mockResolvedValue({})
}));
jest.mock("../../src/services/gdprService", () => ({
  processGdprRequest: jest.fn().mockResolvedValue({})
}));
jest.mock("../../src/services/calendarService", () => ({
  syncMeetingCreate: jest.fn().mockResolvedValue({}),
  syncMeetingUpdate: jest.fn().mockResolvedValue({}),
  syncMeetingDelete: jest.fn().mockResolvedValue({})
}));
jest.mock("../../src/services/analyticsService", () => ({
  computeMeetingAnalytics: jest.fn().mockResolvedValue({})
}));
jest.mock("../../src/models", () => ({
  Recording: { findById: jest.fn().mockResolvedValue({}), deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }) },
  Plan: { findOne: jest.fn().mockResolvedValue({ _id: "p" }) },
  Subscription: { find: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) }) },
  PasswordResetToken: { deleteMany: jest.fn().mockResolvedValue({}) },
  EmailVerificationToken: { deleteMany: jest.fn().mockResolvedValue({}) },
  OrganizationInvitation: { deleteMany: jest.fn().mockResolvedValue({}) },
  AuditLog: { deleteMany: jest.fn().mockResolvedValue({}) },
  MeetingParticipant: { find: jest.fn().mockResolvedValue([]) },
  Meeting: { findById: jest.fn().mockResolvedValue({ title: "Meeting" }) }
}));

const processors = [
  require("../../src/jobs/processors/emailProcessor"),
  require("../../src/jobs/processors/pushProcessor"),
  require("../../src/jobs/processors/recordingProcessingProcessor"),
  require("../../src/jobs/processors/aiSummaryProcessor"),
  require("../../src/jobs/processors/aiAnalysisProcessor"),
  require("../../src/jobs/processors/reminderProcessor"),
  require("../../src/jobs/processors/cleanupProcessor"),
  require("../../src/jobs/processors/subscriptionProcessor"),
  require("../../src/jobs/processors/gdprProcessor"),
  require("../../src/jobs/processors/calendarSyncProcessor"),
  require("../../src/jobs/processors/availabilityBookingProcessor"),
  require("../../src/jobs/processors/analyticsProcessor"),
  require("../../src/jobs/processors/followUpEmailProcessor")
];

describe("job processors", () => {
  test("processor functions execute", async () => {
    for (const processor of processors) {
      await processor({ data: { action: "create", meetingId: "m", requestId: "r", to: "a@example.com", send: false } });
    }
  });
});
