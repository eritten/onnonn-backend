const { ApiError } = require("../utils/errors");
const { logger } = require("../config/logger");
const env = require("../config/env");

function errorHandlerMiddleware(error, req, res, _next) {
  if (!(error instanceof ApiError)) {
    logger.error("Unhandled application error", {
      requestId: req.requestId,
      message: error.message,
      stack: error.stack
    });
  }

  const statusCode = error.statusCode || 500;
  const response = {
    statusCode,
    errorCode: error.errorCode || "INTERNAL_SERVER_ERROR",
    message: error.message || "Internal server error"
  };

  if (error.details) {
    response.details = error.details;
  }

  if (env.nodeEnv !== "production" && statusCode >= 500) {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = { errorHandlerMiddleware };
