const { AccessToken, RoomServiceClient, EgressClient, WebhookReceiver } = require("livekit-server-sdk");
const env = require("./env");

const roomService = env.livekitUrl ? new RoomServiceClient(env.livekitUrl, env.livekitApiKey, env.livekitApiSecret) : null;
const egressClient = env.livekitUrl ? new EgressClient(env.livekitUrl, env.livekitApiKey, env.livekitApiSecret) : null;
const livekitWebhookReceiver = env.livekitWebhookSecret ? new WebhookReceiver(env.livekitWebhookSecret) : null;

async function buildLiveKitToken({ identity, name, roomName, canPublish = true, canSubscribe = true, canPublishData = true }) {
  const token = new AccessToken(env.livekitApiKey, env.livekitApiSecret, { identity, name });
  token.addGrant({ roomJoin: true, room: roomName, canPublish, canSubscribe, canPublishData });
  return await token.toJwt();
}

module.exports = { roomService, egressClient, livekitWebhookReceiver, buildLiveKitToken };
