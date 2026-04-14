const bcrypt = require("bcryptjs");
const { Recording, Meeting, Subscription } = require("../models");
const { startRecording, stopRecording } = require("./livekitService");
const { randomToken } = require("../utils/crypto");
const { uploadBufferToProvider } = require("./storageService");
const { NotFoundError, PlanLimitError, AuthorizationError } = require("../utils/errors");
const { getPagination } = require("../utils/pagination");

async function startMeetingRecording(meetingId, userId) {
  const meeting = await Meeting.findOne({ meetingId });
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  const subscription = await Subscription.findOne({ user: userId }).populate("plan");
  const recordingEnabled = Boolean(subscription?.plan?.limits?.flags?.cloudRecording);
  const limitGb = Number(subscription?.plan?.limits?.cloudRecordingStorageGb || 0);
  const limitBytes = limitGb > 0 ? limitGb * 1024 * 1024 * 1024 : 0;
  if (!recordingEnabled) {
    throw new PlanLimitError("Cloud recording is not available on your current plan.", { limitBytes, usedBytes: subscription?.storageUsedBytes || 0 });
  }
  if (limitBytes > 0 && subscription.storageUsedBytes >= limitBytes) {
    throw new PlanLimitError("Your recording storage is full. Upgrade your plan or delete older recordings to continue.", {
      limitBytes,
      usedBytes: subscription.storageUsedBytes
    });
  }
  const egress = await startRecording(meeting.liveKitRoomName, `recordings/${meetingId}-${Date.now()}.mp4`);
  return Recording.create({
    meeting: meeting._id,
    host: userId,
    liveKitEgressId: egress.egressId || egress.egress_id,
    status: "recording",
    startTime: new Date(),
    storageProvider: "cloudinary"
  });
}

async function stopMeetingRecording(recordingId, userId) {
  const recording = await Recording.findById(recordingId);
  if (!recording) {
    throw new NotFoundError("Recording not found");
  }
  if (recording.host.toString() !== userId.toString()) {
    throw new AuthorizationError("Only the host can stop the recording");
  }
  await stopRecording(recording.liveKitEgressId);
  recording.status = "processing";
  recording.endTime = new Date();
  await recording.save();
  return recording;
}

async function finalizeRecording({ recordingId, fileBuffer }) {
  const recording = await Recording.findById(recordingId);
  if (!recording) {
    throw new NotFoundError("Recording not found");
  }
  const sourceBuffer = fileBuffer || Buffer.from("demo");
  const uploaded = await uploadBufferToProvider({
    buffer: sourceBuffer,
    folder: "onnonn/recordings",
    resourceType: "video",
    provider: recording.storageProvider === "s3" ? "s3" : "cloudinary",
    filename: `${recording._id}.mp4`
  });
  recording.fileUrl = uploaded.url;
  recording.fileSizeBytes = uploaded.bytes;
  recording.status = "ready";
  recording.duration = recording.startTime && recording.endTime ? Math.round((recording.endTime - recording.startTime) / 1000) : 0;
  await recording.save();
  await Subscription.findOneAndUpdate({ user: recording.host }, { $inc: { storageUsedBytes: uploaded.bytes } });
  return recording;
}

async function listRecordings(userId, query) {
  const { page, limit, skip } = getPagination(query);
  const [items, total] = await Promise.all([
    Recording.find({ host: userId, status: { $ne: "deleted" } }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Recording.countDocuments({ host: userId, status: { $ne: "deleted" } })
  ]);
  return { items, pagination: { page, limit, total } };
}

async function getRecording(recordingId, userId) {
  const recording = await Recording.findOne({ _id: recordingId, host: userId }).populate("meeting");
  if (!recording) {
    throw new NotFoundError("Recording not found");
  }
  return recording;
}

async function deleteRecording(recordingId, userId) {
  const recording = await getRecording(recordingId, userId);
  recording.status = "deleted";
  await recording.save();
  await Subscription.findOneAndUpdate({ user: userId }, { $inc: { storageUsedBytes: -(recording.fileSizeBytes || 0) } });
  return recording;
}

async function shareRecording(recordingId, userId, { password, expiresAt }) {
  const recording = await getRecording(recordingId, userId);
  const token = randomToken(16);
  recording.shareLinks.push({
    token,
    passwordHash: password ? await bcrypt.hash(password, 10) : undefined,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined
  });
  await recording.save();
  return { token };
}

async function getSharedRecording(token, password) {
  const recording = await Recording.findOne({ "shareLinks.token": token, status: "ready" });
  if (!recording) {
    throw new NotFoundError("Shared recording not found");
  }
  const share = recording.shareLinks.find((entry) => entry.token === token);
  if (share.expiresAt && share.expiresAt < new Date()) {
    throw new AuthorizationError("Share link has expired");
  }
  if (share.passwordHash) {
    const valid = await bcrypt.compare(password || "", share.passwordHash);
    if (!valid) {
      throw new AuthorizationError("Share password is invalid");
    }
  }
  return recording;
}

module.exports = {
  startMeetingRecording,
  stopMeetingRecording,
  finalizeRecording,
  listRecordings,
  getRecording,
  deleteRecording,
  shareRecording,
  getSharedRecording
};
