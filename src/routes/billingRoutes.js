const router = require("express").Router();
const controller = require("../controllers/billingController");
const { authMiddleware } = require("../middlewares/auth");

router.get("/plans", controller.listPlans);
router.post("/subscribe", authMiddleware, controller.subscribe);
router.get("/subscription", authMiddleware, controller.current);
router.post("/subscription/cancel", authMiddleware, controller.cancel);
router.post("/subscription/change-plan", authMiddleware, controller.changePlan);
router.get("/invoices", authMiddleware, controller.history);
router.post("/payment-method/setup-intent", authMiddleware, controller.setupIntent);

module.exports = router;
