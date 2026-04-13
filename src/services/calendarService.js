const { CalendarConnection, Meeting } = require("../models");
const { getValidGoogleAccessToken } = require("./googleService");
const { NotFoundError } = require("../utils/errors");

function buildCalendarEvent(meeting) {
  const end = new Date(new Date(meeting.scheduledStartTime).getTime() + ((meeting.expectedDuration || 30) * 60000));
  return {
    summary: meeting.title,
    description: meeting.description || "",
    start: { dateTime: new Date(meeting.scheduledStartTime).toISOString() },
    end: { dateTime: end.toISOString() },
    conferenceData: undefined,
    location: meeting.joinUrl
  };
}

async function googleCalendarRequest(userId, method, path, body) {
  const accessToken = await getValidGoogleAccessToken(userId);
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    throw new Error(`Google Calendar request failed: ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

async function getCalendarStatus(userId) {
  const connection = await CalendarConnection.findOne({ user: userId });
  return { connected: Boolean(connection), connection };
}

async function disconnectGoogleCalendar(userId) {
  await CalendarConnection.findOneAndDelete({ user: userId });
}

async function syncMeetingCreate(meetingId) {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  const status = await getCalendarStatus(meeting.host);
  if (!status.connected) {
    return null;
  }
  const connection = status.connection;
  const event = await googleCalendarRequest(meeting.host, "POST", `/calendars/${connection.calendarId}/events`, buildCalendarEvent(meeting));
  meeting.externalCalendarEvents = [...(meeting.externalCalendarEvents || []).filter((entry) => entry.provider !== "google"), {
    provider: "google",
    calendarId: connection.calendarId,
    eventId: event.id
  }];
  await meeting.save();
  return event;
}

async function syncMeetingUpdate(meetingId) {
  const meeting = await Meeting.findById(meetingId);
  const googleEvent = meeting.externalCalendarEvents?.find((entry) => entry.provider === "google");
  if (!googleEvent) {
    return syncMeetingCreate(meetingId);
  }
  return googleCalendarRequest(meeting.host, "PUT", `/calendars/${googleEvent.calendarId}/events/${googleEvent.eventId}`, buildCalendarEvent(meeting));
}

async function syncMeetingDelete(meetingId) {
  const meeting = await Meeting.findById(meetingId);
  const googleEvent = meeting?.externalCalendarEvents?.find((entry) => entry.provider === "google");
  if (!meeting || !googleEvent) {
    return null;
  }
  return googleCalendarRequest(meeting.host, "DELETE", `/calendars/${googleEvent.calendarId}/events/${googleEvent.eventId}`);
}

module.exports = {
  getCalendarStatus,
  disconnectGoogleCalendar,
  syncMeetingCreate,
  syncMeetingUpdate,
  syncMeetingDelete
};
