import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { aiService, orgService, recordingService } from "../services/otherServices";
import { authService } from "../services/authService";
import { meetingService } from "../services/meetingService";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { LoadingButton } from "../components/LoadingButton";
import { buildDesktopOAuthUrl } from "../utils/google";

function Section({ title, children, actions }) {
  return (
    <section className="panel p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, children, hint }) {
  return (
    <div className="space-y-2">
      <label className="field-label" htmlFor={id}>{label}</label>
      {children}
      {hint ? <p className="text-xs text-brand-muted">{hint}</p> : null}
    </div>
  );
}

function parseInviteEmails(value) {
  return [...new Set(
    value
      .split(/[\n,]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  )];
}

function toInvitePayload(value) {
  return parseInviteEmails(value).map((email) => ({ email }));
}

async function copyMeetingLink(url) {
  await navigator.clipboard.writeText(url);
  toast.success("Join link copied.");
}

function logActionError(label, error) {
  console.error(`[Onnonn Desktop] ${label} failed`, error);
}

function removeInviteEmail(value, emailToRemove) {
  return parseInviteEmails(value)
    .filter((email) => email !== emailToRemove)
    .join(", ");
}

function InviteEmailField({ id, label, value, onChange, onRemove, hint }) {
  const emails = parseInviteEmails(value);

  return (
    <div className="space-y-3">
      <Field id={id} label={label} hint={hint}>
        <textarea
          id={id}
          className="field"
          rows={3}
          placeholder="person1@example.com, person2@example.com"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
      {emails.length ? (
        <ul className="flex flex-wrap gap-2" role="list" aria-label="Invited email addresses">
          {emails.map((email) => (
            <li key={email}>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-700 bg-brand-950/80 px-3 py-2 text-sm text-brand-text">
                <span>{email}</span>
                <button
                  type="button"
                  className="text-brand-muted transition hover:text-white"
                  aria-label={`Remove ${email}`}
                  onClick={() => onRemove(email)}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function DashboardPage() {
  const [meetings, setMeetings] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [results, setResults] = useState([]);
  const search = useUiStore((state) => state.globalSearch);
  const announce = useUiStore((state) => state.announce);
  const navigate = useNavigate();

  useEffect(() => {
    meetingService.list({ status: "scheduled", limit: 5 }).then((data) => setMeetings(data.items || data.meetings || []));
    recordingService.list({ limit: 3 }).then((data) => setRecordings(data.items || []));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      aiService.search(search).then(setResults).catch(() => {});
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Quick actions">
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => navigate("/app/meetings?new=instant")}>Start instant meeting</button>
            <button className="btn-secondary" onClick={() => navigate("/app/meetings?new=scheduled")}>Schedule meeting</button>
          </div>
        </Section>
        <Section title="AI search">
          <p className="text-sm text-brand-muted">Use the search bar above to find meetings by meaning, not just by title.</p>
          <div className="mt-4 space-y-3">
            {results.length ? results.map((result) => (
              <div key={`${result.meeting}-${result.score}`} className="rounded-2xl border border-brand-800 bg-brand-950/70 p-4">
                <p className="text-sm font-medium">Meeting {result.meeting}</p>
                <p className="mt-1 text-xs text-brand-muted">{result.excerpt}</p>
                <p className="mt-2 text-xs text-brand-accent">Score {result.score.toFixed(3)}</p>
              </div>
            )) : <p className="text-sm text-brand-muted">Search results will appear here.</p>}
          </div>
        </Section>
      </div>
      <Section title="Upcoming meetings">
        {meetings.length ? (
          <div className="space-y-3">
            {meetings.slice(0, 5).map((meeting) => (
              <div key={meeting._id || meeting.meetingId} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-800 bg-brand-950/60 p-4">
                <div>
                  <p className="font-medium">{meeting.title}</p>
                  <p className="text-sm text-brand-muted">{meeting.scheduledStartTime ? format(new Date(meeting.scheduledStartTime), "PPpp") : "Instant meeting"}</p>
                </div>
                <button className="btn-primary" onClick={() => {
                  window.electronAPI.openMeetingWindow({ meetingId: meeting.meetingId, title: meeting.title });
                  announce(`Opening ${meeting.title}.`);
                }}>Join</button>
              </div>
            ))}
          </div>
        ) : <EmptyState title="No upcoming meetings" description="Your next scheduled calls will appear here." />}
      </Section>
      <Section title="Recent recordings">
        {recordings.length ? (
          <div className="space-y-3">
            {recordings.map((recording) => (
              <div key={recording._id} className="flex items-center justify-between rounded-2xl border border-brand-800 bg-brand-950/60 p-4">
                <div>
                  <p className="font-medium">{recording.fileUrl ? "Recording ready" : "Recording pending"}</p>
                  <p className="text-sm text-brand-muted">{recording.createdAt ? format(new Date(recording.createdAt), "PPp") : "Unknown date"}</p>
                </div>
                <button className="btn-secondary" onClick={() => window.electronAPI.openExternal(recording.fileUrl)}>Play</button>
              </div>
            ))}
          </div>
        ) : <EmptyState title="No recordings yet" description="Completed meeting recordings will show up here." />}
      </Section>
    </div>
  );
}

export function MeetingsPage() {
  const [items, setItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(Boolean(searchParams.get("new")));
  const [payload, setPayload] = useState({ title: "", description: "", scheduledStartTime: "", expectedDuration: 30, maxParticipants: 10, meetingType: "group", waitingRoomEnabled: false, muteOnEntry: false, allowSelfUnmute: true, autoRecord: false, e2eEncryptionEnabled: false, invitedParticipants: [] });
  const [inviteEmails, setInviteEmails] = useState("");
  const [createdMeetingLink, setCreatedMeetingLink] = useState("");
  const [createdMeetingId, setCreatedMeetingId] = useState("");
  const announce = useUiStore((state) => state.announce);
  const navigate = useNavigate();

  useEffect(() => {
    meetingService.list().then((data) => setItems(data.items || data.meetings || []));
    meetingService.listTemplates().then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get("new")) {
      setModalOpen(true);
    }
  }, [searchParams]);

  const filtered = items.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(search.toLowerCase());
    if (filter === "upcoming") {
      return titleMatch && item.status === "scheduled";
    }
    if (filter === "ongoing") {
      return titleMatch && item.status === "ongoing";
    }
    if (filter === "past") {
      return titleMatch && ["ended", "cancelled"].includes(item.status);
    }
    return titleMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {["all", "upcoming", "ongoing", "past"].map((tab) => (
          <button key={tab} className={filter === tab ? "btn-primary" : "btn-secondary"} onClick={() => setFilter(tab)}>
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <input className="field ml-auto max-w-sm" placeholder="Search meetings" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button className="btn-primary" onClick={() => setModalOpen(true)}>Create meeting</button>
      </div>

      {filtered.length ? (
        <div className="grid gap-4">
          {filtered.map((meeting) => (
            <div key={meeting._id || meeting.meetingId} className="panel flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="space-y-1">
                <p className="text-lg font-semibold">{meeting.title}</p>
                <p className="text-sm text-brand-muted">{meeting.scheduledStartTime ? format(new Date(meeting.scheduledStartTime), "PPpp") : "Instant meeting"} · {meeting.meetingType} · {meeting.status}</p>
                <p className="text-xs text-brand-muted">Meeting ID: {meeting.meetingId}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" onClick={() => {
                  window.electronAPI.openMeetingWindow({ meetingId: meeting.meetingId, title: meeting.title });
                  announce(`Opening ${meeting.title}.`);
                }}>Join</button>
                <button className="btn-secondary" onClick={() => navigate(`/app/meetings/${meeting.meetingId}`)}>Edit</button>
                <button className="btn-secondary" onClick={() => meetingService.cancel(meeting.meetingId).then((updated) => setItems((current) => current.map((item) => item.meetingId === meeting.meetingId ? updated : item)))}>Cancel</button>
                <button className="btn-secondary" onClick={() => meetingService.cancel(meeting.meetingId).then(() => setItems((current) => current.filter((item) => item.meetingId !== meeting.meetingId)))}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState title="No meetings found" description="Create your first meeting or adjust the filters to see more results." />}

      <Modal open={modalOpen} onClose={() => {
        setModalOpen(false);
        setSearchParams({});
        setCreatedMeetingLink("");
        setCreatedMeetingId("");
        setInviteEmails("");
      }} title="Create meeting">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="meeting-title" label="Meeting title">
            <input id="meeting-title" className="field" placeholder="Weekly team sync" value={payload.title} onChange={(event) => setPayload((current) => ({ ...current, title: event.target.value }))} />
          </Field>
          <Field id="meeting-start" label="Scheduled start">
            <input id="meeting-start" className="field" type="datetime-local" value={payload.scheduledStartTime} onChange={(event) => setPayload((current) => ({ ...current, scheduledStartTime: event.target.value }))} />
          </Field>
          <Field id="meeting-description" label="Description">
            <textarea id="meeting-description" className="field md:col-span-2" rows={3} placeholder="Agenda, goals, or context" value={payload.description} onChange={(event) => setPayload((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <Field id="meeting-duration" label="Expected duration (minutes)">
            <input id="meeting-duration" className="field" type="number" placeholder="30" value={payload.expectedDuration} onChange={(event) => setPayload((current) => ({ ...current, expectedDuration: Number(event.target.value) }))} />
          </Field>
          <Field id="meeting-capacity" label="Participant limit">
            <input id="meeting-capacity" className="field" type="number" placeholder="10" value={payload.maxParticipants} onChange={(event) => setPayload((current) => ({ ...current, maxParticipants: Number(event.target.value) }))} />
          </Field>
          <Field id="meeting-type" label="Meeting type">
            <select id="meeting-type" className="field" value={payload.meetingType} onChange={(event) => setPayload((current) => ({ ...current, meetingType: event.target.value }))}>
              <option value="one-on-one">One-on-one</option>
              <option value="group">Group</option>
              <option value="webinar">Webinar</option>
            </select>
          </Field>
          <Field id="meeting-template" label="Template">
            <select id="meeting-template" className="field" value={payload.templateId || ""} onChange={(event) => setPayload((current) => ({ ...current, templateId: event.target.value || undefined }))}>
              <option value="">No template</option>
              {templates.map((template) => <option key={template._id} value={template._id}>{template.name}</option>)}
            </select>
          </Field>
          <div className="panel md:col-span-2 space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Share meeting</h3>
                <p className="text-sm text-brand-muted">Copy the join link and invite people by email.</p>
              </div>
              <button
                className="btn-secondary"
                disabled={!createdMeetingLink}
                aria-label="Copy meeting join link"
                onClick={async () => {
                  try {
                    await copyMeetingLink(createdMeetingLink);
                  } catch (error) {
                    logActionError("Copy meeting link", error);
                  }
                }}
              >
                Copy join link
              </button>
            </div>
            <InviteEmailField
              id="meeting-invite-emails"
              label="Invite participants by email"
              hint="Add one or more email addresses separated by commas or new lines."
              value={inviteEmails}
              onChange={setInviteEmails}
              onRemove={(email) => setInviteEmails((current) => removeInviteEmail(current, email))}
            />
            <div className="flex flex-wrap gap-3">
              <button
                className="btn-primary"
                disabled={!createdMeetingId || !parseInviteEmails(inviteEmails).length}
                aria-label="Send meeting invites"
                onClick={async () => {
                  try {
                    await meetingService.update(createdMeetingId, {
                      invitedParticipants: toInvitePayload(inviteEmails)
                    });
                    toast.success("Invitations sent.");
                  } catch (error) {
                    logActionError("Send invites from create form", error);
                  }
                }}
              >
                Send invites
              </button>
              {createdMeetingLink ? <p className="text-sm text-brand-accent" role="status" aria-live="polite">{createdMeetingLink}</p> : null}
            </div>
          </div>
          <div className="panel md:col-span-2 grid gap-3 p-4">
            {[
              ["waitingRoomEnabled", "Waiting room"],
              ["muteOnEntry", "Mute on entry"],
              ["allowSelfUnmute", "Allow self unmute"],
              ["autoRecord", "Auto record"],
              ["e2eEncryptionEnabled", "End-to-end encryption"]
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-xl border border-brand-800 px-4 py-3">
                <span>{label}</span>
                <input type="checkbox" checked={Boolean(payload[key])} onChange={(event) => setPayload((current) => ({ ...current, [key]: event.target.checked }))} />
              </label>
            ))}
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <LoadingButton className="btn-primary flex-1" aria-label="Create meeting and prepare share link" onClick={async () => {
              try {
                const meeting = await meetingService.create({
                  ...payload,
                  invitedParticipants: toInvitePayload(inviteEmails),
                  scheduledStartTime: payload.scheduledStartTime ? new Date(payload.scheduledStartTime).toISOString() : undefined
                });
                setItems((current) => [meeting, ...current]);
                setCreatedMeetingLink(meeting.joinUrl || `https://onnonn.niveel.com/join/${meeting.meetingId}`);
                setCreatedMeetingId(meeting.meetingId);
                toast.success("Meeting created.");
              } catch (error) {
                logActionError("Create meeting", error);
              }
            }}>Create meeting</LoadingButton>
            <button className="btn-secondary" aria-label="Close create meeting dialog" onClick={() => {
              setModalOpen(false);
              setSearchParams({});
            }}>Done</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function MeetingDetailPage() {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [coaching, setCoaching] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [notes, setNotes] = useState([]);
  const [inviteEmails, setInviteEmails] = useState("");
  const announce = useUiStore((state) => state.announce);

  useEffect(() => {
    meetingService.get(meetingId).then(setMeeting);
    aiService.summary(meetingId).then(setSummary).catch(() => {});
    aiService.actionItems(meetingId).then(setItems).catch(() => {});
    aiService.coaching(meetingId).then(setCoaching).catch(() => {});
    aiService.sentiment(meetingId).then(setSentiment).catch(() => {});
    meetingService.notesList(meetingId).then(setNotes).catch(() => {});
  }, [meetingId]);

  if (!meeting) {
    return <EmptyState title="Loading meeting" description="Fetching meeting details and AI insights." />;
  }

  return (
    <div className="space-y-6">
      <Section
        title={meeting.title}
        actions={<button className="btn-primary" aria-label="Join meeting" onClick={() => {
          try {
            window.electronAPI.openMeetingWindow({ meetingId: meeting.meetingId, title: meeting.title });
            announce(`Opening ${meeting.title}.`);
          } catch (error) {
            logActionError("Join meeting", error);
          }
        }}>Join meeting</button>}
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold">Share Meeting</h3>
              <p className="mt-1 text-sm text-brand-muted">{meeting.description || "No description provided."}</p>
            </div>
            <Field id="share-join-url" label="Join URL">
              <input id="share-join-url" className="field" readOnly value={meeting.joinUrl || `https://onnonn.niveel.com/join/${meeting.meetingId}`} />
            </Field>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" aria-label="Copy full join link" onClick={async () => {
                try {
                  await copyMeetingLink(meeting.joinUrl || `https://onnonn.niveel.com/join/${meeting.meetingId}`);
                } catch (error) {
                  logActionError("Copy join link", error);
                }
              }}>Copy join link</button>
              <button className="btn-secondary" aria-label="Cancel meeting" onClick={async () => {
                try {
                  const updated = await meetingService.cancel(meeting.meetingId);
                  setMeeting(updated);
                  toast.success("Meeting cancelled.");
                } catch (error) {
                  logActionError("Cancel meeting", error);
                }
              }}>Cancel meeting</button>
            </div>
            <InviteEmailField
              id="detail-invite-emails"
              label="Invite participants by email"
              hint="Add email addresses separated by commas or one per line."
              value={inviteEmails}
              onChange={setInviteEmails}
              onRemove={(email) => setInviteEmails((current) => removeInviteEmail(current, email))}
            />
            <button className="btn-secondary" disabled={!parseInviteEmails(inviteEmails).length} aria-label="Send meeting invites" onClick={async () => {
              try {
                const updated = await meetingService.update(meeting.meetingId, {
                  invitedParticipants: toInvitePayload(inviteEmails)
                });
                setMeeting(updated);
                toast.success("Invitations sent.");
              } catch (error) {
                logActionError("Send meeting invites", error);
              }
            }}>Send invites</button>
          </div>
          <div className="grid gap-3 text-sm text-brand-muted">
            {[
              ["Meeting ID", meeting.meetingId],
              ["Join URL", meeting.joinUrl || `https://onnonn.niveel.com/join/${meeting.meetingId}`],
              ["Scheduled time", meeting.scheduledStartTime ? format(new Date(meeting.scheduledStartTime), "PPpp") : "Instant"],
              ["Duration", `${meeting.expectedDuration || 30} minutes`],
              ["Participant limit", String(meeting.maxParticipants || "Not set")],
              ["Status", meeting.status]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-brand-800 bg-brand-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-brand-muted">{label}</p>
                <p className="mt-2 text-sm text-brand-text break-all">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
      <Section title="AI summary">
        {summary ? <div className="space-y-3"><p>{summary.overview}</p><ul className="list-disc space-y-2 pl-6 text-sm text-brand-muted">{summary.smartNotes?.map((item) => <li key={item}>{item}</li>)}</ul></div> : <EmptyState title="No summary yet" description="AI meeting summaries appear here after the meeting ends." />}
      </Section>
      <Section title="AI action items">
        {items.length ? <div className="space-y-3">{items.map((item) => <div key={item._id} className="rounded-2xl border border-brand-800 p-4"><p className="font-medium">{item.task}</p><p className="text-sm text-brand-muted">{item.assigneeName || "Unassigned"} · {item.deadline ? format(new Date(item.deadline), "PP") : "No deadline"}</p></div>)}</div> : <EmptyState title="No action items yet" description="Structured follow-up tasks will show up here." />}
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Sentiment">{sentiment ? <p className="text-sm text-brand-muted">{sentiment.overallSentiment} · score {sentiment.overallScore}</p> : <EmptyState title="No sentiment report" description="Sentiment analysis becomes available after AI processing." />}</Section>
        <Section title="Coaching">{coaching ? <p className="text-sm text-brand-muted">{coaching.summary}</p> : <EmptyState title="No coaching report" description="Meeting coaching insights will appear here." />}</Section>
      </div>
      <Section title="Meeting notes">
        {notes.length ? <div className="space-y-3">{notes.map((note) => <div key={note._id} className="rounded-2xl border border-brand-800 p-4 text-sm">{note.content}</div>)}</div> : <EmptyState title="No notes yet" description="Shared meeting notes will appear here once created." />}
      </Section>
    </div>
  );
}

export function RecordingsPage() {
  const [data, setData] = useState([]);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    recordingService.list().then((response) => setData(response.items || []));
  }, []);

  return (
    <div className="space-y-6">
      {data.length ? data.map((recording) => (
        <div key={recording._id} className="panel flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold">{recording.status === "ready" ? "Recording ready" : "Recording processing"}</p>
            <p className="text-sm text-brand-muted">{recording.duration || 0}s · {(recording.fileSizeBytes || 0).toLocaleString()} bytes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => setPreview(recording)}>Play</button>
            <button className="btn-secondary" onClick={() => {
              const anchor = document.createElement("a");
              anchor.href = recording.fileUrl;
              anchor.download = `${recording.meeting?.title || "onnonn-recording"}.mp4`;
              anchor.click();
            }}>Download</button>
            <button className="btn-secondary" onClick={() => recordingService.share(recording._id, {}).then((result) => {
              navigator.clipboard.writeText(`https://onnonn.niveel.com/share/${result.token}`);
              toast.success("Share link copied.");
            })}>Share</button>
            <button className="btn-secondary" onClick={() => recordingService.remove(recording._id).then(() => setData((items) => items.filter((item) => item._id !== recording._id)))}>Delete</button>
          </div>
        </div>
      )) : <EmptyState title="No recordings yet" description="When cloud recordings are ready, they will appear here with playback and share options." />}

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title="Recording preview">
        {preview?.fileUrl ? <video controls className="w-full rounded-2xl" src={preview.fileUrl} /> : <EmptyState title="Recording unavailable" description="This recording does not have a playable file yet." />}
      </Modal>
    </div>
  );
}

export function ContactsPage() {
  const [tab, setTab] = useState("contacts");
  const [contacts, setContacts] = useState([]);
  const [pending, setPending] = useState([]);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    orgService.contacts().then(setContacts);
    orgService.pendingContacts().then(setPending);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => orgService.searchUsers(query).then(setResults).catch(() => {}), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        {["contacts", "pending", "search"].map((value) => (
          <button key={value} className={tab === value ? "btn-primary" : "btn-secondary"} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>
        ))}
      </div>

      {tab === "contacts" && (contacts.length ? <div className="space-y-3">{contacts.map((contact) => {
        const other = contact.requester?._id === useAuthStore.getState().user?._id ? contact.recipient : contact.requester;
        return <div key={contact._id} className="panel flex items-center justify-between p-4"><div><p className="font-medium">{other?.displayName || other?.email || "Contact"}</p><p className="text-sm text-brand-muted">{other?.email}</p></div><button className="btn-secondary" onClick={() => orgService.blockContact(other?._id || contact.requester?._id).then(() => setContacts((items) => items.filter((item) => item._id !== contact._id)))}>Remove</button></div>;
      })}</div> : <EmptyState title="No contacts yet" description="Accepted contacts will show up here for quick collaboration." />)}

      {tab === "pending" && (pending.length ? <div className="space-y-3">{pending.map((request) => <div key={request._id} className="panel flex items-center justify-between p-4"><div><p className="font-medium">{request.requester?.displayName || request.requester?.email}</p><p className="text-sm text-brand-muted">{request.requester?.email}</p></div><div className="flex gap-2"><button className="btn-primary" onClick={() => orgService.respondContactRequest(request.requester?._id, "accepted").then(() => setPending((items) => items.filter((item) => item._id !== request._id)))}>Accept</button><button className="btn-secondary" onClick={() => orgService.respondContactRequest(request.requester?._id, "rejected").then(() => setPending((items) => items.filter((item) => item._id !== request._id)))}>Reject</button></div></div>)}</div> : <EmptyState title="No pending requests" description="Incoming and outgoing contact requests will appear here." />)}

      {tab === "search" && (
        <Section title="Find people">
          <input className="field" placeholder="Search users by name or email" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="mt-4 space-y-3">
            {results.length ? results.map((user) => <div key={user._id} className="rounded-2xl border border-brand-800 p-4 flex items-center justify-between"><div><p className="font-medium">{user.displayName}</p><p className="text-sm text-brand-muted">{user.email}</p></div><button className="btn-primary" onClick={() => orgService.sendContactRequest(user._id)}>Send request</button></div>) : <p className="text-sm text-brand-muted">Search results will appear here.</p>}
          </div>
        </Section>
      )}
    </div>
  );
}

export function OrganizationPage() {
  const user = useAuthStore((state) => state.user);
  const refreshCurrentUser = useAuthStore((state) => state.refreshCurrentUser);
  const announce = useUiStore((state) => state.announce);
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "member", departmentName: "", inviteToken: "" });
  const organizationId = user?.organization?._id || user?.organizationId;

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    orgService.members(organizationId).then(setMembers).catch(() => {});
    orgService.departments(organizationId).then(setDepartments).catch(() => {});
    orgService.analytics(organizationId).then(setAnalytics).catch(() => {});
  }, [organizationId]);

  if (!organizationId && !organization) {
    return (
      <Section title="Create organization">
        <div className="grid gap-4 md:grid-cols-[1fr,auto]">
          <input className="field" placeholder="Organization name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <button className="btn-primary" onClick={() => orgService.create({ name: form.name }).then(async (created) => {
            setOrganization(created);
            await refreshCurrentUser();
            toast.success("Organization created.");
            announce("Organization created.");
          })}>Create organization</button>
        </div>
      </Section>
    );
  }

  const activeOrganizationId = organizationId || organization?._id;

  return (
    <div className="space-y-6">
      <Section title="Members">
        {members.length ? members.map((member) => <div key={member._id} className="mb-3 flex items-center justify-between rounded-2xl border border-brand-800 p-4"><div><p className="font-medium">{member.user?.displayName || member.user?.email}</p><p className="text-sm text-brand-muted">{member.role}</p></div><button className="btn-secondary" onClick={() => orgService.removeMember(activeOrganizationId, member.user?._id).then(() => setMembers((items) => items.filter((item) => item._id !== member._id)))}>Remove member</button></div>) : <EmptyState title="No members yet" description="Invite teammates to collaborate inside your organization workspace." />}
      </Section>
      <Section title="Invite member">
        <div className="grid gap-4 md:grid-cols-[1fr,180px,auto]">
          <input className="field" placeholder="Email address" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          <select className="field" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn-primary" onClick={() => orgService.invite(activeOrganizationId, { email: form.email, role: form.role }).then(() => {
            toast.success("Invitation sent.");
            announce("Invitation sent.");
          })}>Send invitation</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr,auto]">
          <input className="field" placeholder="Paste invitation token to accept" value={form.inviteToken} onChange={(event) => setForm((current) => ({ ...current, inviteToken: event.target.value }))} />
          <button className="btn-secondary" onClick={() => orgService.acceptInvite(form.inviteToken).then(async () => {
            toast.success("Invitation accepted.");
            announce("Invitation accepted.");
            await refreshCurrentUser();
          })}>Accept invitation</button>
        </div>
      </Section>
      <Section title="Departments">
        <div className="mb-4 flex gap-3">
          <input className="field" placeholder="New department name" value={form.departmentName} onChange={(event) => setForm((current) => ({ ...current, departmentName: event.target.value }))} />
          <button className="btn-primary" onClick={() => orgService.createDepartment(activeOrganizationId, { name: form.departmentName }).then((department) => setDepartments((items) => [...items, department]))}>Create</button>
        </div>
        {departments.length ? departments.map((department) => <div key={department._id} className="mb-3 flex items-center justify-between rounded-2xl border border-brand-800 p-4"><div><p className="font-medium">{department.name}</p><p className="text-sm text-brand-muted">{department.description || "No description"}</p></div><button className="btn-secondary" onClick={() => orgService.deleteDepartment(department._id).then(() => setDepartments((items) => items.filter((item) => item._id !== department._id)))}>Delete</button></div>) : <EmptyState title="No departments yet" description="Create departments to organize teams and reporting lines." />}
      </Section>
      <Section title="Analytics">
        {analytics ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(analytics).map(([key, value]) => <div key={key} className="rounded-2xl border border-brand-800 p-4"><p className="text-xs uppercase tracking-wide text-brand-muted">{key}</p><p className="mt-2 text-2xl font-semibold">{String(typeof value === "number" ? Math.round(value * 100) / 100 : value)}</p></div>)}
            </div>
            <div className="panel p-4">
              <div className="mb-4">
                <p className="font-medium">Organization activity</p>
                <p className="text-sm text-brand-muted">Simple bar view of the current organization analytics values.</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(analytics).map(([name, value]) => ({ name, value: Number(value) || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366F1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : <EmptyState title="Analytics unavailable" description="Organization analytics will appear here once meetings and members are active." />}
      </Section>
    </div>
  );
}

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const refreshCurrentUser = useAuthStore((state) => state.refreshCurrentUser);
  const announce = useUiStore((state) => state.announce);
  const [profile, setProfile] = useState(user || {});
  const [preferences, setPreferences] = useState({});
  const [sessions, setSessions] = useState([]);
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [disableTwoFactorPassword, setDisableTwoFactorPassword] = useState("");
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState("");
  const [googleStatus, setGoogleStatus] = useState(null);
  const [availability, setAvailability] = useState({ bookingHandle: "", slots: [], meetingDuration: 30, bufferMinutes: 15, isActive: true });

  useEffect(() => {
    orgService.getPreferences().then((response) => setPreferences(response || {})).catch(() => {});
    authService.listSessions().then(setSessions).catch(() => {});
    orgService.googleCalendarStatus().then(setGoogleStatus).catch(() => {});
  }, []);

  useEffect(() => {
    setProfile(user || {});
    if (user?.availability) {
      setAvailability({
        bookingHandle: user.availability.bookingHandle || "",
        slots: user.availability.slots || [],
        meetingDuration: user.availability.meetingDuration || 30,
        bufferMinutes: user.availability.bufferMinutes || 15,
        isActive: user.availability.isActive ?? true
      });
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <Section title="Profile">
        <div className="grid gap-4 md:grid-cols-2">
          <input className="field" placeholder="Display name" value={profile.displayName || ""} onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))} />
          <input className="field" placeholder="Job title" value={profile.jobTitle || ""} onChange={(event) => setProfile((current) => ({ ...current, jobTitle: event.target.value }))} />
          <input className="field" placeholder="Company name" value={profile.companyName || ""} onChange={(event) => setProfile((current) => ({ ...current, companyName: event.target.value }))} />
          <input className="field" placeholder="Phone number" value={profile.phoneNumber || ""} onChange={(event) => setProfile((current) => ({ ...current, phoneNumber: event.target.value }))} />
          <input className="field" placeholder="Timezone" value={profile.timezone || ""} onChange={(event) => setProfile((current) => ({ ...current, timezone: event.target.value }))} />
          <input className="field" placeholder="Language" value={profile.languagePreference || ""} onChange={(event) => setProfile((current) => ({ ...current, languagePreference: event.target.value }))} />
          <div className="md:col-span-2 flex items-center gap-4">
            <input type="file" className="field" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setProfile((current) => ({ ...current, profilePhotoUrl: reader.result }));
              reader.readAsDataURL(file);
            }} />
            <button className="btn-primary" onClick={() => authService.updateProfile(profile).then(async (updated) => {
              setProfile(updated);
              await refreshCurrentUser();
              toast.success("Profile updated.");
              announce("Profile updated.");
            })}>Save</button>
          </div>
        </div>
      </Section>
      <Section title="Security">
        <div className="grid gap-4 md:grid-cols-2">
          <button className="btn-secondary" onClick={() => authService.setup2FA().then((setup) => {
            setTwoFactorSetup(setup);
            toast.success("Scan the QR code with your authenticator app.");
            announce("Two-factor authentication setup is ready.");
          })}>Setup 2FA</button>
          {twoFactorSetup?.qrCode && <img src={twoFactorSetup.qrCode} alt="2FA QR code" className="w-48 rounded-2xl border border-brand-800 p-3" />}
          {twoFactorSetup?.qrCode ? <input className="field" placeholder="Enter 6-digit authenticator code" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} /> : null}
          {twoFactorSetup?.qrCode ? <button className="btn-primary" onClick={() => authService.enable2FA(twoFactorCode).then(async () => {
            toast.success("Two-factor authentication enabled.");
            announce("Two-factor authentication enabled.");
            await refreshCurrentUser();
          })}>Enable 2FA</button> : null}
          <input className="field" type="password" placeholder="Current password to disable 2FA" value={disableTwoFactorPassword} onChange={(event) => setDisableTwoFactorPassword(event.target.value)} />
          <button className="btn-secondary" onClick={() => authService.disable2FA(disableTwoFactorPassword).then(async () => {
            setDisableTwoFactorPassword("");
            toast.success("Two-factor authentication disabled.");
            announce("Two-factor authentication disabled.");
            await refreshCurrentUser();
          })}>Disable 2FA</button>
        </div>
      </Section>
      <Section title="Notification preferences">
        <div className="space-y-3">
          {["meetingInvitation", "meetingReminder", "recordingReady"].map((key) => (
            <div key={key} className="grid grid-cols-[1fr,repeat(3,80px)] items-center gap-3 rounded-2xl border border-brand-800 p-4">
              <span>{key}</span>
              {["email", "inApp", "push"].map((channel) => (
                <label key={channel} className="flex items-center justify-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={preferences[key]?.[channel] ?? true}
                    onChange={(event) => setPreferences((current) => ({
                      ...current,
                      [key]: { ...(current[key] || {}), [channel]: event.target.checked }
                    }))}
                  />
                  {channel}
                </label>
              ))}
            </div>
          ))}
          <button className="btn-primary" onClick={() => orgService.updatePreferences(preferences).then((updated) => {
            setPreferences(updated || preferences);
            toast.success("Notification preferences saved.");
            announce("Notification preferences saved.");
          })}>Save preferences</button>
        </div>
      </Section>
      <Section title="Connected accounts">
        <div className="flex items-center justify-between rounded-2xl border border-brand-800 p-4">
          <div>
            <p className="font-medium">Google Calendar</p>
            <p className="text-sm text-brand-muted">{googleStatus?.connected ? "Connected" : "Not connected"}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => authService.getGoogleUrl().then((url) => {
              announce("Opening Google Calendar connection in your browser.");
              return window.electronAPI.openExternal(buildDesktopOAuthUrl(url, "calendar"));
            })}>Connect</button>
            <button className="btn-secondary" onClick={() => orgService.googleCalendarDisconnect().then(() => {
              setGoogleStatus({ connected: false });
              toast.success("Google Calendar disconnected.");
              announce("Google Calendar disconnected.");
            })}>Disconnect</button>
          </div>
        </div>
      </Section>
      <Section title="Availability">
        <div className="grid gap-4 md:grid-cols-2">
          <input className="field" placeholder="Booking handle" value={availability.bookingHandle} onChange={(event) => setAvailability((current) => ({ ...current, bookingHandle: event.target.value }))} />
          <input className="field" type="number" placeholder="Meeting duration" value={availability.meetingDuration} onChange={(event) => setAvailability((current) => ({ ...current, meetingDuration: Number(event.target.value) }))} />
          <input className="field" type="number" placeholder="Buffer minutes" value={availability.bufferMinutes} onChange={(event) => setAvailability((current) => ({ ...current, bufferMinutes: Number(event.target.value) }))} />
          <label className="panel flex items-center justify-between px-4 py-3"><span>Availability enabled</span><input type="checkbox" checked={availability.isActive} onChange={(event) => setAvailability((current) => ({ ...current, isActive: event.target.checked }))} /></label>
          <button className="btn-primary md:col-span-2" onClick={() => orgService.upsertAvailability(availability).then(async (saved) => {
            setAvailability(saved);
            toast.success("Availability saved.");
            announce("Availability saved.");
            await refreshCurrentUser();
          })}>Save availability</button>
        </div>
      </Section>
      <Section title="Session management">
        {sessions.length ? sessions.map((session) => <div key={session._id} className="mb-3 flex items-center justify-between rounded-2xl border border-brand-800 p-4"><div><p className="font-medium">{session.userAgent || "Unknown device"}</p><p className="text-sm text-brand-muted">{session.ipAddress || "Unknown IP"}</p></div><button className="btn-secondary" onClick={() => authService.revokeSession(session._id).then(() => {
          setSessions((items) => items.filter((item) => item._id !== session._id));
          toast.success("Session revoked.");
          announce("Session revoked.");
        })}>Revoke</button></div>) : <EmptyState title="No active sessions listed" description="Signed-in devices will appear here for quick revocation." />}
      </Section>
      <Section title="Danger zone">
        <div className="space-y-3">
          <p className="text-sm text-brand-muted">Type {user?.email || "your email"} to request account deletion.</p>
          <input className="field" placeholder="Confirm your email address" value={deleteConfirmationEmail} onChange={(event) => setDeleteConfirmationEmail(event.target.value)} />
          <button className="btn-secondary" disabled={deleteConfirmationEmail !== user?.email} onClick={() => {
            orgService.requestGdpr("deletion").then(() => {
              toast.success("Deletion request submitted.");
              announce("Deletion request submitted.");
              setDeleteConfirmationEmail("");
            });
          }}>Delete account</button>
        </div>
      </Section>
    </div>
  );
}

