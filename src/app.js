const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const { requestIdMiddleware } = require("./middlewares/requestId");
const { requestLoggerMiddleware } = require("./middlewares/requestLogger");
const { notFoundMiddleware } = require("./middlewares/notFound");
const { errorHandlerMiddleware } = require("./middlewares/errorHandler");
const { createSwaggerSpec } = require("./config/swagger");
const env = require("./config/env");
const apiRoutes = require("./routes");
const { healthController } = require("./controllers/healthController");
const { apiRateLimit } = require("./middlewares/rateLimit");
const { queues } = require("./jobs");
const { authMiddleware } = require("./middlewares/auth");
const { authorize } = require("./middlewares/authorize");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    const allowedOrigins = new Set([
      env.frontendUrl,
      "https://onnonn.niveel.com",
      "onnonn://",
      "null"
    ]);

    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true
}));
app.use("/api/v1/webhooks/stripe", express.raw({ type: "application/json" }));
app.use("/api/v1/webhooks/livekit", express.raw({ type: "*/*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

app.get("/health", healthController);
app.use(apiRateLimit);
app.use("/api/v1", apiRoutes);

const swaggerSpec = createSwaggerSpec();
app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({
  queues: Object.values(queues).map((queue) => new BullAdapter(queue)),
  serverAdapter
});
app.use("/admin/queues", authMiddleware, authorize("superadmin"), serverAdapter.getRouter());

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

module.exports = app;
