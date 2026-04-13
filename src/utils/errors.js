class ApiError extends Error {
  constructor(statusCode, errorCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

class AuthenticationError extends ApiError {
  constructor(message = "Authentication required", details) {
    super(401, "AUTHENTICATION_ERROR", message, details);
  }
}

class AuthorizationError extends ApiError {
  constructor(message = "Not authorized", details) {
    super(403, "AUTHORIZATION_ERROR", message, details);
  }
}

class ValidationError extends ApiError {
  constructor(message = "Validation failed", details) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

class NotFoundError extends ApiError {
  constructor(message = "Resource not found", details) {
    super(404, "NOT_FOUND", message, details);
  }
}

class PlanLimitError extends ApiError {
  constructor(message = "Plan limit reached", details) {
    super(402, "PLAN_LIMIT_REACHED", message, details);
  }
}

class PaymentError extends ApiError {
  constructor(message = "Payment error", details) {
    super(402, "PAYMENT_ERROR", message, details);
  }
}

class LiveKitError extends ApiError {
  constructor(message = "LiveKit operation failed", details) {
    super(502, "LIVEKIT_ERROR", message, details);
  }
}

class AIServiceError extends ApiError {
  constructor(message = "AI service failed", details) {
    super(502, "AI_SERVICE_ERROR", message, details);
  }
}

class ConflictError extends ApiError {
  constructor(message = "Conflict detected", details) {
    super(409, "CONFLICT", message, details);
  }
}

module.exports = {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  PlanLimitError,
  PaymentError,
  LiveKitError,
  AIServiceError,
  ConflictError
};
