const mongoose = require("mongoose");

const { Schema } = mongoose;

const auditFields = {
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

const reactionSchema = new Schema(
  {
    participantId: { type: Schema.Types.ObjectId, ref: "MeetingParticipant" },
    emoji: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const recurrenceSchema = new Schema(
  {
    frequency: { type: String, enum: ["daily", "weekly", "monthly"] },
    interval: { type: Number, default: 1 },
    daysOfWeek: [{ type: String }],
    endDate: Date,
    occurrenceCount: Number
  },
  { _id: false }
);

const analyticsSchema = new Schema(
  {
    totalDuration: Number,
    scheduledVsActualDiff: Number,
    participantCount: Number,
    peakConcurrent: Number,
    perParticipantEngagement: [{ participantName: String, score: Number }],
    recordingDuration: Number,
    pollParticipationRate: Number,
    qnaCount: Number,
    avgNetworkQuality: Number,
    chatMessageCount: Number,
    reactionCount: Number,
    engagementScore: Number
  },
  { _id: false }
);

module.exports = { Schema, auditFields, reactionSchema, recurrenceSchema, analyticsSchema };
