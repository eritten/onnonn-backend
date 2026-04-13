const { ValidationError } = require("../utils/errors");

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    if (!result.success) {
      return next(new ValidationError("Invalid request", result.error.flatten()));
    }
    req.validated = result.data;
    return next();
  };
}

module.exports = { validate };
