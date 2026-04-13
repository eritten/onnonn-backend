const mongoose = require("mongoose");
const { Schema, auditFields } = require("./common");

const notificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now }
});

const notificationPreferenceSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  preferences: { type: Schema.Types.Mixed, default: {} },
  ...auditFields
});

const deviceTokenSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  token: { type: String, required: true, unique: true },
  platform: { type: String, enum: ["ios", "android", "web"], required: true },
  createdAt: { type: Date, default: Date.now }
});

const auditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  action: { type: String, required: true, index: true },
  resourceType: { type: String, required: true, index: true },
  resourceId: { type: String },
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} }
});

const gdprRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["export", "deletion"], required: true },
  status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
  requestedAt: { type: Date, default: Date.now },
  completedAt: Date,
  downloadUrl: String,
  ...auditFields
});

const platformMetricsSchema = new Schema({
  metricDate: { type: Date, required: true, index: true },
  openAiUsageCost: { type: Number, default: 0 },
  totalStorageBytes: { type: Number, default: 0 },
  newUsers: { type: Number, default: 0 },
  meetingsCreated: { type: Number, default: 0 },
  ...auditFields
});

module.exports = {
  Notification: mongoose.model("Notification", notificationSchema),
  NotificationPreference: mongoose.model("NotificationPreference", notificationPreferenceSchema),
  DeviceToken: mongoose.model("DeviceToken", deviceTokenSchema),
  AuditLog: mongoose.model("AuditLog", auditLogSchema),
  GDPRRequest: mongoose.model("GDPRRequest", gdprRequestSchema),
  PlatformMetrics: mongoose.model("PlatformMetrics", platformMetricsSchema)
};
