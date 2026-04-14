const { asyncHandler } = require("../utils/asyncHandler");
const { verifyStripeWebhook } = require("../services/stripeService");
const { processStripeEvent } = require("../services/billingService");
const { verifyWebhook } = require("../services/livekitService");
const { Recording, Meeting, MeetingParticipant } = require("../models");
const { getQueue } = require("../jobs");
const env = require("../config/env");

function buildRecordingSourceUrl(location) {
  if (!location) {
    return null;
  }

  if (/^https?:\/\//i.test(location)) {
    return location;
  }

  const publicBase = String(env.livekitUrl || "").replace(/^wss?:\/\//i, "https://").replace(/\/+$/, "");
  let normalizedPath = String(location).replace(/\\/g, "/");
  normalizedPath = normalizedPath
    .replace(/^\/home\/egress\/recordings\/?/, "recordings/")
    .replace(/^\/opt\/livekit\/recordings\/?/, "recordings/")
    .replace(/^\/+/, "");
  if (!publicBase) {
    return null;
  }
  return `${publicBase}/${normalizedPath}`;
}

module.exports = {
  stripe: asyncHandler(async (req, res) => {
    const payload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
    const event = verifyStripeWebhook(payload, req.headers["stripe-signature"]);
    await processStripeEvent(event);
    res.json({ received: true });
  }),
  livekit: asyncHandler(async (req, res) => {
    const payload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
    const event = await verifyWebhook(payload, req.headers.authorization);
    const roomName = event.room?.name || event.egressInfo?.roomName;
    const meeting = roomName ? await Meeting.findOne({ liveKitRoomName: roomName }) : null;
    if (event.event === "room_started" && meeting) {
      await Meeting.findByIdAndUpdate(meeting._id, { status: "ongoing" });
    }
    if (event.event === "room_finished" && meeting) {
      await Meeting.findByIdAndUpdate(meeting._id, { status: "ended", endedAt: new Date() });
      const analyticsQueue = getQueue("analytics");
      if (analyticsQueue) {
        await analyticsQueue.add({ meetingId: meeting._id.toString() });
      }
    }
    if (event.event === "participant_joined" && meeting) {
      await MeetingParticipant.findOneAndUpdate(
        { meeting: meeting._id, $or: [{ guestName: event.participant?.name }, { user: null }] },
        { joinedAt: new Date(), email: event.participant?.metadata || undefined },
        { new: true }
      );
    }
    if (event.event === "participant_left" && meeting) {
      await MeetingParticipant.findOneAndUpdate(
        { meeting: meeting._id, guestName: event.participant?.name },
        { leftAt: new Date() },
        { new: true }
      );
    }
    if (event.event === "egress_started") {
      await Recording.findOneAndUpdate(
        { liveKitEgressId: event.egressInfo?.egressId || event.egressInfo?.egress_id },
        { status: "recording" }
      );
    }
    if (event.event === "egress_updated") {
      await Recording.findOneAndUpdate(
        { liveKitEgressId: event.egressInfo?.egressId || event.egressInfo?.egress_id },
        { status: "processing" }
      );
    }
    if (event.event === "egress_failed" || event.event === "egress_aborted") {
      await Recording.findOneAndUpdate(
        { liveKitEgressId: event.egressInfo?.egressId || event.egressInfo?.egress_id },
        { status: "failed" }
      );
    }
    if (event.event === "egress_ended") {
      const recording = await Recording.findOne({ liveKitEgressId: event.egressInfo?.egressId || event.egressInfo?.egress_id });
      if (recording) {
        const recordingQueue = getQueue("recording-processing");
        const fileResult = event.egressInfo?.fileResults?.[0] || event.egressInfo?.file_results?.[0] || null;
        const location = fileResult?.location || fileResult?.filepath || event.egressInfo?.file?.filepath || null;
        const sourceUrl = buildRecordingSourceUrl(location);
        if (recordingQueue) {
          await recordingQueue.add({
            recordingId: recording._id.toString(),
            sourceUrl,
            sourcePath: location,
            egressInfo: event.egressInfo || {}
          });
        }
        const transcriptionQueue = getQueue("ai-transcription");
        const summaryQueue = getQueue("ai-summary");
        const analysisQueue = getQueue("ai-analysis");
        if (transcriptionQueue) {
          await transcriptionQueue.add({ recordingId: recording._id.toString() });
        }
        if (summaryQueue) {
          await summaryQueue.add({ meetingId: recording.meeting.toString() }, { delay: 5000 });
        }
        if (analysisQueue) {
          await analysisQueue.add({ meetingId: recording.meeting.toString() }, { delay: 10000 });
        }
      }
    }
    res.json({ received: true });
  })
};
