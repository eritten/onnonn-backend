const { logger } = require("../config/logger");

function requestLoggerMiddleware(req, res, next) {
  const startedAt = Date.now();
  res.on("finish", () => {
    logger.info("HTTP request", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });
  next();
}

module.exports = { requestLoggerMiddleware };
