const ShortUniqueId = require("short-unique-id");
const { Webinar, WebinarRegistrant, WebinarAttendant, Poll, PollResponse, QnAQuestion, Recording } = require("../models");
const { createRoom, buildLiveKitToken } = require("./livekitService");
const { sendEmail } = require("./notificationService");
const { NotFoundError, AuthorizationError } = require("../utils/errors");

const uid = new ShortUniqueId({ length: 12 });

async function createWebinar(hostId, payload) {
  const liveKitRoomName = `webinar-${uid.rnd().toLowerCase()}`;
  await createRoom({ name: liveKitRoomName, metadata: JSON.stringify({ hostId, title: payload.title, type: "webinar" }) });
  const webinar = await Webinar.create({
    host: hostId,
    title: payload.title,
    description: payload.description,
    scheduledTime: payload.scheduledTime,
    practiceSessionTime: payload.practiceSessionTime,
    registrationRequired: payload.registrationRequired ?? true,
    maxAttendees: payload.maxAttendees,
    panelists: payload.panelists || [],
    liveKitRoomName,
    autoShareRecording: payload.autoShareRecording ?? false
  });
  if (payload.panelistEmails?.length) {
    await Promise.all(payload.panelistEmails.map((email) => sendEmail({
      to: email,
      template: "meetingInvitation",
      variables: {
        recipientName: email,
        title: payload.title,
        joinUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/webinars/${webinar._id}`,
        scheduledTime: payload.scheduledTime ? new Date(payload.scheduledTime).toISOString() : null
      }
    })));
  }
  return webinar;
}

async function registerForWebinar(webinarId, payload) {
  const webinar = await Webinar.findById(webinarId);
  if (!webinar) {
    throw new NotFoundError("Webinar not found");
  }
  const joinToken = uid.rnd();
  const registrant = await WebinarRegistrant.create({
    webinar: webinarId,
    name: payload.name,
    email: payload.email.toLowerCase(),
    customFields: payload.customFields || {},
    joinToken
  });
  await sendEmail({
    to: registrant.email,
    template: "webinarRegistrationConfirmation",
    variables: {
      recipientName: registrant.name,
      title: webinar.title,
      joinToken
    }
  });
  return registrant;
}

async function listRegistrants(webinarId) {
  return WebinarRegistrant.find({ webinar: webinarId }).sort({ createdAt: -1 });
}

async function getPanelistToken(webinarId, userId) {
  const webinar = await Webinar.findById(webinarId);
  if (!webinar) {
    throw new NotFoundError("Webinar not found");
  }
  const isHost = webinar.host.toString() === userId.toString();
  const isPanelist = webinar.panelists.some((id) => id.toString() === userId.toString());
  if (!isHost && !isPanelist) {
    throw new AuthorizationError("Only host and panelists can get panelist tokens");
  }
  return {
    token: buildLiveKitToken({
      identity: `panelist-${userId}`,
      name: `panelist-${userId}`,
      roomName: webinar.liveKitRoomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    })
  };
}

async function getAttendeeToken(joinToken) {
  const registrant = await WebinarRegistrant.findOne({ joinToken }).populate("webinar");
  if (!registrant) {
    throw new NotFoundError("Invalid webinar join token");
  }
  const webinar = registrant.webinar;
  const now = new Date();
  if (webinar.practiceSessionTime && now < new Date(webinar.scheduledTime) && now < new Date(webinar.practiceSessionTime)) {
    return { holding: true };
  }
  const token = buildLiveKitToken({
    identity: `attendee-${registrant._id}`,
    name: registrant.name,
    roomName: webinar.liveKitRoomName,
    canPublish: false,
    canSubscribe: true,
    canPublishData: false
  });
  await WebinarAttendant.create({ webinar: webinar._id, registrant: registrant._id, joinedAt: new Date() });
  registrant.joinedAt = new Date();
  await registrant.save();
  return { token, webinar };
}

async function createWebinarPoll(webinarId, userId, payload) {
  return Poll.create({ meeting: webinarId, question: payload.question, options: payload.options, createdBy: userId });
}

async function answerWebinarQuestion(webinarId, payload) {
  return QnAQuestion.create({ meeting: webinarId, meetingRefModel: "Webinar", question: payload.question, asker: payload.asker, guestName: payload.guestName, isPublic: false });
}

async function promoteAttendeeToPanelist(webinarId, registrantId) {
  const webinar = await Webinar.findById(webinarId);
  const registrant = await WebinarRegistrant.findById(registrantId);
  webinar.panelists = [...webinar.panelists];
  await webinar.save();
  return {
    webinar,
    registrant,
    token: buildLiveKitToken({
      identity: `promoted-${registrant._id}`,
      name: registrant.name,
      roomName: webinar.liveKitRoomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    })
  };
}

async function computeWebinarAnalytics(webinarId) {
  const [registrants, attendants, polls, questions] = await Promise.all([
    WebinarRegistrant.find({ webinar: webinarId }),
    WebinarAttendant.find({ webinar: webinarId }),
    Poll.find({ meeting: webinarId }),
    QnAQuestion.find({ meeting: webinarId, meetingRefModel: "Webinar" })
  ]);
  const pollIds = polls.map((poll) => poll._id);
  const pollResponses = pollIds.length ? await PollResponse.find({ poll: { $in: pollIds } }) : [];
  const averageWatchDuration = attendants.length
    ? attendants.reduce((sum, attendant) => sum + (attendant.watchDurationMinutes || 0), 0) / attendants.length
    : 0;
  const analytics = {
    totalRegistrants: registrants.length,
    totalAttendees: attendants.length,
    peakConcurrent: attendants.length,
    averageWatchDuration,
    pollParticipation: pollResponses.length,
    qnaCount: questions.length
  };
  await Webinar.findByIdAndUpdate(webinarId, { analytics });
  return analytics;
}

async function autoShareRecordingToRegistrants(webinarId) {
  const webinar = await Webinar.findById(webinarId).populate("recording");
  if (!webinar || !webinar.autoShareRecording || !webinar.recording) {
    return 0;
  }
  const registrants = await WebinarRegistrant.find({ webinar: webinarId });
  await Promise.all(registrants.map((registrant) => sendEmail({
    to: registrant.email,
    template: "webinarRecordingAvailable",
    variables: {
      recipientName: registrant.name,
      title: webinar.title,
      recordingUrl: webinar.recording.fileUrl
    }
  })));
  return registrants.length;
}

module.exports = {
  createWebinar,
  registerForWebinar,
  listRegistrants,
  getPanelistToken,
  getAttendeeToken,
  createWebinarPoll,
  answerWebinarQuestion,
  promoteAttendeeToPanelist,
  computeWebinarAnalytics,
  autoShareRecordingToRegistrants
};
