const { roomService, egressClient, livekitWebhookReceiver, buildLiveKitToken } = require("../config/livekit");
const { LiveKitError } = require("../utils/errors");

async function createRoom({ name, metadata = "{}", emptyTimeout = 300 }) {
  if (!roomService) {
    return { name, sid: `mock-${name}` };
  }
  try {
    return await roomService.createRoom({ name, metadata, emptyTimeout });
  } catch (error) {
    throw new LiveKitError("Unable to create LiveKit room", { message: error.message });
  }
}

async function deleteRoom(room) {
  if (!roomService) {
    return null;
  }
  try {
    return await roomService.deleteRoom(room);
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("requested room does not exist")) {
      return null;
    }
    throw new LiveKitError("Unable to delete LiveKit room", { message });
  }
}

async function listParticipants(room) {
  if (!roomService) {
    return [];
  }
  return roomService.listParticipants(room);
}

async function removeParticipant(room, identity) {
  if (!roomService) {
    return null;
  }
  return roomService.removeParticipant(room, identity);
}

async function mutePublishedTrack(room, identity, trackSid, muted) {
  if (!roomService) {
    return null;
  }
  return roomService.mutePublishedTrack(room, identity, trackSid, muted);
}

async function sendData(room, data, options = {}) {
  if (!roomService) {
    return null;
  }
  return roomService.sendData(room, Buffer.from(JSON.stringify(data)), 1, options);
}

async function startRecording(roomName, outputFilepath) {
  if (!egressClient) {
    return { egressId: `mock-egress-${roomName}`, roomName, outputFilepath };
  }
  const normalizedOutputPath = String(outputFilepath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const egressFilepath = normalizedOutputPath.startsWith("home/egress/recordings/")
    ? `/${normalizedOutputPath}`
    : `/home/egress/recordings/${normalizedOutputPath.replace(/^recordings\/?/, "")}`;
  return egressClient.startRoomCompositeEgress(roomName, {
    layout: "speaker",
    file: { filepath: egressFilepath }
  });
}

async function stopRecording(egressId) {
  if (!egressClient) {
    return null;
  }
  return egressClient.stopEgress(egressId);
}

async function listEgress(options = {}) {
  if (!egressClient) {
    return [];
  }
  const response = await egressClient.listEgress(options);
  return Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : [];
}

async function verifyWebhook(body, authorization) {
  if (!livekitWebhookReceiver) {
    return JSON.parse(body);
  }
  return livekitWebhookReceiver.receive(body, authorization);
}

module.exports = {
  buildLiveKitToken,
  createRoom,
  deleteRoom,
  listParticipants,
  removeParticipant,
  mutePublishedTrack,
  sendData,
  startRecording,
  stopRecording,
  listEgress,
  verifyWebhook
};
