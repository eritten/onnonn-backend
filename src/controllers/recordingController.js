const { asyncHandler } = require("../utils/asyncHandler");
const recordingService = require("../services/recordingService");

module.exports = {
  start: asyncHandler(async (req, res) => res.status(201).json({ recording: await recordingService.startMeetingRecording(req.params.meetingId, req.user._id) })),
  stop: asyncHandler(async (req, res) => res.json({ recording: await recordingService.stopMeetingRecording(req.params.recordingId, req.user._id) })),
  list: asyncHandler(async (req, res) => res.json(await recordingService.listRecordings(req.user._id, req.query))),
  get: asyncHandler(async (req, res) => res.json({ recording: await recordingService.getRecording(req.params.recordingId, req.user._id) })),
  remove: asyncHandler(async (req, res) => res.json({ recording: await recordingService.deleteRecording(req.params.recordingId, req.user._id) })),
  share: asyncHandler(async (req, res) => res.json(await recordingService.shareRecording(req.params.recordingId, req.user._id, req.body))),
  sharedView: asyncHandler(async (req, res) => res.json({ recording: await recordingService.getSharedRecording(req.params.token, req.body.password) }))
};
