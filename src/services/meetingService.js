const bcrypt = require("bcryptjs");
const ShortUniqueId = require("short-unique-id");
const {
  Meeting,
  MeetingParticipant,
  MeetingTemplate,
  BreakoutRoom,
  Poll,
  PollResponse,
  QnAQuestion,
  ChatMessage,
  Whiteboard,
  MeetingNote,
  Subscription,
  Plan,
  User
} = require("../models");
const { createRoom, buildLiveKitToken, listParticipants, removeParticipant, mutePublishedTrack, sendData, deleteRoom } = require("./livekitService");
const { moderation } = require("./openaiService");
const { getRedis } = require("../config/redis");
const { logger } = require("../config/logger");
const { NotFoundError, PlanLimitError, AuthorizationError, ConflictError } = require("../utils/errors");
const { getPagination } = require("../utils/pagination");
const { writeAuditLog } = require("../utils/audit");
const { uploadBuffer } = require("./storageService");

const uid = new ShortUniqueId({ length: 10 });

function isMongoObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

async function findMeetingByIdentifier(meetingIdentifier) {
  if (!meetingIdentifier) {
    return null;
  }
  const orConditions = [{ meetingId: meetingIdentifier }];
  if (isMongoObjectId(meetingIdentifier)) {
    orConditions.push({ _id: meetingIdentifier });
  }
  return Meeting.findOne({ $or: orConditions });
}

async function getSubscriptionPlan(userId) {
  const subscription = await Subscription.findOne({ user: userId }).populate("plan");
  if (!subscription) {
    throw new NotFoundError("Subscription not found");
  }
  return { subscription, plan: subscription.plan instanceof Plan ? subscription.plan : await Plan.findById(subscription.plan) };
}

function buildMeetingJoinUrl(meetingId, password) {
  const baseUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/join/${meetingId}`;
  if (!password) {
    return baseUrl;
  }
  const joinUrl = new URL(baseUrl);
  joinUrl.searchParams.set("password", password);
  return joinUrl.toString();
}

function participantIdentityForUser(userId) {
  return userId ? `user-${userId}` : null;
}

function participantIdentityForMessage(message) {
  if (message.recipient) {
    return participantIdentityForUser(message.recipient);
  }
  return null;
}

function getSenderName(sender, user) {
  return user?.displayName || sender?.guestName || "Guest";
}

async function queueMeetingEmails(template, meeting, recipients) {
  const { getQueue } = require("../jobs");
  const emailQueue = getQueue("email");
  if (!emailQueue || !recipients?.length) {
    return;
  }

  await Promise.all(recipients
    .filter((recipient) => recipient.email)
    .map((recipient) => emailQueue.add({
      userId: recipient.userId,
      to: recipient.email,
      template,
      variables: {
        recipientName: recipient.name || recipient.email,
        title: meeting.title,
        description: meeting.description,
        meetingId: meeting.meetingId,
        joinUrl: meeting.joinUrl,
        scheduledTime: meeting.scheduledStartTime ? new Date(meeting.scheduledStartTime).toISOString() : null
      }
    })));
}

async function getMeetingEmailRecipients(meeting) {
  const participants = await MeetingParticipant.find({ meeting: meeting._id }).populate("user", "email displayName");
  return participants
    .filter((participant) => participant.role !== "host")
    .map((participant) => ({
      userId: participant.user?._id || participant.user || null,
      email: participant.email || participant.user?.email || null,
      name: participant.guestName || participant.user?.displayName || participant.email || null
    }))
    .filter((recipient) => recipient.email);
}

async function resolveInvitedParticipants(invitedParticipants = []) {
  if (!invitedParticipants.length) {
    return [];
  }

  const userIds = invitedParticipants.map((participant) => participant.userId).filter(Boolean);
  const users = userIds.length ? await User.find({ _id: { $in: userIds } }).select("email displayName") : [];
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));

  return invitedParticipants.map((participant) => {
    const user = participant.userId ? userMap.get(participant.userId.toString()) : null;
    return {
      user: participant.userId || undefined,
      email: participant.email || user?.email,
      guestName: participant.name || user?.displayName,
      role: participant.role || "participant"
    };
  });
}

async function broadcastMeetingEvent(meeting, payload, options = {}) {
  if (!meeting?.liveKitRoomName) {
    return null;
  }
  try {
    return await sendData(meeting.liveKitRoomName, payload, options);
  } catch (error) {
    logger.warn("Meeting room is not active; real-time broadcast skipped", {
      meetingId: meeting.meetingId || meeting._id?.toString(),
      roomName: meeting.liveKitRoomName,
      eventType: payload?.type,
      error: error.message
    });
    return null;
  }
}

async function getHostAndCohostDestinations(meeting) {
  const identities = [participantIdentityForUser(meeting.host), ...meeting.coHostIds.map((id) => participantIdentityForUser(id))];
  return identities.filter(Boolean);
}

function getHostDestination(meeting) {
  return [participantIdentityForUser(meeting.host)].filter(Boolean);
}

async function computePollResultsForBroadcast(pollId) {
  const { poll, totals, totalResponses } = await getPollResults(pollId);
  return {
    pollId: poll._id.toString(),
    question: poll.question,
    totals,
    totalResponses,
    status: poll.status
  };
}

async function createMeeting(hostId, payload, requestContext = {}) {
  const { plan } = await getSubscriptionPlan(hostId);
  const isInstantMeeting = payload.instantMeeting || !payload.scheduledStartTime;
  const scheduledStartTime = isInstantMeeting ? new Date().toISOString() : payload.scheduledStartTime;
  const maxParticipants = payload.maxParticipants || plan.limits.maxParticipantsPerMeeting;
  if (maxParticipants > plan.limits.maxParticipantsPerMeeting) {
    throw new PlanLimitError("Participant limit exceeds your plan", { limit: plan.limits.maxParticipantsPerMeeting });
  }
  const meetingId = uid.rnd().toUpperCase();
  const roomName = `meeting-${meetingId.toLowerCase()}`;
  await createRoom({ name: roomName, metadata: JSON.stringify({ hostId, title: payload.title }) });
  const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;
  const meeting = await Meeting.create({
    host: hostId,
    title: payload.title,
    description: payload.description,
    scheduledStartTime,
    expectedDuration: payload.expectedDuration,
    maxParticipants,
    passwordHash,
    waitingRoomEnabled: payload.waitingRoomEnabled,
    joinBeforeHost: payload.joinBeforeHost,
    muteOnEntry: payload.muteOnEntry,
    allowSelfUnmute: payload.allowSelfUnmute ?? true,
    autoRecord: payload.autoRecord,
    meetingType: payload.meetingType || "group",
    e2eEncryptionEnabled: payload.e2eEncryptionEnabled,
    meetingId,
    joinUrl: buildMeetingJoinUrl(meetingId, payload.password),
    liveKitRoomName: roomName,
    recurrence: payload.recurrence,
    personalRoom: payload.personalRoom || false,
    template: payload.templateId || undefined
  });
  await MeetingParticipant.create({ meeting: meeting._id, user: hostId, role: "host" });
  const invitedParticipants = await resolveInvitedParticipants(payload.invitedParticipants || []);
  if (invitedParticipants.length) {
    await MeetingParticipant.insertMany(invitedParticipants.map((participant) => ({
      meeting: meeting._id,
      user: participant.user,
      email: participant.email,
      guestName: participant.guestName,
      role: participant.role
    })));
  }
  await writeAuditLog({
    userId: hostId,
    action: "meeting.create",
    resourceType: "Meeting",
    resourceId: meeting._id.toString(),
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: { title: meeting.title }
  });
  const { getQueue } = require("../jobs");
  const reminderQueue = getQueue("reminder");
  const calendarQueue = getQueue("calendar-sync");
  if (calendarQueue) {
    await calendarQueue.add({ action: "create", meetingId: meeting._id.toString() });
  }
  if (invitedParticipants.length) {
    await queueMeetingEmails("meetingInvitation", meeting, invitedParticipants.map((participant) => ({
      userId: participant.user,
      email: participant.email,
      name: participant.guestName
    })));
  }
  if (reminderQueue) {
    const base = new Date(scheduledStartTime);
    const offsets = [
      { label: "1 week", minutes: 7 * 24 * 60 },
      { label: "1 day", minutes: 24 * 60 },
      { label: "1 hour", minutes: 60 },
      { label: "15 minutes", minutes: 15 }
    ];
    for (const offset of offsets) {
      const sendAt = new Date(base.getTime() - (offset.minutes * 60000));
      if (sendAt > new Date()) {
        await reminderQueue.add({
          to: requestContext.email,
          template: "meetingReminder",
          variables: {
            recipientName: requestContext.displayName || "there",
            title: meeting.title,
            joinUrl: meeting.joinUrl,
            reminderWindow: offset.label
          }
        }, { delay: sendAt.getTime() - Date.now() });
      }
    }
  }
  return meeting;
}

async function listMeetings(userId, query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { $or: [{ host: userId }, { coHostIds: userId }] };
  if (query.status) {
    filter.status = query.status;
  }
  const [items, total] = await Promise.all([
    Meeting.find(filter).sort({ scheduledStartTime: -1 }).skip(skip).limit(limit),
    Meeting.countDocuments(filter)
  ]);
  return { items, pagination: { page, limit, total } };
}

async function getMeetingByMeetingId(meetingId) {
  const meetingRecord = await findMeetingByIdentifier(meetingId);
  const meeting = meetingRecord ? await meetingRecord.populate("host coHostIds template") : null;
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  return meeting;
}

async function updateMeeting(meetingId, userId, payload) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  if (meeting.host.toString() !== userId.toString()) {
    throw new AuthorizationError("Only the host can update the meeting");
  }
  const incomingPassword = Object.prototype.hasOwnProperty.call(payload, "password") ? payload.password : undefined;
  if (payload.password) {
    payload.passwordHash = await bcrypt.hash(payload.password, 10);
    delete payload.password;
  }
  Object.assign(meeting, payload, { updatedAt: new Date() });
  if (incomingPassword !== undefined) {
    meeting.joinUrl = buildMeetingJoinUrl(meeting.meetingId, incomingPassword || null);
  }
  await meeting.save();
  if (payload.invitedParticipants?.length) {
    const invitedParticipants = await resolveInvitedParticipants(payload.invitedParticipants);
    for (const participant of invitedParticipants) {
      const identityFilter = [];
      if (participant.user) {
        identityFilter.push({ user: participant.user });
      }
      if (participant.email) {
        identityFilter.push({ email: participant.email });
      }
      await MeetingParticipant.findOneAndUpdate(
        { meeting: meeting._id, ...(identityFilter.length ? { $or: identityFilter } : {}) },
        {
          meeting: meeting._id,
          user: participant.user,
          email: participant.email,
          guestName: participant.guestName,
          role: participant.role
        },
        { upsert: true, new: true }
      );
    }
  }
  const { getQueue } = require("../jobs");
  const calendarQueue = getQueue("calendar-sync");
  if (calendarQueue) {
    await calendarQueue.add({ action: "update", meetingId: meeting._id.toString() });
  }
  await queueMeetingEmails("meetingUpdate", meeting, await getMeetingEmailRecipients(meeting));
  return meeting;
}

async function cancelMeeting(meetingId, userId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  if (meeting.host.toString() !== userId.toString()) {
    throw new AuthorizationError("Only the host can cancel the meeting");
  }
  meeting.status = "cancelled";
  await meeting.save();
  await deleteRoom(meeting.liveKitRoomName);
  const { getQueue } = require("../jobs");
  const calendarQueue = getQueue("calendar-sync");
  if (calendarQueue) {
    await calendarQueue.add({ action: "delete", meetingId: meeting._id.toString() });
  }
  await queueMeetingEmails("meetingCancellation", meeting, await getMeetingEmailRecipients(meeting));
  return meeting;
}

async function deleteMeeting(meetingId, userId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  if (meeting.host.toString() !== userId.toString()) {
    throw new AuthorizationError("Only the host can delete the meeting");
  }
  await deleteRoom(meeting.liveKitRoomName);
  await Promise.all([
    MeetingParticipant.deleteMany({ meeting: meeting._id }),
    BreakoutRoom.deleteMany({ meeting: meeting._id }),
    Poll.deleteMany({ meeting: meeting._id }),
    QnAQuestion.deleteMany({ meeting: meeting._id, meetingRefModel: "Meeting" }),
    ChatMessage.deleteMany({ meeting: meeting._id }),
    Whiteboard.deleteOne({ meeting: meeting._id }),
    MeetingNote.deleteMany({ meeting: meeting._id }),
    Meeting.deleteOne({ _id: meeting._id })
  ]);
  return { deleted: true, meetingId: meeting.meetingId };
}

async function endMeeting(meetingId, userId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  if (meeting.host.toString() !== userId.toString() && !meeting.coHostIds.some((id) => id.toString() === userId.toString())) {
    throw new AuthorizationError("Only the host or a co-host can end the meeting");
  }
  meeting.status = "ended";
  meeting.endedAt = new Date();
  meeting.actualDuration = Math.round((meeting.endedAt - meeting.createdAt) / 60000);
  await meeting.save();
  await deleteRoom(meeting.liveKitRoomName);
  const { getQueue } = require("../jobs");
  const analyticsQueue = getQueue("analytics");
  if (analyticsQueue) {
    await analyticsQueue.add({ meetingId: meeting._id.toString() });
  }
  return meeting;
}

async function generateParticipantToken({ meetingId, userId, guestName, guestEmail, password }) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  if (meeting.lockedAt) {
    throw new ConflictError("Meeting is locked");
  }
  if (meeting.passwordHash) {
    const valid = await bcrypt.compare(password || "", meeting.passwordHash);
    if (!valid) {
      throw new AuthorizationError("Meeting password is invalid");
    }
  }
  const identity = userId ? `user-${userId}` : `guest-${uid.rnd()}`;
  const user = userId ? await User.findById(userId).select("displayName email") : null;
  const participantName = user?.displayName || guestName || guestEmail || user?.email || identity;
  const participantEmail = guestEmail || user?.email || undefined;
  if (meeting.waitingRoomEnabled && userId?.toString() !== meeting.host.toString()) {
    await getRedis().zadd(`waiting-room:${meeting._id}`, Date.now(), JSON.stringify({ identity, userId, guestName: participantName, email: participantEmail }));
    await broadcastMeetingEvent(meeting, {
      type: "waiting-room.entered",
      participantName,
      participantIdentity: identity
    }, { destinationIdentities: getHostDestination(meeting) });
  }
  const token = await buildLiveKitToken({
    identity,
    name: participantName,
    roomName: meeting.liveKitRoomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });
  const role = userId?.toString() === meeting.host.toString() ? "host" : userId ? "participant" : "guest";
  const participantFilter = userId ? { meeting: meeting._id, user: userId } : { meeting: meeting._id, email: participantEmail || guestEmail || `${identity}@guest.local` };
  await MeetingParticipant.findOneAndUpdate(
    participantFilter,
    {
      meeting: meeting._id,
      user: userId,
      email: participantEmail,
      guestName: role === "guest" ? participantName : undefined,
      role
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { token, meeting };
}

async function listWaitingParticipants(meetingId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  const entries = await getRedis().zrange(`waiting-room:${meeting._id}`, 0, -1);
  return entries.map((entry) => JSON.parse(entry));
}

async function admitWaitingParticipant(meetingId, identity) {
  const meeting = await findMeetingByIdentifier(meetingId);
  const entries = await getRedis().zrange(`waiting-room:${meeting._id}`, 0, -1);
  const match = entries.find((entry) => JSON.parse(entry).identity === identity);
  if (match) {
    await getRedis().zrem(`waiting-room:${meeting._id}`, match);
    await broadcastMeetingEvent(meeting, {
      type: "waiting-room.admitted",
      participantIdentity: identity
    }, { destinationIdentities: [identity] });
  }
}

async function rejectWaitingParticipant(meetingId, identity) {
  const meeting = await findMeetingByIdentifier(meetingId);
  const entries = await getRedis().zrange(`waiting-room:${meeting._id}`, 0, -1);
  const match = entries.find((entry) => JSON.parse(entry).identity === identity);
  if (match) {
    await getRedis().zrem(`waiting-room:${meeting._id}`, match);
    await broadcastMeetingEvent(meeting, {
      type: "waiting-room.rejected",
      participantIdentity: identity
    }, { destinationIdentities: [identity] });
  }
}

async function admitAllWaiting(meetingId) {
  const waiting = await listWaitingParticipants(meetingId);
  await Promise.all(waiting.map((entry) => admitWaitingParticipant(meetingId, entry.identity)));
  return waiting.length;
}

async function listCurrentParticipants(meetingId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  return listParticipants(meeting.liveKitRoomName);
}

async function removeCurrentParticipant(meetingId, identity) {
  const meeting = await findMeetingByIdentifier(meetingId);
  return removeParticipant(meeting.liveKitRoomName, identity);
}

async function muteParticipant(meetingId, identity, trackSid, muted) {
  const meeting = await findMeetingByIdentifier(meetingId);
  return mutePublishedTrack(meeting.liveKitRoomName, identity, trackSid, muted);
}

async function addCoHost(meetingId, userId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  meeting.coHostIds = [...new Set([...meeting.coHostIds.map((id) => id.toString()), userId.toString()])];
  await meeting.save();
  return meeting;
}

async function removeCoHost(meetingId, userId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  meeting.coHostIds = meeting.coHostIds.filter((id) => id.toString() !== userId.toString());
  await meeting.save();
  return meeting;
}

async function setMeetingLock(meetingId, locked) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  meeting.lockedAt = locked ? new Date() : null;
  await meeting.save();
  return meeting;
}

async function raiseHand(meetingId, userId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  await getRedis().zadd(`raised-hands:${meeting._id}`, Date.now(), userId.toString());
  await MeetingParticipant.findOneAndUpdate({ meeting: meeting._id, user: userId }, { raisedHandAt: new Date() }, { new: true });
  await broadcastMeetingEvent(meeting, {
    type: "hand.updated",
    participantIdentity: participantIdentityForUser(userId),
    action: "raised"
  });
  return true;
}

async function lowerHand(meetingId, userId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  await getRedis().zrem(`raised-hands:${meeting._id}`, userId.toString());
  await MeetingParticipant.findOneAndUpdate({ meeting: meeting._id, user: userId }, { raisedHandAt: null }, { new: true });
  await broadcastMeetingEvent(meeting, {
    type: "hand.updated",
    participantIdentity: participantIdentityForUser(userId),
    action: "lowered"
  });
  return true;
}

async function listRaisedHands(meetingId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  return getRedis().zrange(`raised-hands:${meeting._id}`, 0, -1);
}

async function addReaction(meetingId, participantId, emoji) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  meeting.reactions.push({ participantId, emoji, timestamp: new Date() });
  await meeting.save();
  const participant = participantId ? await MeetingParticipant.findById(participantId).populate("user", "displayName") : null;
  await broadcastMeetingEvent(meeting, {
    type: "reaction.created",
    emoji,
    senderName: participant?.user?.displayName || participant?.guestName || "Participant",
    timestamp: new Date().toISOString()
  });
  return meeting;
}

async function createBreakoutRooms(meetingId, rooms) {
  const meeting = await findMeetingByIdentifier(meetingId);
  const created = [];
  for (const room of rooms) {
    const breakout = await BreakoutRoom.create({
      meeting: meeting._id,
      name: room.name,
      liveKitRoomName: `${meeting.liveKitRoomName}-${uid.rnd().toLowerCase()}`,
      participantIds: room.participantIds || []
    });
    created.push(breakout);
  }
  return created;
}

async function closeBreakoutRooms(meetingId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  await BreakoutRoom.updateMany({ meeting: meeting._id }, { status: "closed" });
}

async function createPoll(meetingId, userId, payload) {
  const meeting = await findMeetingByIdentifier(meetingId);
  const poll = await Poll.create({ meeting: meeting._id, question: payload.question, options: payload.options, createdBy: userId });
  await broadcastMeetingEvent(meeting, {
    type: "poll.started",
    pollId: poll._id.toString(),
    question: poll.question,
    options: poll.options
  });
  return poll;
}

async function respondToPoll(pollId, payload) {
  const poll = await Poll.findById(pollId).populate("meeting");
  if (!poll) {
    throw new NotFoundError("Poll not found");
  }

  let selectedOption = payload.selectedOption;
  if (selectedOption === undefined || selectedOption === null) {
    selectedOption = payload.optionIndex;
  }
  if ((selectedOption === undefined || selectedOption === null) && payload.optionValue !== undefined) {
    selectedOption = payload.optionValue;
  }

  const responsePayload = payload.participantId
    ? { poll: pollId, participant: payload.participantId, selectedOption }
    : { poll: pollId, guestName: payload.guestName, selectedOption };
  const response = await PollResponse.create(responsePayload);
  await broadcastMeetingEvent(poll.meeting, {
    type: "poll.results.updated",
    ...(await computePollResultsForBroadcast(pollId))
  });
  return response;
}

async function getPollResults(pollId) {
  const poll = await Poll.findById(pollId);
  const responses = await PollResponse.find({ poll: pollId });
  const totals = poll.options.map((option, index) => ({
    option,
    count: responses.filter((response) => response.selectedOption === index || response.selectedOption === option).length
  }));
  return { poll, totals, totalResponses: responses.length };
}

async function endPoll(pollId) {
  const poll = await Poll.findByIdAndUpdate(pollId, { status: "ended" }, { new: true }).populate("meeting");
  await broadcastMeetingEvent(poll.meeting, {
    type: "poll.ended",
    ...(await computePollResultsForBroadcast(pollId))
  });
  return poll;
}

async function submitQuestion(meetingId, payload) {
  const meeting = await findMeetingByIdentifier(meetingId);
  const question = await QnAQuestion.create({ meeting: meeting._id, question: payload.question, asker: payload.asker, guestName: payload.guestName });
  await broadcastMeetingEvent(meeting, {
    type: "qna.question.created",
    questionId: question._id.toString(),
    question: question.question,
    guestName: question.guestName,
    asker: question.asker?.toString() || null,
    isPublic: question.isPublic
  }, { destinationIdentities: await getHostAndCohostDestinations(meeting) });
  return question;
}

async function upvoteQuestion(questionId, userId) {
  return QnAQuestion.findByIdAndUpdate(questionId, { $addToSet: { upvotes: userId } }, { new: true });
}

async function answerQuestion(questionId, answerText, isPublic) {
  const question = await QnAQuestion.findByIdAndUpdate(questionId, { answerText, isPublic, answeredAt: new Date() }, { new: true }).populate("meeting");
  await broadcastMeetingEvent(question.meeting, {
    type: "qna.question.answered",
    questionId: question._id.toString(),
    question: question.question,
    answerText,
    isPublic
  });
  return question;
}

async function dismissQuestion(questionId) {
  return QnAQuestion.findByIdAndUpdate(questionId, { dismissedAt: new Date() }, { new: true });
}

async function listQuestions(meetingId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  return QnAQuestion.find({ meeting: meeting._id }).sort({ createdAt: -1 });
}

async function sendChatMessage(meetingId, sender, payload) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  const recipientId = payload.recipient || payload.recipientId;
  const moderationResult = await moderation(payload.content);
  const user = sender?.userId ? await User.findById(sender.userId) : null;
  if (moderationResult.flagged) {
    await ChatMessage.create({
      meeting: meeting._id,
      sender: sender.userId,
      guestName: sender.guestName,
      content: payload.content,
      messageType: payload.messageType,
      recipient: recipientId,
      flagged: true,
      moderationResult
    });
    if (user) {
      const messages = await ChatMessage.countDocuments({ meeting: meeting._id, sender: user._id, flagged: true });
      if (messages >= 3 && !user.chatMutedMeetingIds.some((id) => id.toString() === meeting._id.toString())) {
        user.chatMutedMeetingIds.push(meeting._id);
        await user.save();
      }
    }
    throw new AuthorizationError("Chat message was rejected by content safety");
  }
  if (user?.chatMutedMeetingIds.some((id) => id.toString() === meeting._id.toString())) {
    throw new AuthorizationError("Chat is muted for this meeting");
  }
  const message = await ChatMessage.create({
    meeting: meeting._id,
    sender: sender.userId,
    guestName: sender.guestName,
    content: payload.content,
    messageType: payload.messageType,
    recipient: recipientId
  });
  const senderName = getSenderName(sender, user);
  const chatPayload = {
    type: "chat.message.created",
    messageId: message._id.toString(),
    senderName,
    content: message.content,
    messageType: message.messageType,
    timestamp: message.createdAt.toISOString(),
    recipientId: message.recipient?.toString() || null
  };
  const destinationIdentity = participantIdentityForMessage(message);
  await broadcastMeetingEvent(meeting, chatPayload, destinationIdentity ? { destinationIdentities: [destinationIdentity] } : {});
  return message;
}

async function listChatMessages(meetingId, userId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  return ChatMessage.find({
    meeting: meeting._id,
    deletedAt: null,
    $or: userId ? [{ messageType: "public" }, { sender: userId }, { recipient: userId }] : [{ messageType: "public" }]
  }).sort({ createdAt: 1 });
}

async function deleteChatMessage(messageId) {
  const message = await ChatMessage.findByIdAndUpdate(messageId, { deletedAt: new Date() }, { new: true }).populate("meeting");
  await broadcastMeetingEvent(message.meeting, {
    type: "chat.message.deleted",
    messageId: message._id.toString(),
    timestamp: new Date().toISOString()
  });
  return message;
}

async function pinChatMessage(messageId, pinned) {
  const message = await ChatMessage.findByIdAndUpdate(messageId, { isPinned: pinned }, { new: true }).populate("meeting");
  await broadcastMeetingEvent(message.meeting, {
    type: "chat.message.pinned",
    messageId: message._id.toString(),
    isPinned: pinned,
    timestamp: new Date().toISOString()
  });
  return message;
}

async function getWhiteboard(meetingId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  return Whiteboard.findOneAndUpdate({ meeting: meeting._id }, {}, { upsert: true, new: true });
}

async function updateWhiteboard(meetingId, userId, canvasState) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  const whiteboard = await Whiteboard.findOneAndUpdate(
    { meeting: meeting._id },
    { canvasState, lastUpdatedBy: userId, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  await broadcastMeetingEvent(meeting, {
    type: "whiteboard.updated",
    canvasState,
    updatedBy: userId?.toString() || null
  });
  return whiteboard;
}

async function uploadChatFile(meetingId, sender, file, payload = {}) {
  if (!file?.buffer) {
    throw new NotFoundError("Chat file is required");
  }

  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }

  const user = sender?.userId ? await User.findById(sender.userId) : null;
  const recipientId = payload.recipient || payload.recipientId;
  const upload = await uploadBuffer({
    buffer: file.buffer,
    folder: `onnonn/meetings/${meeting._id}/chat`,
    resourceType: "auto"
  });

  const message = await ChatMessage.create({
    meeting: meeting._id,
    sender: sender.userId,
    guestName: sender.guestName,
    content: payload.content || file.originalname,
    messageType: "file",
    recipient: recipientId,
    fileUrl: upload.url,
    fileName: file.originalname,
    fileSizeBytes: file.size,
    mimeType: file.mimetype
  });

  const eventPayload = {
    type: "chat.file.created",
    messageId: message._id.toString(),
    senderName: getSenderName(sender, user),
    content: message.content,
    messageType: "file",
    timestamp: message.createdAt.toISOString(),
    recipientId: message.recipient?.toString() || null,
    fileUrl: message.fileUrl,
    fileName: message.fileName,
    fileSizeBytes: message.fileSizeBytes,
    mimeType: message.mimeType
  };
  const destinationIdentity = participantIdentityForMessage(message);
  await broadcastMeetingEvent(meeting, eventPayload, destinationIdentity ? { destinationIdentities: [destinationIdentity] } : {});
  return message;
}

async function listTemplates(userId) {
  return MeetingTemplate.find({ user: userId });
}

async function createTemplate(userId, payload) {
  return MeetingTemplate.create({ user: userId, name: payload.name, settings: payload.settings });
}

async function updateTemplate(templateId, userId, payload) {
  return MeetingTemplate.findOneAndUpdate({ _id: templateId, user: userId }, payload, { new: true });
}

async function deleteTemplate(templateId, userId) {
  return MeetingTemplate.findOneAndDelete({ _id: templateId, user: userId });
}

async function getNotes(meetingId) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  return MeetingNote.find({ meeting: meeting._id }).sort({ updatedAt: -1 });
}

async function addNote(meetingId, userId, content) {
  const meeting = await findMeetingByIdentifier(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  return MeetingNote.create({ meeting: meeting._id, content, createdBy: userId, updatedBy: userId });
}

async function updateNote(noteId, userId, content) {
  return MeetingNote.findByIdAndUpdate(noteId, { content, updatedBy: userId, updatedAt: new Date() }, { new: true });
}

async function deleteNote(noteId) {
  return MeetingNote.findByIdAndDelete(noteId);
}

module.exports = {
  createMeeting,
  listMeetings,
  getMeetingByMeetingId,
  updateMeeting,
  cancelMeeting,
  deleteMeeting,
  endMeeting,
  generateParticipantToken,
  listWaitingParticipants,
  admitWaitingParticipant,
  rejectWaitingParticipant,
  admitAllWaiting,
  listCurrentParticipants,
  removeCurrentParticipant,
  muteParticipant,
  addCoHost,
  removeCoHost,
  setMeetingLock,
  raiseHand,
  lowerHand,
  listRaisedHands,
  addReaction,
  createBreakoutRooms,
  closeBreakoutRooms,
  createPoll,
  respondToPoll,
  getPollResults,
  endPoll,
  submitQuestion,
  upvoteQuestion,
  answerQuestion,
  dismissQuestion,
  listQuestions,
  sendChatMessage,
  listChatMessages,
  deleteChatMessage,
  pinChatMessage,
  uploadChatFile,
  getWhiteboard,
  updateWhiteboard,
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getNotes,
  addNote,
  updateNote,
  deleteNote
};
