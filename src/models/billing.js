const mongoose = require("mongoose");
const { Schema, auditFields } = require("./common");

const planSchema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  currency: { type: String, default: "usd" },
  stripePriceId: { type: String, required: true, unique: true },
  limits: {
    maxMeetingDurationMinutes: { type: Number, required: true },
    maxParticipantsPerMeeting: { type: Number, required: true },
    cloudRecordingStorageGb: { type: Number, required: true },
    flags: { type: Schema.Types.Mixed, default: {} }
  },
  ...auditFields
});

const subscriptionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  plan: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
  stripeSubscriptionId: { type: String, index: true },
  stripeCustomerId: { type: String, required: true, index: true },
  status: { type: String, default: "active", index: true },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: { type: Boolean, default: false },
  storageUsedBytes: { type: Number, default: 0 },
  meetingMinutesUsed: { type: Number, default: 0 },
  aiTranslationCount: { type: Number, default: 0 },
  ...auditFields
});

const invoiceSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  subscription: { type: Schema.Types.ObjectId, ref: "Subscription" },
  stripeInvoiceId: { type: String, unique: true, index: true },
  amountPaid: Number,
  currency: String,
  invoicePdfUrl: String,
  hostedInvoiceUrl: String,
  paidAt: Date,
  status: String,
  ...auditFields
});

module.exports = {
  Plan: mongoose.model("Plan", planSchema),
  Subscription: mongoose.model("Subscription", subscriptionSchema),
  Invoice: mongoose.model("Invoice", invoiceSchema)
};
