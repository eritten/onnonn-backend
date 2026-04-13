const meetingService = require("../../src/services/meetingService");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
const { createTestPlan, createTestUser } = require("../helpers");
const { Meeting, PollResponse, MeetingNote } = require("../../src/models");

describe("meetingService", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);

  test("creates and updates a meeting", async () => {
    const plan = await createTestPlan();
    const host = await createTestUser({ plan });
    const meeting = await meetingService.createMeeting(host._id, {
      title: "Team Sync",
      scheduledStartTime: new Date().toISOString(),
      meetingType: "group"
    });
    expect(meeting.meetingId).toBeTruthy();
    const updated = await meetingService.updateMeeting(meeting.meetingId, host._id, { description: "Updated" });
    expect(updated.description).toBe("Updated");
  });

  test("supports polls and notes", async () => {
    const plan = await createTestPlan();
    const host = await createTestUser({ plan });
    const meeting = await meetingService.createMeeting(host._id, {
      title: "Poll Meeting",
      scheduledStartTime: new Date().toISOString(),
      meetingType: "group"
    });
    const poll = await meetingService.createPoll(meeting.meetingId, host._id, { question: "Ready?", options: ["Yes", "No"] });
    await meetingService.respondToPoll(poll._id, { guestName: "Guest", selectedOption: 0 });
    expect(await PollResponse.countDocuments({ poll: poll._id })).toBe(1);
    await meetingService.addNote(meeting.meetingId, host._id, "Key note");
    expect(await MeetingNote.countDocuments()).toBe(1);
  });

  test("ends meetings", async () => {
    const plan = await createTestPlan();
    const host = await createTestUser({ plan });
    const meeting = await meetingService.createMeeting(host._id, {
      title: "End Meeting",
      scheduledStartTime: new Date().toISOString(),
      meetingType: "group"
    });
    const ended = await meetingService.endMeeting(meeting.meetingId, host._id);
    expect(ended.status).toBe("ended");
    expect(await Meeting.countDocuments({ status: "ended" })).toBe(1);
  });
});
