const authService = require("../../src/services/authService");
const { User, EmailVerificationToken, PasswordResetToken, Session, Subscription } = require("../../src/models");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");

describe("authService", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);

  test("registers a user and creates a subscription", async () => {
    const user = await authService.registerUser({
      email: "auth@example.com",
      password: "Password123!",
      displayName: "Auth User"
    });
    expect(user.email).toBe("auth@example.com");
    expect(await Subscription.countDocuments()).toBe(1);
    expect(await EmailVerificationToken.countDocuments()).toBe(1);
  });

  test("verifies email token", async () => {
    await authService.registerUser({ email: "verify@example.com", password: "Password123!", displayName: "Verify" });
    const record = await EmailVerificationToken.findOne().sort({ createdAt: -1 });
    const crypto = require("../../src/utils/crypto");
    const token = "manual";
    record.tokenHash = crypto.hashToken(token);
    await record.save();
    const user = await authService.verifyEmail(token);
    expect(user.isEmailVerified).toBe(true);
  });

  test("handles password reset flow", async () => {
    const user = await authService.registerUser({ email: "reset@example.com", password: "Password123!", displayName: "Reset" });
    user.isEmailVerified = true;
    user.isActive = true;
    await user.save();
    const token = await authService.sendPasswordReset(user.email);
    await authService.resetPassword(token, "NewPassword123!");
    expect(await PasswordResetToken.countDocuments({ usedAt: { $ne: null } })).toBe(1);
  });

  test("creates and revokes sessions", async () => {
    const user = await authService.registerUser({ email: "session@example.com", password: "Password123!", displayName: "Session" });
    user.isEmailVerified = true;
    user.isActive = true;
    await user.save();
    const session = await authService.loginUser({ email: user.email, password: "Password123!", userAgent: "jest", ipAddress: "127.0.0.1" });
    expect(session.accessToken).toBeTruthy();
    expect(await Session.countDocuments()).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const refreshed = await authService.refreshSession(session.refreshToken);
    expect(refreshed.accessToken).toBeTruthy();
    await authService.logoutSession(session.refreshToken);
    expect(await Session.countDocuments()).toBe(1);
  });
});
