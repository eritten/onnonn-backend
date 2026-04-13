const router = require("express").Router();

router.use("/auth", require("./authRoutes"));
router.use("/billing", require("./billingRoutes"));
router.use("/", require("./integrationRoutes"));
router.use("/meetings", require("./meetingRoutes"));
router.use("/recordings", require("./recordingRoutes"));
router.use("/ai", require("./aiRoutes"));
router.use("/org", require("./organizationRoutes"));
router.use("/webhooks", require("./webhookRoutes"));

module.exports = router;
