const authService = require("../../src/services/authService");
const meetingService = require("../../src/services/meetingService");
const recordingService = require("../../src/services/recordingService");
const organizationService = require("../../src/services/organizationService");
const contactService = require("../../src/services/contactService");
const schedulingService = require("../../src/services/schedulingService");
const analyticsService = require("../../src/services/analyticsService");
const exportService = require("../../src/services/exportService");
const webinarService = require("../../src/services/webinarService");
const planService = require("../../src/services/planService");
const {
  User,
  Session,
  Meeting,
  MeetingParticipant,
  QnAQuestion,
  Webinar,
  WebinarRegistrant,
  WebinarAttendant,
  Organization,
  CalendarConnection,
  AIEmbedding,
  AITranscription,
  AISummary,
  Recording
} = require("../../src/models");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
const { createTestPlan, createTestUser, createTestMeeting } = require("../helpers");

function createResStream() {
  const chunks = [];
  return {
    chunks,
    setHeader: jest.fn(),
    write: (chunk) => chunks.push(chunk.toString()),
    end: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    removeListener: jest.fn()
  };
}

describe("database-backed services extended coverage", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(async () => {
    await clearTestDb();
    await planService.ensureDefaultPlans();
  });

  test("auth service covers password change, profile, sessions, 2fa, google tokens", async () => {
    const user = await authService.registerUser({ email: "fullauth@example.com", password: "Password123!", displayName: "Full Auth" });
    user.isEmailVerified = true;
    user.isActive = true;
    await user.save();
    const login = await authService.loginUser({ email: user.email, password: "Password123!", userAgent: "jest", ipAddress: "127.0.0.1" });
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const refreshed = await authService.refreshSession(login.refreshToken);
    expect(refreshed.accessToken).toBeTruthy();
    await authService.changePassword(user._id, "Password123!", "NewPassword123!");
    const setup = await authService.generateTwoFactorSetup(user._id);
    expect(setup.secret).toBeTruthy();
    await authService.updateProfile(user._id, { bio: "Updated bio" });
    const sessions = await authService.listSessions(user._id);
    expect(sessions.length).toBeGreaterThan(0);
    await authService.revokeSession(user._id, sessions[0]._id);
    await authService.saveGoogleTokens(user._id, { googleId: "gid", accessToken: "at", refreshToken: "rt" });
    await authService.logoutAllSessions(user._id);
    expect(await Session.countDocuments({ user: user._id })).toBe(0);
  });

  test("meeting service covers waiting room, hands, chat, whiteboard, templates and notes", async () => {
    const plan = await createTestPlan({ slug: "svc-meeting" });
    const host = await createTestUser({ email: "host@example.com", plan });
    const other = await createTestUser({ email: "other@example.com", plan });
    const meeting = await meetingService.createMeeting(host._id, {
      title: "Deep Meeting",
      scheduledStartTime: new Date().toISOString(),
      waitingRoomEnabled: true,
      meetingType: "group"
    });
    await meetingService.generateParticipantToken({ meetingId: meeting.meetingId, userId: other._id });
    expect((await meetingService.listWaitingParticipants(meeting.meetingId)).length).toBeGreaterThan(0);
    await meetingService.admitAllWaiting(meeting.meetingId);
    await meetingService.addCoHost(meeting.meetingId, other._id);
    await meetingService.removeCoHost(meeting.meetingId, other._id);
    await meetingService.setMeetingLock(meeting.meetingId, true);
    await meetingService.setMeetingLock(meeting.meetingId, false);
    await meetingService.raiseHand(meeting.meetingId, other._id);
    expect((await meetingService.listRaisedHands(meeting.meetingId)).length).toBe(1);
    await meetingService.lowerHand(meeting.meetingId, other._id);
    const participant = await MeetingParticipant.findOne({ meeting: meeting._id });
    await meetingService.addReaction(meeting.meetingId, participant._id, "👍");
    const breakout = await meetingService.createBreakoutRooms(meeting.meetingId, [{ name: "Room 1", participantIds: [participant._id] }]);
    expect(breakout.length).toBe(1);
    await meetingService.closeBreakoutRooms(meeting.meetingId);
    const question = await meetingService.submitQuestion(meeting.meetingId, { question: "Question?" });
    await meetingService.upvoteQuestion(question._id, host._id);
    await meetingService.answerQuestion(question._id, "Answer", true);
    await meetingService.dismissQuestion(question._id);
    expect((await meetingService.listQuestions(meeting.meetingId)).length).toBe(1);
    await meetingService.sendChatMessage(meeting.meetingId, { userId: host._id }, { content: "hello", messageType: "public" });
    const messages = await meetingService.listChatMessages(meeting.meetingId, host._id);
    await meetingService.pinChatMessage(messages[0]._id, true);
    await meetingService.deleteChatMessage(messages[0]._id);
    await meetingService.updateWhiteboard(meeting.meetingId, host._id, { shapes: [] });
    expect((await meetingService.getWhiteboard(meeting.meetingId)).canvasState).toEqual({ shapes: [] });
    const template = await meetingService.createTemplate(host._id, { name: "T1", settings: { muteOnEntry: true } });
    await meetingService.updateTemplate(template._id, host._id, { name: "T2" });
    expect((await meetingService.listTemplates(host._id)).length).toBe(1);
    await meetingService.addNote(meeting.meetingId, host._id, "Note 1");
    const notes = await meetingService.getNotes(meeting.meetingId);
    await meetingService.updateNote(notes[0]._id, host._id, "Note 2");
    await meetingService.deleteNote(notes[0]._id);
    await meetingService.deleteTemplate(template._id, host._id);
  });

  test("meeting service covers polls and participants", async () => {
    const plan = await createTestPlan({ slug: "svc-meeting-2" });
    const host = await createTestUser({ email: "host2@example.com", plan });
    const meeting = await meetingService.createMeeting(host._id, { title: "Polls", scheduledStartTime: new Date().toISOString() });
    const poll = await meetingService.createPoll(meeting.meetingId, host._id, { question: "Pick", options: ["A", "B"] });
    await meetingService.respondToPoll(poll._id, { guestName: "Guest", selectedOption: 1 });
    const results = await meetingService.getPollResults(poll._id);
    expect(results.totalResponses).toBe(1);
    await meetingService.endPoll(poll._id);
    expect(Array.isArray(await meetingService.listCurrentParticipants(meeting.meetingId))).toBe(true);
  });

  test("recording service covers stop, list, delete", async () => {
    const plan = await createTestPlan({ slug: "svc-recording", limits: { maxMeetingDurationMinutes: 40, maxParticipantsPerMeeting: 100, cloudRecordingStorageGb: 2, flags: { cloudRecording: true } } });
    const host = await createTestUser({ email: "record@example.com", plan });
    const meeting = await meetingService.createMeeting(host._id, { title: "Rec", scheduledStartTime: new Date().toISOString() });
    let recording = await recordingService.startMeetingRecording(meeting.meetingId, host._id);
    recording = await recordingService.stopMeetingRecording(recording._id, host._id);
    await recordingService.finalizeRecording({ recordingId: recording._id, fileBuffer: Buffer.from("abc") });
    expect((await recordingService.listRecordings(host._id, {})).items.length).toBe(1);
    await recordingService.deleteRecording(recording._id, host._id);
    expect((await recordingService.getRecording(recording._id, host._id)).status).toBe("deleted");
  });

  test("organization and contact services cover invitations, departments, contacts, analytics", async () => {
    const owner = await createTestUser({ email: "owner@example.com" });
    const member = await createTestUser({ email: "member@example.com" });
    const org = await organizationService.createOrganization(owner._id, { name: "Org" });
    const invite = await organizationService.inviteMember(org._id, member.email, "member");
    await organizationService.acceptInvitation(invite.token, member._id);
    const dept = await organizationService.createDepartment(org._id, { name: "Dept" });
    await organizationService.updateDepartment(dept._id, { description: "Desc" });
    expect((await organizationService.listDepartments(org._id)).length).toBe(1);
    await contactService.sendContactRequest(owner._id, member._id);
    expect((await contactService.listPendingRequests(member._id)).length).toBe(1);
    await contactService.respondToContactRequest(owner._id, member._id, "accepted");
    expect((await contactService.listContacts(owner._id)).length).toBe(1);
    expect((await contactService.searchUsers("owner")).length).toBeGreaterThan(0);
    expect(await organizationService.getOrganizationAnalytics(org._id)).toBeTruthy();
    await organizationService.upsertSsoConfiguration(org._id, { idpEntityId: "idp", isActive: true });
    await organizationService.removeMember(org._id, member._id);
    await organizationService.deleteDepartment(dept._id);
  });

  test("scheduling, analytics, export and webinar services cover business flows", async () => {
    const plan = await createTestPlan({ slug: "svc-schedule" });
    const host = await createTestUser({ email: "sched@example.com", plan });
    await schedulingService.upsertAvailability(host._id, {
      bookingHandle: "sched-host",
      slots: [{ dayOfWeek: new Date().getDay(), startTime: "09:00", endTime: "17:00" }],
      meetingDuration: 30
    });
    const slots = await schedulingService.listAvailableSlots("sched-host");
    expect(slots.length).toBeGreaterThan(0);
    const booking = await schedulingService.bookAvailability("sched-host", {
      bookerName: "Guest",
      bookerEmail: "guest@example.com",
      scheduledTime: slots[0]
    });
    const meeting = await Meeting.findById(booking.meeting._id);
    await Recording.create({ meeting: meeting._id, host: host._id, status: "ready", duration: 10, fileSizeBytes: 50, fileUrl: "https://x" });
    await analyticsService.computeMeetingAnalytics(meeting._id);
    expect((await analyticsService.getUserAnalytics(host._id)).totalMeetingsHosted).toBeGreaterThan(0);
    const res = createResStream();
    await exportService.streamMeetingsCsv(res, {});
    await exportService.streamUsersCsv(createResStream());
    await exportService.streamRecordingsCsv(createResStream(), {});
    const webinar = await webinarService.createWebinar(host._id, { title: "Web", scheduledTime: new Date(), panelistEmails: ["panel@example.com"] });
    const registrant = await webinarService.registerForWebinar(webinar._id, { name: "R", email: "r@example.com" });
    expect((await webinarService.listRegistrants(webinar._id)).length).toBe(1);
    await webinarService.getPanelistToken(webinar._id, host._id);
    await webinarService.getAttendeeToken(registrant.joinToken);
    const poll = await webinarService.createWebinarPoll(webinar._id, host._id, { question: "Q", options: ["Y", "N"] });
    expect(poll.question).toBe("Q");
    await webinarService.answerWebinarQuestion(webinar._id, { question: "Question" });
    expect((await webinarService.computeWebinarAnalytics(webinar._id)).totalRegistrants).toBe(1);
    const rec = await Recording.create({ meeting: meeting._id, host: host._id, status: "ready", fileUrl: "https://rec" });
    await Webinar.findByIdAndUpdate(webinar._id, { recording: rec._id, autoShareRecording: true });
    expect(await webinarService.autoShareRecordingToRegistrants(webinar._id)).toBe(1);
  });
});
