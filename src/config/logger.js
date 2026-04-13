const { createLogger, format, transports } = require("winston");
const env = require("./env");

const logger = createLogger({
  level: env.nodeEnv === "production" ? "info" : "debug",
  format: env.nodeEnv === "production"
    ? format.combine(format.timestamp(), format.errors({ stack: true }), format.json())
    : format.combine(format.colorize(), format.timestamp(), format.printf(({ level, message, timestamp, ...meta }) => {
        return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
      })),
  transports: [new transports.Console()]
});

module.exports = { logger };
