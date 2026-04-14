const router = require("express").Router();
const multer = require("multer");
const controller = require("../controllers/meetingController");
const { authMiddleware, optionalAuthMiddleware } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { createMeetingSchema, respondPollSchema } = require("../validators/meetingValidators");

const allowedChatMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedChatMimeTypes.has(file.mimetype)) {
      return cb(new Error("Unsupported file type"));
    }
    return cb(null, true);
  }
});

router.post("/", authMiddleware, validate(createMeetingSchema), controller.create);
router.get("/", authMiddleware, controller.list);
router.get("/:meetingId", authMiddleware, controller.get);
router.patch("/:meetingId", authMiddleware, controller.update);
router.post("/:meetingId/cancel", authMiddleware, controller.cancel);
router.post("/:meetingId/end", authMiddleware, controller.end);
router.post("/:meetingId/token", optionalAuthMiddleware, controller.token);
router.get("/:meetingId/waiting-room", authMiddleware, controller.waitingList);
router.post("/:meetingId/waiting-room/admit", authMiddleware, controller.admitWaiting);
router.post("/:meetingId/waiting-room/reject", authMiddleware, controller.rejectWaiting);
router.post("/:meetingId/waiting-room/admit-all", authMiddleware, controller.admitAllWaiting);
router.get("/:meetingId/participants", authMiddleware, controller.participants);
router.post("/:meetingId/participants/remove", authMiddleware, controller.removeParticipant);
router.post("/:meetingId/participants/mute", authMiddleware, controller.muteParticipant);
router.post("/:meetingId/co-hosts", authMiddleware, controller.addCoHost);
router.delete("/:meetingId/co-hosts/:userId", authMiddleware, controller.removeCoHost);
router.post("/:meetingId/lock", authMiddleware, controller.lock);
router.post("/:meetingId/unlock", authMiddleware, controller.unlock);
router.post("/:meetingId/hands/raise", authMiddleware, controller.raiseHand);
router.post("/:meetingId/hands/lower", authMiddleware, controller.lowerHand);
router.get("/:meetingId/hands", authMiddleware, controller.listHands);
router.post("/:meetingId/reactions", authMiddleware, controller.react);
router.post("/:meetingId/breakouts", authMiddleware, controller.createBreakouts);
router.post("/:meetingId/breakouts/close", authMiddleware, controller.closeBreakouts);
router.post("/:meetingId/polls", authMiddleware, controller.createPoll);
router.post("/polls/:pollId/responses", authMiddleware, validate(respondPollSchema), controller.respondPoll);
router.get("/polls/:pollId/results", authMiddleware, controller.pollResults);
router.post("/polls/:pollId/end", authMiddleware, controller.endPoll);
router.post("/:meetingId/questions", optionalAuthMiddleware, controller.createQuestion);
router.get("/:meetingId/questions", authMiddleware, controller.listQuestions);
router.post("/questions/:questionId/upvote", authMiddleware, controller.upvoteQuestion);
router.post("/questions/:questionId/answer", authMiddleware, controller.answerQuestion);
router.post("/questions/:questionId/dismiss", authMiddleware, controller.dismissQuestion);
router.post("/:meetingId/chat", optionalAuthMiddleware, controller.sendChat);
router.post("/:meetingId/chat/upload", optionalAuthMiddleware, chatUpload.single("file"), controller.uploadChat);
router.get("/:meetingId/chat", authMiddleware, controller.listChat);
router.delete("/chat/:messageId", authMiddleware, controller.deleteChat);
router.post("/chat/:messageId/pin", authMiddleware, controller.pinChat);
router.get("/:meetingId/whiteboard", authMiddleware, controller.getWhiteboard);
router.put("/:meetingId/whiteboard", authMiddleware, controller.updateWhiteboard);
router.get("/templates/all", authMiddleware, controller.listTemplates);
router.post("/templates/all", authMiddleware, controller.createTemplate);
router.patch("/templates/:templateId", authMiddleware, controller.updateTemplate);
router.delete("/templates/:templateId", authMiddleware, controller.deleteTemplate);
router.get("/:meetingId/notes", authMiddleware, controller.listNotes);
router.post("/:meetingId/notes", authMiddleware, controller.addNote);
router.patch("/notes/:noteId", authMiddleware, controller.updateNote);
router.delete("/notes/:noteId", authMiddleware, controller.deleteNote);

module.exports = router;
