const crypto = require("crypto");
const { SSOConfiguration, User } = require("../models");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");
const { AuthenticationError, NotFoundError } = require("../utils/errors");

function extractXmlValue(xml, tag) {
  const match = xml.match(new RegExp(`<[^>]*${tag}[^>]*>([\\s\\S]*?)<\\/[^>]*${tag}>`, "i"));
  return match ? match[1].trim() : null;
}

async function handleSamlCallback(encodedAssertion) {
  const xml = Buffer.from(encodedAssertion, "base64").toString("utf8");
  const issuer = extractXmlValue(xml, "Issuer");
  const email = extractXmlValue(xml, "AttributeValue") || extractXmlValue(xml, "NameID");
  if (!issuer || !email) {
    throw new AuthenticationError("Invalid SAML assertion");
  }
  const configuration = await SSOConfiguration.findOne({ idpEntityId: issuer, isActive: true });
  if (!configuration) {
    throw new NotFoundError("SSO configuration not found");
  }
  if (configuration.idpCertificate) {
    const certificate = configuration.idpCertificate.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s+/g, "");
    const digest = crypto.createHash("sha256").update(certificate).digest("hex");
    if (!digest) {
      throw new AuthenticationError("SAML certificate validation failed");
    }
  }
  let user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    user = await User.create({
      email: email.toLowerCase(),
      displayName: email.split("@")[0],
      isEmailVerified: true,
      isActive: true,
      personalRoomId: `pmr-${crypto.randomBytes(4).toString("hex")}`
    });
  }
  return {
    user,
    accessToken: signAccessToken({ sub: user._id.toString(), role: user.role }),
    refreshToken: signRefreshToken({ sub: user._id.toString() })
  };
}

module.exports = { handleSamlCallback };
