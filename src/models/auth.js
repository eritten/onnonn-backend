const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema, auditFields } = require("./common");

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  passwordHash: { type: String },
  displayName: { type: String, required: true },
  profilePhotoUrl: String,
  jobTitle: String,
  companyName: String,
  phoneNumber: String,
  timezone: { type: String, default: "UTC" },
  languagePreference: { type: String, default: "en" },
  bio: String,
  role: { type: String, enum: ["user", "organization_admin", "superadmin"], default: "user", index: true },
  isEmailVerified: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: false },
  stripeCustomerId: { type: String, index: true },
  googleId: { type: String, index: true },
  googleAccessTokenEncrypted: String,
  googleRefreshTokenEncrypted: String,
  suspended: { type: Boolean, default: false, index: true },
  suspensionReason: String,
  twoFactorEnabled: { type: Boolean, default: false },
  personalRoomId: { type: String, unique: true, sparse: true },
  personalRoomSettings: {
    waitingRoomEnabled: { type: Boolean, default: false },
    muteOnEntry: { type: Boolean, default: false },
    joinBeforeHost: { type: Boolean, default: false }
  },
  chatMutedMeetingIds: [{ type: Schema.Types.ObjectId, ref: "Meeting" }],
  ...auditFields
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash || "");
};

function stripSensitiveUserFields(_doc, ret) {
  delete ret.passwordHash;
  delete ret.googleAccessTokenEncrypted;
  delete ret.googleRefreshTokenEncrypted;
  delete ret.__v;
  return ret;
}

userSchema.set("toJSON", { transform: stripSensitiveUserFields });
userSchema.set("toObject", { transform: stripSensitiveUserFields });

const sessionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  refreshTokenHash: { type: String, required: true, unique: true },
  userAgent: String,
  ipAddress: String,
  expiresAt: { type: Date, required: true, index: true },
  isRevoked: { type: Boolean, default: false },
  ...auditFields
});

const passwordResetTokenSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: true },
  usedAt: Date,
  ...auditFields
});

const emailVerificationTokenSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: true },
  usedAt: Date,
  ...auditFields
});

const twoFactorSecretSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  secret: { type: String, required: true },
  backupCodes: [{ type: String }],
  enabledAt: Date,
  ...auditFields
});

module.exports = {
  User: mongoose.model("User", userSchema),
  Session: mongoose.model("Session", sessionSchema),
  PasswordResetToken: mongoose.model("PasswordResetToken", passwordResetTokenSchema),
  EmailVerificationToken: mongoose.model("EmailVerificationToken", emailVerificationTokenSchema),
  TwoFactorSecret: mongoose.model("TwoFactorSecret", twoFactorSecretSchema)
};
