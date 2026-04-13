const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User, Plan, Subscription, Meeting } = require("../../src/models");

async function createTestPlan(overrides = {}) {
  return Plan.create({
    name: overrides.name || "Test Plan",
    slug: overrides.slug || `plan-${Date.now()}`,
    price: overrides.price || 0,
    stripePriceId: overrides.stripePriceId || `price_${Date.now()}`,
    limits: overrides.limits || {
      maxMeetingDurationMinutes: 40,
      maxParticipantsPerMeeting: 100,
      cloudRecordingStorageGb: 1,
      flags: { cloudRecording: true, aiTranscription: true, aiSummary: true }
    }
  });
}

async function createTestUser({ role = "user", plan, ...overrides } = {}) {
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const user = await User.create({
    email: overrides.email || `user-${Date.now()}-${Math.random()}@example.com`,
    passwordHash,
    displayName: overrides.displayName || "Test User",
    role,
    isEmailVerified: true,
    isActive: true,
    stripeCustomerId: overrides.stripeCustomerId || `cus_${Date.now()}`,
    personalRoomId: overrides.personalRoomId || `pmr-${Date.now()}`
  });
  if (plan) {
    await Subscription.create({ user: user._id, plan: plan._id, stripeCustomerId: user.stripeCustomerId, status: "active" });
  }
  return user;
}

async function createTestMeeting(host, overrides = {}) {
  return Meeting.create({
    host: host._id || host,
    title: overrides.title || "Test Meeting",
    scheduledStartTime: overrides.scheduledStartTime || new Date(),
    meetingId: overrides.meetingId || `MID${Date.now()}`,
    joinUrl: overrides.joinUrl || "http://localhost/join",
    liveKitRoomName: overrides.liveKitRoomName || `room-${Date.now()}`,
    status: overrides.status || "scheduled"
  });
}

function generateTestJWT(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_ACCESS_SECRET || "access-secret");
}

function mockStripeEvent(type, object = {}) {
  return { type, data: { object } };
}

function mockLiveKitWebhookPayload(event, extra = {}) {
  return { event, ...extra };
}

function mockOpenAIResponse(content = {}) {
  return { choices: [{ message: { content: JSON.stringify(content) } }] };
}

function mockFirebaseAdmin() {
  return { apps: [{}], messaging: () => ({ send: jest.fn().mockResolvedValue("message-id") }) };
}

module.exports = {
  createTestPlan,
  createTestUser,
  createTestMeeting,
  generateTestJWT,
  mockStripeEvent,
  mockLiveKitWebhookPayload,
  mockOpenAIResponse,
  mockFirebaseAdmin
};
