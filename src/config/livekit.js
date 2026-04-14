const { AccessToken, RoomServiceClient, EgressClient, WebhookReceiver } = require("livekit-server-sdk");
const env = require("./env");

function normalizeServerSdkUrl(url) {
  if (!url) {
    return "";
  }
  if (url.startsWith("wss://")) {
    return `https://${url.slice(6)}`;
  }
  if (url.startsWith("ws://")) {
    return `http://${url.slice(5)}`;
  }
  return url;
}

const livekitServerUrl = normalizeServerSdkUrl(env.livekitUrl);
const roomService = livekitServerUrl ? new RoomServiceClient(livekitServerUrl, env.livekitApiKey, env.livekitApiSecret) : null;
const egressClient = livekitServerUrl ? new EgressClient(livekitServerUrl, env.livekitApiKey, env.livekitApiSecret) : null;
const livekitWebhookSecret = env.livekitWebhookSecret || env.livekitApiSecret || "";
const livekitWebhookReceiver = env.livekitApiKey && livekitWebhookSecret
  ? new WebhookReceiver(env.livekitApiKey, livekitWebhookSecret)
  : null;

async function buildLiveKitToken({ identity, name, roomName, canPublish = true, canSubscribe = true, canPublishData = true }) {
  const token = new AccessToken(env.livekitApiKey, env.livekitApiSecret, { identity, name });
  token.addGrant({ roomJoin: true, room: roomName, canPublish, canSubscribe, canPublishData });
  return await token.toJwt();
}

module.exports = {
  roomService,
  egressClient,
  livekitWebhookReceiver,
  buildLiveKitToken,
  livekitServerUrl,
  livekitWebhookSecret
};
