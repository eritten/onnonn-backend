const app = require("../../src/app");
const models = require("../../src/models");

describe("config, models and route registration", () => {
  test.each([
    "User",
    "Session",
    "PasswordResetToken",
    "EmailVerificationToken",
    "TwoFactorSecret",
    "Plan",
    "Subscription",
    "Invoice",
    "Contact",
    "ContactRequest",
    "Organization",
    "OrganizationMember",
    "Department",
    "SSOConfiguration",
    "CalendarConnection",
    "Availability",
    "AvailabilityBooking",
    "Notification",
    "NotificationPreference",
    "DeviceToken",
    "AuditLog",
    "GDPRRequest",
    "PlatformMetrics",
    "Meeting",
    "MeetingParticipant",
    "BreakoutRoom",
    "Poll",
    "PollResponse",
    "QnAQuestion",
    "ChatMessage",
    "Whiteboard",
    "MeetingNote",
    "Recording",
    "RecordingShare",
    "Webinar",
    "WebinarRegistrant",
    "WebinarAttendant",
    "AITranscription",
    "AISummary",
    "AIActionItem",
    "AIMeetingCoach",
    "AISentiment",
    "AIEmbedding",
    "VirtualBackground",
    "MeetingTemplate"
  ])("exports model %s", (name) => {
    expect(models[name]).toBeTruthy();
  });

  test.each([
    "listen",
    "use"
  ])("app exposes %s", (field) => {
    expect(app[field]).toBeTruthy();
  });

  test.each([
    "../../src/config/env",
    "../../src/config/logger",
    "../../src/config/swagger",
    "../../src/config/stripe",
    "../../src/config/openai",
    "../../src/config/redis",
    "../../src/config/db",
    "../../src/config/cloudinary",
    "../../src/config/mailer",
    "../../src/config/firebase",
    "../../src/config/livekit"
  ])("loads config module %s", (modulePath) => {
    expect(require(modulePath)).toBeTruthy();
  });
});
