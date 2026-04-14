const { asyncHandler } = require("../utils/asyncHandler");
const { buildGoogleOAuthUrl, loginWithGoogleCallback, connectGoogleCalendar } = require("../services/googleService");
const calendarService = require("../services/calendarService");
const { handleSamlCallback } = require("../services/ssoService");
const webinarService = require("../services/webinarService");
const { PollResponse, QnAQuestion } = require("../models");

function resolveSelectedOption(body = {}) {
  if (body.selectedOption !== undefined) {
    return body.selectedOption;
  }
  if (body.optionIndex !== undefined) {
    return body.optionIndex;
  }
  return body.optionValue;
}

module.exports = {
  googleLoginUrl: asyncHandler(async (req, res) => res.json({ url: buildGoogleOAuthUrl(req.query.state || "") })),
  googleCallback: asyncHandler(async (req, res) => res.json(await loginWithGoogleCallback(req.query.code))),
  googleCalendarConnect: asyncHandler(async (req, res) => res.json({ profile: await connectGoogleCalendar(req.user._id, req.body.code) })),
  googleCalendarDisconnect: asyncHandler(async (req, res) => { await calendarService.disconnectGoogleCalendar(req.user._id); res.status(204).send(); }),
  googleCalendarStatus: asyncHandler(async (req, res) => res.json(await calendarService.getCalendarStatus(req.user._id))),
  samlCallback: asyncHandler(async (req, res) => res.json(await handleSamlCallback(req.body.SAMLResponse))),
  createWebinar: asyncHandler(async (req, res) => res.status(201).json({ webinar: await webinarService.createWebinar(req.user._id, req.body) })),
  registerWebinar: asyncHandler(async (req, res) => res.status(201).json({ registrant: await webinarService.registerForWebinar(req.params.webinarId, req.body) })),
  listWebinarRegistrants: asyncHandler(async (req, res) => res.json({ registrants: await webinarService.listRegistrants(req.params.webinarId) })),
  webinarPanelistToken: asyncHandler(async (req, res) => res.json(await webinarService.getPanelistToken(req.params.webinarId, req.user._id))),
  webinarAttendeeToken: asyncHandler(async (req, res) => res.json(await webinarService.getAttendeeToken(req.body.joinToken))),
  webinarPoll: asyncHandler(async (req, res) => res.status(201).json({ poll: await webinarService.createWebinarPoll(req.params.webinarId, req.user._id, req.body) })),
  webinarPollResponse: asyncHandler(async (req, res) => res.status(201).json({ response: await PollResponse.create({ poll: req.params.pollId, guestName: req.body.guestName, selectedOption: resolveSelectedOption(req.body) }) })),
  webinarQuestion: asyncHandler(async (req, res) => res.status(201).json({ question: await webinarService.answerWebinarQuestion(req.params.webinarId, { ...req.body, asker: req.user?._id }) })),
  webinarQuestions: asyncHandler(async (req, res) => res.json({ questions: await QnAQuestion.find({ meeting: req.params.webinarId, meetingRefModel: "Webinar" }) })),
  webinarPromote: asyncHandler(async (req, res) => res.json(await webinarService.promoteAttendeeToPanelist(req.params.webinarId, req.params.registrantId))),
  webinarAnalytics: asyncHandler(async (req, res) => res.json({ analytics: await webinarService.computeWebinarAnalytics(req.params.webinarId) }))
};
