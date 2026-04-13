const bcrypt = require("bcryptjs");
const { authenticator } = require("otplib");
const QRCode = require("qrcode");
const dayjs = require("dayjs");
const {
  User,
  Session,
  PasswordResetToken,
  EmailVerificationToken,
  TwoFactorSecret,
  Subscription
} = require("../models");
const { createCustomer } = require("./stripeService");
const { getFreePlan } = require("./planService");
const { createNotification, sendEmail } = require("./notificationService");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { randomToken, hashToken, encrypt } = require("../utils/crypto");
const { AuthenticationError, ConflictError, NotFoundError } = require("../utils/errors");
const { getRedis } = require("../config/redis");

function generateVerificationOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateNumericOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function registerUser(payload) {
  const existing = await User.findOne({ email: payload.email.toLowerCase() });
  if (existing) {
    throw new ConflictError("Email is already in use");
  }
  const stripeCustomer = await createCustomer({ email: payload.email, name: payload.displayName });
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const user = await User.create({
    email: payload.email,
    passwordHash,
    displayName: payload.displayName,
    stripeCustomerId: stripeCustomer.id,
    personalRoomId: `pmr-${randomToken(4).slice(0, 8)}`
  });
  const freePlan = await getFreePlan();
  await Subscription.create({
    user: user._id,
    plan: freePlan._id,
    stripeCustomerId: stripeCustomer.id,
    status: "active"
  });
  await sendVerificationEmail(user);
  await createNotification({
    userId: user._id,
    type: "account.created",
    title: "Welcome to Onnonn",
    message: "Verify your email to activate your account."
  });
  return user;
}

async function sendVerificationEmail(user) {
  const otp = generateVerificationOtp();
  await EmailVerificationToken.create({
    user: user._id,
    tokenHash: hashToken(otp),
    expiresAt: dayjs().add(10, "minute").toDate()
  });
  await sendEmail({
    to: user.email,
    template: "emailVerification",
    variables: {
      name: user.displayName,
      otp
    }
  });
  return otp;
}

async function resendVerificationEmail(email) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  if (user.isEmailVerified) {
    throw new ConflictError("Email is already verified");
  }
  const code = generateNumericOtp();
  await EmailVerificationToken.deleteMany({ user: user._id, usedAt: null });
  await EmailVerificationToken.create({
    user: user._id,
    tokenHash: hashToken(code),
    expiresAt: dayjs().add(15, "minute").toDate()
  });
  await sendEmail({
    to: user.email,
    template: "emailVerification",
    variables: {
      name: user.displayName,
      otp: code
    }
  });
  return { sent: true };
}

async function verifyEmail({ email, code }) {
  if (!email || !code) {
    throw new AuthenticationError("Email and verification code are required");
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new AuthenticationError("Verification code is invalid or expired");
  }
  const record = await EmailVerificationToken.findOne({
    user: user._id,
    tokenHash: hashToken(code),
    expiresAt: { $gt: new Date() },
    usedAt: null
  });
  if (!record) {
    throw new AuthenticationError("Verification code is invalid or expired");
  }
  const verifiedUser = await User.findByIdAndUpdate(record.user, { isEmailVerified: true, isActive: true }, { new: true });
  record.usedAt = new Date();
  await record.save();
  await sendEmail({
    to: verifiedUser.email,
    template: "welcomeAfterVerification",
    variables: {
      name: verifiedUser.displayName
    }
  });
  return verifiedUser;
}

async function loginUser({ email, password, totpCode, userAgent, ipAddress }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.passwordHash) {
    throw new AuthenticationError("Invalid email or password");
  }
  if (user.suspended) {
    throw new AuthenticationError("Account is suspended");
  }
  if (!user.isEmailVerified) {
    throw new AuthenticationError("Email is not verified");
  }
  const matches = await user.comparePassword(password);
  if (!matches) {
    throw new AuthenticationError("Invalid email or password");
  }
  if (user.twoFactorEnabled) {
    const record = await TwoFactorSecret.findOne({ user: user._id });
    if (!record || !totpCode || !authenticator.check(totpCode, record.secret)) {
      throw new AuthenticationError("Invalid two-factor code");
    }
  }
  return createSession(user, { userAgent, ipAddress });
}

async function createSession(user, { userAgent, ipAddress }) {
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const rawRefreshToken = signRefreshToken({ sub: user._id.toString() });
  const refreshTokenHash = hashToken(rawRefreshToken);
  const session = await Session.create({
    user: user._id,
    refreshTokenHash,
    userAgent,
    ipAddress,
    expiresAt: dayjs().add(7, "day").toDate()
  });
  const redis = getRedis();
  await redis.sadd(`sessions:${user._id}`, session._id.toString());
  return { accessToken, refreshToken: rawRefreshToken, session };
}

async function refreshSession(refreshToken) {
  const payload = verifyRefreshToken(refreshToken);
  const refreshTokenHash = hashToken(refreshToken);
  const session = await Session.findOne({
    refreshTokenHash,
    user: payload.sub,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  }).populate("user");
  if (!session) {
    throw new AuthenticationError("Refresh token is invalid");
  }
  return createSession(session.user, { userAgent: session.userAgent, ipAddress: session.ipAddress });
}

async function logoutSession(refreshToken) {
  const refreshTokenHash = hashToken(refreshToken);
  const session = await Session.findOneAndDelete({ refreshTokenHash });
  if (session) {
    await getRedis().srem(`sessions:${session.user}`, session._id.toString());
  }
}

async function logoutAllSessions(userId) {
  const sessions = await Session.find({ user: userId });
  await Session.deleteMany({ user: userId });
  const redis = getRedis();
  for (const session of sessions) {
    await redis.srem(`sessions:${userId}`, session._id.toString());
  }
}

async function sendPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return null;
  }
  const code = generateNumericOtp();
  await PasswordResetToken.deleteMany({ user: user._id });
  await PasswordResetToken.create({
    user: user._id,
    tokenHash: hashToken(code),
    expiresAt: dayjs().add(15, "minute").toDate()
  });
  await sendEmail({
    to: user.email,
    template: "forgotPassword",
    variables: {
      name: user.displayName,
      resetToken: code
    }
  });
  return code;
}

async function resetPassword({ email, code, newPassword }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new AuthenticationError("Reset code is invalid or expired");
  }
  const record = await PasswordResetToken.findOne({
    user: user._id,
    tokenHash: hashToken(code),
    usedAt: null,
    expiresAt: { $gt: new Date() }
  });
  if (!record) {
    throw new AuthenticationError("Reset code is invalid or expired");
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(record.user, { passwordHash }, { new: true });
  await PasswordResetToken.deleteMany({ user: user._id });
  await logoutAllSessions(user._id);
  await sendEmail({
    to: user.email,
    template: "passwordResetConfirmation",
    variables: {
      name: user.displayName
    }
  });
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  const matches = await user.comparePassword(currentPassword);
  if (!matches) {
    throw new AuthenticationError("Current password is incorrect");
  }
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
}

async function generateTwoFactorSetup(userId) {
  const user = await User.findById(userId);
  const secret = authenticator.generateSecret();
  await TwoFactorSecret.findOneAndUpdate({ user: userId }, { secret }, { upsert: true, new: true });
  const otpauth = authenticator.keyuri(user.email, "Onnonn", secret);
  const qrCode = await QRCode.toDataURL(otpauth);
  return { secret, qrCode, otpauth };
}

async function enableTwoFactor(userId, code) {
  const record = await TwoFactorSecret.findOne({ user: userId });
  if (!record || !authenticator.check(code, record.secret)) {
    throw new AuthenticationError("Invalid two-factor code");
  }
  record.enabledAt = new Date();
  await record.save();
  await User.findByIdAndUpdate(userId, { twoFactorEnabled: true });
}

async function disableTwoFactor(userId, password) {
  const user = await User.findById(userId);
  const matches = await user.comparePassword(password);
  if (!matches) {
    throw new AuthenticationError("Password confirmation failed");
  }
  await TwoFactorSecret.findOneAndDelete({ user: userId });
  await User.findByIdAndUpdate(userId, { twoFactorEnabled: false });
}

async function updateProfile(userId, payload) {
  return User.findByIdAndUpdate(userId, payload, { new: true });
}

async function getCurrentUserProfile(userId) {
  const [user, subscription] = await Promise.all([
    User.findById(userId),
    Subscription.findOne({ user: userId }).populate("plan")
  ]);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const profile = user.toObject();
  profile.currentPlan = subscription ? {
    name: subscription.plan?.name || null,
    status: subscription.status,
    storageUsedBytes: subscription.storageUsedBytes || 0
  } : null;
  return profile;
}

async function listSessions(userId) {
  const redis = getRedis();
  const activeSessionIds = await redis.smembers(`sessions:${userId}`);
  const filter = {
    user: userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  };
  if (activeSessionIds.length) {
    filter._id = { $in: activeSessionIds };
  }
  return Session.find(filter).sort({ createdAt: -1 });
}

async function revokeSession(userId, sessionId) {
  const session = await Session.findOneAndDelete({ _id: sessionId, user: userId });
  if (session) {
    await getRedis().srem(`sessions:${userId}`, session._id.toString());
  }
}

async function saveGoogleTokens(userId, { googleId, accessToken, refreshToken }) {
  return User.findByIdAndUpdate(
    userId,
    {
      googleId,
      googleAccessTokenEncrypted: accessToken ? encrypt(accessToken) : undefined,
      googleRefreshTokenEncrypted: refreshToken ? encrypt(refreshToken) : undefined
    },
    { new: true }
  );
}

module.exports = {
  registerUser,
  sendVerificationEmail,
  resendVerificationEmail,
  verifyEmail,
  loginUser,
  refreshSession,
  logoutSession,
  logoutAllSessions,
  sendPasswordReset,
  resetPassword,
  changePassword,
  generateTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  updateProfile,
  getCurrentUserProfile,
  listSessions,
  revokeSession,
  saveGoogleTokens
};
