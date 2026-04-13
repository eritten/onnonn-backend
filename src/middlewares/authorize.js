const { AuthorizationError } = require("../utils/errors");

function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AuthorizationError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError("Insufficient role"));
    }
    return next();
  };
}

module.exports = { authorize };
