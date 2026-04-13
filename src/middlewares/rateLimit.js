const rateLimit = require("express-rate-limit");

function createLimiter(options) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  });
}

const authRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true
});

const refreshRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 240
});

const recoveryRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  skipSuccessfulRequests: true
});

const apiRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600
});

const aiRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120
});

module.exports = {
  authRateLimit,
  refreshRateLimit,
  recoveryRateLimit,
  apiRateLimit,
  aiRateLimit
};
