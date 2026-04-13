const { asyncHandler } = require("../utils/asyncHandler");
const aiService = require("../services/aiService");
const { AITranscription, AISummary, AIActionItem, AIMeetingCoach, AISentiment } = require("../models");

module.exports = {
  getTranscription: asyncHandler(async (req, res) => res.json({ transcription: await AITranscription.findOne({ meeting: req.params.meetingId }) })),
  translate: asyncHandler(async (req, res) => res.json({ translation: await aiService.translateTranscription(req.params.meetingId, req.user._id, req.body.language) })),
  getSummary: asyncHandler(async (req, res) => res.json({ summary: await AISummary.findOne({ meeting: req.params.meetingId }) })),
  regenerateSummary: asyncHandler(async (req, res) => res.json({ summary: await aiService.generateSummary(req.params.meetingId) })),
  listActionItems: asyncHandler(async (req, res) => res.json({ items: await AIActionItem.find({ meeting: req.params.meetingId }) })),
  completeActionItem: asyncHandler(async (req, res) => res.json({ item: await AIActionItem.findByIdAndUpdate(req.params.itemId, { completedAt: new Date() }, { new: true }) })),
  updateActionItem: asyncHandler(async (req, res) => res.json({ item: await AIActionItem.findByIdAndUpdate(req.params.itemId, req.body, { new: true }) })),
  deleteActionItem: asyncHandler(async (req, res) => res.status(204).send(await AIActionItem.findByIdAndDelete(req.params.itemId))),
  coaching: asyncHandler(async (req, res) => res.json({ report: await AIMeetingCoach.findOne({ meeting: req.params.meetingId }) })),
  sentiment: asyncHandler(async (req, res) => res.json({ sentiment: await AISentiment.findOne({ meeting: req.params.meetingId }) })),
  assistant: asyncHandler(async (req, res) => res.json(await aiService.aiAssistant(req.params.meetingId, req.body.question))),
  generateAgenda: asyncHandler(async (req, res) => res.json({ agenda: await aiService.generateAgenda(req.params.meetingId, req.body) })),
  getAgenda: asyncHandler(async (req, res) => res.json({ agenda: await aiService.getAgenda(req.params.meetingId) })),
  updateAgenda: asyncHandler(async (req, res) => res.json({ agenda: await aiService.updateAgenda(req.params.meetingId, req.body.agenda) })),
  titleSuggestion: asyncHandler(async (req, res) => res.json(await aiService.suggestMeetingTitle(req.body))),
  followUp: asyncHandler(async (req, res) => res.json({ draft: await aiService.generateFollowUpEmail(req.params.meetingId) })),
  search: asyncHandler(async (req, res) => res.json({ results: await aiService.semanticSearch(req.query.q) })),
  captions: asyncHandler(async (req, res) => res.json({ caption: await aiService.storeRealtimeCaption(req.params.meetingId, req.body) }))
};
