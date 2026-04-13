const { verifyAccessToken } = require("../utils/jwt");
const { AuthenticationError, AuthorizationError } = require("../utils/errors");
const { User, OrganizationMember, Organization } = require("../models");
const IPCIDR = require("ip-cidr");

async function authMiddleware(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AuthenticationError();
    }
    const token = header.split(" ")[1];
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user || user.suspended) {
      throw new AuthenticationError("Invalid or suspended account");
    }
    req.user = user;
    await enforceIpAllowlist(req, user);
    next();
  } catch (error) {
    next(error);
  }
}

async function enforceIpAllowlist(req, user) {
  const memberships = await OrganizationMember.find({ user: user._id }).populate("organization");
  const requesterIp = req.ip?.replace("::ffff:", "");

  for (const membership of memberships) {
    const organization = membership.organization instanceof Organization ? membership.organization : null;
    const cidrs = organization?.securityPolicy?.allowedCidrs || [];
    if (!cidrs.length) {
      continue;
    }
    const allowed = cidrs.some((cidr) => {
      const range = new IPCIDR(cidr);
      return range.contains(requesterIp);
    });
    if (!allowed) {
      throw new AuthorizationError("IP address is not allowed by organization policy");
    }
  }
}

function optionalAuthMiddleware(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next();
  }
  return authMiddleware(req, null, next);
}

module.exports = { authMiddleware, optionalAuthMiddleware };
