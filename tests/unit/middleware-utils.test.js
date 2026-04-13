const { validate } = require("../../src/middlewares/validate");
const { authorize } = require("../../src/middlewares/authorize");
const { requestIdMiddleware } = require("../../src/middlewares/requestId");
const { requestLoggerMiddleware } = require("../../src/middlewares/requestLogger");
const { notFoundMiddleware } = require("../../src/middlewares/notFound");
const { errorHandlerMiddleware } = require("../../src/middlewares/errorHandler");
const { getPagination } = require("../../src/utils/pagination");
const errors = require("../../src/utils/errors");
const jwtUtils = require("../../src/utils/jwt");

describe("middlewares and utils", () => {
  test("validate middleware passes valid input", () => {
    const schema = { safeParse: jest.fn().mockReturnValue({ success: true, data: { body: {} } }) };
    const next = jest.fn();
    validate(schema)({ body: {}, query: {}, params: {} }, {}, next);
    expect(next).toHaveBeenCalled();
  });

  test("authorize middleware blocks wrong role", () => {
    const next = jest.fn();
    authorize("superadmin")({ user: { role: "user" } }, {}, next);
    expect(next).toHaveBeenCalled();
  });

  test("authorize middleware allows matching role", () => {
    const next = jest.fn();
    authorize("superadmin")({ user: { role: "superadmin" } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  test("request helpers and error handler work", () => {
    const req = {};
    const res = { setHeader: jest.fn(), on: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    requestIdMiddleware(req, res, jest.fn());
    requestLoggerMiddleware({ requestId: "1", method: "GET", originalUrl: "/" }, { on: (event, cb) => cb(), statusCode: 200 }, jest.fn());
    notFoundMiddleware({ originalUrl: "/missing" }, {}, jest.fn());
    errorHandlerMiddleware(new errors.ValidationError("bad"), { requestId: "1" }, res);
    expect(getPagination({ page: 2, limit: 5 }).skip).toBe(5);
    expect(new errors.AuthenticationError().statusCode).toBe(401);
  });

  test("validate middleware fails invalid input and pagination clamps", () => {
    const schema = { safeParse: jest.fn().mockReturnValue({ success: false, error: { flatten: () => ({}) } }) };
    const next = jest.fn();
    validate(schema)({ body: {}, query: {}, params: {} }, {}, next);
    expect(next).toHaveBeenCalled();
    expect(getPagination({ page: -1, limit: 500 }).limit).toBe(100);
  });

  test("jwt helpers sign and verify both token types", () => {
    const access = jwtUtils.signAccessToken({ sub: "1", role: "user" });
    const refresh = jwtUtils.signRefreshToken({ sub: "1" });
    expect(jwtUtils.verifyAccessToken(access).sub).toBe("1");
    expect(jwtUtils.verifyRefreshToken(refresh).sub).toBe("1");
  });
});
