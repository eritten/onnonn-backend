const recordingService = require("../../src/services/recordingService");
const meetingService = require("../../src/services/meetingService");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
const { createTestPlan, createTestUser } = require("../helpers");
const { Recording } = require("../../src/models");

describe("recordingService", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);

  test("starts and finalizes a recording", async () => {
    const plan = await createTestPlan();
    const host = await createTestUser({ plan });
    const meeting = await meetingService.createMeeting(host._id, {
      title: "Record Meeting",
      scheduledStartTime: new Date().toISOString()
    });
    const recording = await recordingService.startMeetingRecording(meeting.meetingId, host._id);
    expect(recording.status).toBe("recording");
    const finalized = await recordingService.finalizeRecording({ recordingId: recording._id, fileBuffer: Buffer.from("file") });
    expect(finalized.status).toBe("ready");
  });

  test("shares recordings", async () => {
    const plan = await createTestPlan();
    const host = await createTestUser({ plan });
    const meeting = await meetingService.createMeeting(host._id, {
      title: "Share Meeting",
      scheduledStartTime: new Date().toISOString()
    });
    const recording = await Recording.create({ meeting: meeting._id, host: host._id, status: "ready", fileUrl: "https://file" });
    const share = await recordingService.shareRecording(recording._id, host._id, {});
    const found = await recordingService.getSharedRecording(share.token);
    expect(found._id.toString()).toBe(recording._id.toString());
  });
});
