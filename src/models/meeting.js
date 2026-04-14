const mongoose = require("mongoose");
const { Schema, auditFields, reactionSchema, recurrenceSchema, analyticsSchema } = require("./common");

const meetingSchema = new Schema({
  host: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  coHostIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  title: { type: String, required: true, index: true },
  description: String,
  scheduledStartTime: { type: Date, default: Date.now, index: true },
  expectedDuration: Number,
  maxParticipants: Number,
  passwordHash: String,
  waitingRoomEnabled: { type: Boolean, default: false },
  joinBeforeHost: { type: Boolean, default: false },
  muteOnEntry: { type: Boolean, default: false },
  allowSelfUnmute: { type: Boolean, default: true },
  autoRecord: { type: Boolean, default: false },
  meetingType: { type: String, enum: ["one-on-one", "group", "webinar"], default: "group" },
  e2eEncryptionEnabled: { type: Boolean, default: false },
  meetingId: { type: String, unique: true, index: true },
  joinUrl: String,
  liveKitRoomName: { type: String, required: true, unique: true },
  status: { type: String, enum: ["scheduled", "ongoing", "ended", "cancelled"], default: "scheduled", index: true },
  recurrence: recurrenceSchema,
  personalRoom: { type: Boolean, default: false },
  template: { type: Schema.Types.ObjectId, ref: "MeetingTemplate" },
  lockedAt: Date,
  endedAt: Date,
  actualDuration: Number,
  reactions: [reactionSchema],
  agenda: { type: Schema.Types.Mixed, default: null },
  followUpEmailDraft: String,
  externalCalendarEvents: [{ provider: String, calendarId: String, eventId: String }],
  analytics: analyticsSchema,
  ...auditFields
});

const meetingParticipantSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", index: true },
  guestName: String,
  email: String,
  role: { type: String, enum: ["host", "cohost", "participant", "guest"], default: "participant" },
  joinedAt: Date,
  leftAt: Date,
  raisedHandAt: Date,
  consentedToRecording: Boolean,
  ...auditFields
});

const breakoutRoomSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, index: true },
  name: { type: String, required: true },
  liveKitRoomName: { type: String, required: true, unique: true },
  participantIds: [{ type: Schema.Types.ObjectId, ref: "MeetingParticipant" }],
  status: { type: String, enum: ["open", "closed"], default: "open" },
  ...auditFields
});

const pollSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, index: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  status: { type: String, enum: ["active", "ended"], default: "active" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  ...auditFields
});

const pollResponseSchema = new Schema({
  poll: { type: Schema.Types.ObjectId, ref: "Poll", required: true, index: true },
  participant: { type: Schema.Types.ObjectId, ref: "MeetingParticipant" },
  guestName: String,
  selectedOption: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator(value) {
        return (Number.isInteger(value) && value >= 0) || (typeof value === "string" && value.trim().length > 0);
      },
      message: "selectedOption must be a non-negative option index or a non-empty option value"
    }
  },
  ...auditFields
});

const qnaQuestionSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, refPath: "meetingRefModel", required: true, index: true },
  meetingRefModel: { type: String, enum: ["Meeting", "Webinar"], default: "Meeting" },
  asker: { type: Schema.Types.ObjectId, ref: "User" },
  guestName: String,
  question: { type: String, required: true },
  upvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  answeredAt: Date,
  dismissedAt: Date,
  answerText: String,
  isPublic: { type: Boolean, default: true },
  ...auditFields
});

const chatMessageSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: "User" },
  guestName: String,
  content: { type: String, required: true },
  messageType: { type: String, enum: ["public", "private", "file"], default: "public" },
  recipient: { type: Schema.Types.ObjectId, ref: "User" },
  fileUrl: String,
  fileName: String,
  fileSizeBytes: Number,
  mimeType: String,
  isPinned: { type: Boolean, default: false },
  deletedAt: Date,
  flagged: { type: Boolean, default: false },
  moderationResult: { type: Schema.Types.Mixed, default: null },
  ...auditFields
});

const whiteboardSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, unique: true },
  canvasState: { type: Schema.Types.Mixed, default: {} },
  lastUpdatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date, default: Date.now }
});

const meetingNoteSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, index: true },
  content: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  ...auditFields
});

const recordingShareSchema = new Schema(
  {
    token: { type: String, required: true },
    passwordHash: String,
    expiresAt: Date
  },
  { _id: false }
);

const recordingSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, index: true },
  host: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  liveKitEgressId: { type: String, index: true },
  status: { type: String, enum: ["pending", "recording", "processing", "ready", "failed", "deleted"], default: "pending", index: true },
  startTime: Date,
  endTime: Date,
  duration: Number,
  fileSizeBytes: Number,
  fileUrl: String,
  storageProvider: String,
  transcriptionStatus: { type: String, default: "pending" },
  summaryStatus: { type: String, default: "pending" },
  consentResponses: [{ participant: { type: Schema.Types.ObjectId, ref: "MeetingParticipant" }, consented: Boolean }],
  shareLinks: [recordingShareSchema],
  passwordHash: String,
  expiresAt: Date,
  ...auditFields
});

const webinarSchema = new Schema({
  host: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true },
  description: String,
  scheduledTime: { type: Date, required: true },
  practiceSessionTime: Date,
  registrationRequired: { type: Boolean, default: true },
  maxAttendees: Number,
  status: { type: String, enum: ["scheduled", "live", "ended", "cancelled"], default: "scheduled", index: true },
  liveKitRoomName: { type: String, required: true, unique: true },
  panelists: [{ type: Schema.Types.ObjectId, ref: "User" }],
  recording: { type: Schema.Types.ObjectId, ref: "Recording" },
  analytics: { type: Schema.Types.Mixed, default: {} },
  autoShareRecording: { type: Boolean, default: false },
  ...auditFields
});

const webinarRegistrantSchema = new Schema({
  webinar: { type: Schema.Types.ObjectId, ref: "Webinar", required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  customFields: { type: Schema.Types.Mixed, default: {} },
  joinToken: { type: String, required: true, unique: true, index: true },
  joinedAt: Date,
  leftAt: Date,
  ...auditFields
});

const webinarAttendantSchema = new Schema({
  webinar: { type: Schema.Types.ObjectId, ref: "Webinar", required: true, index: true },
  registrant: { type: Schema.Types.ObjectId, ref: "WebinarRegistrant" },
  joinedAt: Date,
  leftAt: Date,
  watchDurationMinutes: Number,
  ...auditFields
});

const aiTranscriptionSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, unique: true },
  recording: { type: Schema.Types.ObjectId, ref: "Recording", required: true },
  segments: [{ startTime: Number, endTime: Number, speakerLabel: String, text: String, confidence: Number }],
  fullText: String,
  language: String,
  status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
  translations: { type: Schema.Types.Mixed, default: {} },
  ...auditFields
});

const aiSummarySchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, unique: true },
  overview: String,
  keyPoints: [{ type: String }],
  decisions: [{ type: String }],
  actionItems: [{ assigneeName: String, task: String, deadline: String }],
  nextSteps: [{ type: String }],
  smartNotes: [{ type: String }],
  status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
  ...auditFields
});

const aiActionItemSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, index: true },
  assigneeName: String,
  assigneeUser: { type: Schema.Types.ObjectId, ref: "User" },
  task: { type: String, required: true },
  deadline: Date,
  completedAt: Date,
  notes: String,
  ...auditFields
});

const aiMeetingCoachSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, unique: true },
  speakingTimeBalance: { type: Schema.Types.Mixed, default: {} },
  interruptionCount: Number,
  offTopicMoments: [{ timestamp: Number, description: String }],
  concisenessFeedback: String,
  positiveMoments: [{ type: String }],
  overallScore: Number,
  summary: String,
  ...auditFields
});

const aiSentimentSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, unique: true },
  overallSentiment: { type: String, enum: ["positive", "neutral", "negative"] },
  overallScore: Number,
  segments: [{ startTime: Number, endTime: Number, sentimentLabel: String, score: Number }],
  timeline: [{ timestamp: Number, score: Number }],
  ...auditFields
});

const aiEmbeddingSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, unique: true },
  embeddingVector: [{ type: Number }],
  sourceText: String,
  ...auditFields
});

const virtualBackgroundSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  imageUrl: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  ...auditFields
});

const meetingTemplateSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true },
  settings: { type: Schema.Types.Mixed, default: {} },
  ...auditFields
});

module.exports = {
  Meeting: mongoose.model("Meeting", meetingSchema),
  MeetingParticipant: mongoose.model("MeetingParticipant", meetingParticipantSchema),
  BreakoutRoom: mongoose.model("BreakoutRoom", breakoutRoomSchema),
  Poll: mongoose.model("Poll", pollSchema),
  PollResponse: mongoose.model("PollResponse", pollResponseSchema),
  QnAQuestion: mongoose.model("QnAQuestion", qnaQuestionSchema),
  ChatMessage: mongoose.model("ChatMessage", chatMessageSchema),
  Whiteboard: mongoose.model("Whiteboard", whiteboardSchema),
  MeetingNote: mongoose.model("MeetingNote", meetingNoteSchema),
  Recording: mongoose.model("Recording", recordingSchema),
  RecordingShare: mongoose.model("RecordingShare", new Schema({ recording: { type: Schema.Types.ObjectId, ref: "Recording" }, token: String, passwordHash: String, expiresAt: Date }, { timestamps: true })),
  Webinar: mongoose.model("Webinar", webinarSchema),
  WebinarRegistrant: mongoose.model("WebinarRegistrant", webinarRegistrantSchema),
  WebinarAttendant: mongoose.model("WebinarAttendant", webinarAttendantSchema),
  AITranscription: mongoose.model("AITranscription", aiTranscriptionSchema),
  AISummary: mongoose.model("AISummary", aiSummarySchema),
  AIActionItem: mongoose.model("AIActionItem", aiActionItemSchema),
  AIMeetingCoach: mongoose.model("AIMeetingCoach", aiMeetingCoachSchema),
  AISentiment: mongoose.model("AISentiment", aiSentimentSchema),
  AIEmbedding: mongoose.model("AIEmbedding", aiEmbeddingSchema),
  VirtualBackground: mongoose.model("VirtualBackground", virtualBackgroundSchema),
  MeetingTemplate: mongoose.model("MeetingTemplate", meetingTemplateSchema)
};
