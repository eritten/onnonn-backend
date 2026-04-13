const aiService = require("../../src/services/aiService");
const meetingService = require("../../src/services/meetingService");
const { Recording, AITranscription, AISummary } = require("../../src/models");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
const { createTestPlan, createTestUser } = require("../helpers");

jest.mock("../../src/config/openai", () => ({
  openai: null
}));

describe("aiService", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);

  test("generates transcription and summary records", async () => {
    const plan = await createTestPlan();
    const host = await createTestUser({ plan });
    const meeting = await meetingService.createMeeting(host._id, { title: "AI Meeting", scheduledStartTime: new Date().toISOString() });
    const recording = await Recording.create({ meeting: meeting._id, host: host._id, status: "ready", fileUrl: "https://example.com/file.mp4" });
    const transcription = await aiService.generateTranscription(recording);
    expect(transcription.status).toBe("completed");
    const summary = await aiService.generateSummary(meeting._id);
    expect(summary.status).toBe("completed");
    expect(await AITranscription.countDocuments()).toBe(1);
    expect(await AISummary.countDocuments()).toBe(1);
  });

  test("stores realtime captions", async () => {
    const result = await aiService.storeRealtimeCaption("meeting-1", { text: "caption" });
    expect(result.text).toBe("caption");
  });
});
