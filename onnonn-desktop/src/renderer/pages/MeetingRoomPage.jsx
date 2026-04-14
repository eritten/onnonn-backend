import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, VideoConference, useRoomContext } from "@livekit/components-react";
import { LocalVideoTrack, ParticipantEvent, RoomEvent, Track } from "livekit-client";
import { formatDistanceStrict } from "date-fns";
import {
  BadgeCheck,
  BrushCleaning,
  Camera,
  CameraOff,
  CircleDot,
  ClipboardPenLine,
  Clock3,
  Eraser,
  FileUp,
  Hand,
  Hourglass,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  RefreshCcw,
  Shield,
  PhoneOff,
  Save,
  Send,
  Smile,
  Users,
  VideoOff,
  Vote,
  Volume2,
  VolumeX,
  ShieldCheck
} from "lucide-react";
import toast from "react-hot-toast";
import { meetingService } from "../services/meetingService";
import { recordingService } from "../services/otherServices";
import { EmptyState } from "../components/EmptyState";
import { LoadingButton } from "../components/LoadingButton";
import { Modal } from "../components/Modal";
import { ReactionPicker } from "../components/ReactionPicker";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import sharedConfig from "../../shared/config.json";

const { LIVEKIT_URL } = sharedConfig;
const dataEncoder = new TextEncoder();
const dataDecoder = new TextDecoder();

function normalizeTimestamp(value) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function getParticipantLabel(participant) {
  return participant?.name || participant?.identity || "Participant";
}

function publishMeetingData(room, payload, options = {}) {
  if (!room?.localParticipant) {
    return Promise.resolve();
  }

  const encoded = dataEncoder.encode(JSON.stringify(payload));
  return room.localParticipant.publishData(encoded, {
    reliable: true,
    ...options
  }).catch(() => {});
}

function ControlButton({ active, icon: Icon, label, onClick, danger = false, shortcut }) {
  return (
    <button
      className={`${danger ? "bg-brand-error text-white" : active ? "bg-brand-accent text-white" : "bg-brand-900 text-brand-text"} inline-flex min-w-[96px] flex-col items-center justify-center gap-2 rounded-2xl border border-brand-800 px-4 py-3 text-xs font-medium transition hover:brightness-110`}
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={shortcut ? `${label}. Shortcut ${shortcut}.` : label}
      aria-keyshortcuts={shortcut || undefined}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function ChatPanel({ meeting, room, currentUser, liveParticipants }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    meetingService.chatList(meeting.meetingId).then((items) => {
      setMessages(items || []);
    }).catch(() => {});
  }, [meeting.meetingId]);

  useEffect(() => {
    const handleData = (payload, participant) => {
      try {
        const decoded = JSON.parse(dataDecoder.decode(payload));
        if (!["chat", "chat-file", "chat-delete", "chat-pin"].includes(decoded.type)) {
          return;
        }
        setMessages((current) => {
          if (decoded.type === "chat-delete") {
            return current.filter((item) => item._id !== decoded.messageId);
          }
          if (current.some((item) => item._id === decoded.messageId)) {
            return current;
          }
          return [...current, {
            _id: decoded.messageId,
            senderName: decoded.senderName || participant?.name,
            content: decoded.content,
            originalFilename: decoded.originalFilename,
            fileUrl: decoded.fileUrl,
            createdAt: decoded.timestamp
          }];
        });
      } catch (_error) {
        // ignore non-chat payloads
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  async function sendMessage() {
    if (!content.trim()) {
      return;
    }
    const message = await meetingService.chatSend(meeting.meetingId, {
      content,
      recipientId: recipientId || undefined
    });
    setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]);
    await publishMeetingData(room, {
      type: "chat",
      messageId: message._id,
      senderName: currentUser?.displayName || "You",
      content: message.content,
      timestamp: normalizeTimestamp(message.createdAt),
      recipientId: recipientId || null
    }, recipientId ? { destinationIdentities: [recipientId] } : {});
    setContent("");
  }

  async function uploadFile(file) {
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const message = await meetingService.chatUpload(meeting.meetingId, formData);
      setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]);
      await publishMeetingData(room, {
        type: "chat-file",
        messageId: message._id,
        senderName: currentUser?.displayName || "You",
        content: message.content || "",
        timestamp: normalizeTimestamp(message.createdAt),
        originalFilename: message.originalFilename,
        fileUrl: message.fileUrl
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-brand-800 px-4 py-3">
        <div>
          <h3 className="font-semibold">Chat</h3>
          <p className="text-xs text-brand-muted">Messages stay in sync instantly for everyone in the room.</p>
        </div>
        <MessageSquare size={18} className="text-brand-accent" />
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {messages.length ? messages.map((message) => (
          <div key={message._id} className="rounded-2xl border border-brand-800 bg-brand-950/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{message.sender?.displayName || message.senderName || "Participant"}</p>
              <p className="text-[11px] text-brand-muted">{new Date(normalizeTimestamp(message.createdAt)).toLocaleTimeString()}</p>
            </div>
            {message.content ? <p className="mt-2 text-sm text-brand-muted">{message.content}</p> : null}
            {message.fileUrl ? (
              <button className="mt-3 text-sm text-brand-accent" onClick={() => window.electronAPI.openExternal(message.fileUrl)}>
                {message.originalFilename || "Open file"}
              </button>
            ) : null}
          </div>
        )) : <EmptyState title="No messages yet" description="Start the conversation or share a file with the room." />}
      </div>
      <div className="border-t border-brand-800 p-4">
        <select className="field mb-3" value={recipientId} onChange={(event) => setRecipientId(event.target.value)}>
          <option value="">Send to everyone</option>
          {liveParticipants.map((participant) => (
            <option key={participant.identity} value={participant.identity}>
              {participant.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input className="field" placeholder={`Message as ${currentUser?.displayName || "you"}`} value={content} onChange={(event) => setContent(event.target.value)} />
          <label className="btn-secondary cursor-pointer">
            <FileUp size={16} className="mr-2" />
            <input type="file" className="hidden" onChange={(event) => uploadFile(event.target.files?.[0])} />
            {uploading ? "Uploading..." : "File"}
          </label>
          <button className="btn-primary" onClick={sendMessage}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ParticipantsPanel({ liveParticipants, isHost, onMute, onRemove }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-brand-800 px-4 py-3">
        <div>
          <h3 className="font-semibold">Participants</h3>
          <p className="text-xs text-brand-muted">{liveParticipants.length} live in the room</p>
        </div>
        <Users size={18} className="text-brand-accent" />
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {liveParticipants.length ? liveParticipants.map((participant) => (
          <div key={participant.identity} className="rounded-2xl border border-brand-800 bg-brand-950/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{participant.name}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-brand-muted">
                  <span className="inline-flex items-center gap-1">{participant.audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}Audio</span>
                  <span className="inline-flex items-center gap-1">{participant.videoEnabled ? <Camera size={14} /> : <VideoOff size={14} />}Video</span>
                </div>
              </div>
              {isHost ? (
                <div className="flex gap-2">
                  <button className="btn-secondary px-3 py-2" onClick={() => onMute(participant)}>Mute</button>
                  <button className="btn-secondary px-3 py-2" onClick={() => onRemove(participant)}>Remove</button>
                </div>
              ) : null}
            </div>
          </div>
        )) : <EmptyState title="No live participants yet" description="Participant status updates appear as people join." />}
      </div>
    </div>
  );
}

function PollsPanel({ meeting }) {
  const [polls, setPolls] = useState([]);
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("Yes\nNo");

  async function createPoll() {
    const poll = await meetingService.createPoll(meeting.meetingId, {
      question,
      options: optionsText.split("\n").map((item) => item.trim()).filter(Boolean)
    });
    setPolls((current) => [poll, ...current]);
    setQuestion("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-brand-800 px-4 py-3">
        <div>
          <h3 className="font-semibold">Polls</h3>
          <p className="text-xs text-brand-muted">Launch quick votes and share results instantly.</p>
        </div>
        <Vote size={18} className="text-brand-accent" />
      </div>
      <div className="space-y-3 border-b border-brand-800 p-4">
        <input className="field" placeholder="Poll question" value={question} onChange={(event) => setQuestion(event.target.value)} />
        <textarea className="field" rows={4} placeholder="One option per line" value={optionsText} onChange={(event) => setOptionsText(event.target.value)} />
        <button className="btn-primary w-full" onClick={createPoll}>Create poll</button>
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {polls.length ? polls.map((poll) => (
          <div key={poll._id} className="rounded-2xl border border-brand-800 bg-brand-950/70 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium">{poll.question}</p>
              {!poll.isEnded ? (
                <button className="btn-secondary px-3 py-2" onClick={() => meetingService.endPoll(poll._id).then((updated) => setPolls((current) => current.map((item) => item._id === poll._id ? updated : item)))}>
                  End
                </button>
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {(poll.options || []).map((option, index) => (
                <button key={index} className="field text-left" onClick={() => meetingService.respondPoll(poll._id, { optionIndex: index })}>
                  {option.text || option}
                </button>
              ))}
            </div>
          </div>
        )) : <EmptyState title="No active polls" description="Hosts can launch polls here during the meeting." />}
      </div>
    </div>
  );
}

function WhiteboardPanel({ meeting }) {
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const [color, setColor] = useState("#6366F1");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [eraser, setEraser] = useState(false);
  const lastSyncedState = useRef("");

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    const nextWidth = Math.max(Math.floor(width), 1);
    const nextHeight = Math.max(Math.floor(height), 1);
    const snapshot = canvas.toDataURL("image/png");

    canvas.width = nextWidth * ratio;
    canvas.height = nextHeight * ratio;
    canvas.style.width = `${nextWidth}px`;
    canvas.style.height = `${nextHeight}px`;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(ratio, ratio);

    if (snapshot && snapshot !== "data:,") {
      const image = new Image();
      image.onload = () => {
        context.clearRect(0, 0, nextWidth, nextHeight);
        context.drawImage(image, 0, 0, nextWidth, nextHeight);
      };
      image.src = snapshot;
    }
  }, []);

  const getCanvasPoint = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    return {
      x: (event.clientX - rect.left) * ratio / ratio,
      y: (event.clientY - rect.top) * ratio / ratio
    };
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    const syncFromServer = async () => {
      try {
        const whiteboard = await meetingService.whiteboardGet(meeting.meetingId);
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context || !whiteboard?.canvasState || whiteboard.canvasState === lastSyncedState.current) {
          return;
        }
        const image = new Image();
        image.onload = () => {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
        };
        image.src = whiteboard.canvasState;
        lastSyncedState.current = whiteboard.canvasState;
      } catch (_error) {
        // ignore polling failures
      }
    };

    syncFromServer();
    const timer = window.setInterval(syncFromServer, 3000);
    return () => window.clearInterval(timer);
  }, [meeting.meetingId]);

  async function persistCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const nextState = canvas.toDataURL("image/png");
    lastSyncedState.current = nextState;
    await meetingService.whiteboardUpdate(meeting.meetingId, nextState);
  }

  function beginDrawing(event) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const point = getCanvasPoint(event.nativeEvent);
    if (!canvas || !context) {
      return;
    }
    if (!point) {
      return;
    }
    context.strokeStyle = eraser ? "#FFFFFF" : color;
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
  }

  function draw(event) {
    if (!isDrawing) {
      return;
    }
    const context = canvasRef.current?.getContext("2d");
    const point = getCanvasPoint(event.nativeEvent);
    if (!context) {
      return;
    }
    if (!point) {
      return;
    }
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function finishDrawing() {
    if (!isDrawing) {
      return;
    }
    setIsDrawing(false);
    persistCanvas().catch(() => {});
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      persistCanvas().catch(() => {});
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-brand-800 px-4 py-3">
        <div>
          <h3 className="font-semibold">Whiteboard</h3>
          <p className="text-xs text-brand-muted">Draw with your mouse and sync after each stroke.</p>
        </div>
        <ClipboardPenLine size={18} className="text-brand-accent" />
      </div>
      <div className="flex flex-wrap gap-3 border-b border-brand-800 p-4">
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        <input type="range" min="1" max="20" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
        <button className={eraser ? "btn-primary" : "btn-secondary"} onClick={() => setEraser((current) => !current)}>
          <Eraser size={16} className="mr-2" />
          Eraser
        </button>
        <button className="btn-secondary" onClick={clearCanvas}>
          <BrushCleaning size={16} className="mr-2" />
          Clear
        </button>
        <button className="btn-primary" onClick={() => persistCanvas().then(() => toast.success("Whiteboard synced."))}>
          <Save size={16} className="mr-2" />
          Sync
        </button>
      </div>
      <div ref={canvasContainerRef} className="flex-1 p-4">
        <canvas
          ref={canvasRef}
          className="h-full w-full rounded-2xl border border-brand-800 bg-white"
          onMouseDown={beginDrawing}
          onMouseMove={draw}
          onMouseUp={finishDrawing}
          onMouseLeave={finishDrawing}
        />
      </div>
    </div>
  );
}

function WaitingRoomPanel({ meeting, isHost }) {
  const [participants, setParticipants] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!isHost) {
      return undefined;
    }
    const refresh = async () => {
      setRefreshing(true);
      try {
        const nextParticipants = await meetingService.waitingList(meeting.meetingId);
        setParticipants(nextParticipants);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("[Onnonn Desktop] Waiting room refresh failed", error);
      } finally {
        setRefreshing(false);
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [isHost, meeting.meetingId]);

  if (!isHost) {
    return <EmptyState title="Host controls only" description="Waiting room actions are only available to the meeting host." />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-brand-800 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Waiting room</h3>
            <p className="text-xs text-brand-muted">Review, admit, or reject guests before they enter the live meeting.</p>
          </div>
          <div className="rounded-2xl bg-brand-accent/15 p-3 text-brand-accent">
            <ShieldCheck size={18} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-brand-800 bg-brand-950/50 p-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-brand-muted">Waiting</p>
            <p className="mt-2 text-2xl font-semibold text-brand-text">{participants.length}</p>
          </div>
          <div className="rounded-2xl border border-brand-800 bg-brand-950/50 p-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-brand-muted">Refresh</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-brand-text">
              <RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Updating…" : "Every 5 seconds"}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-800 bg-brand-950/50 p-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-brand-muted">Last check</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-brand-text">
              <Clock3 size={14} />
              {lastUpdated ? lastUpdated.toLocaleTimeString() : "Just now"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-brand-800 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Guests awaiting admission</p>
          <p className="text-xs text-brand-muted">Only hosts can manage the waiting room.</p>
        </div>
        <button
          type="button"
          className="btn-secondary px-3 py-2"
          aria-label="Refresh waiting room list"
          onClick={async () => {
            try {
              setRefreshing(true);
              const nextParticipants = await meetingService.waitingList(meeting.meetingId);
              setParticipants(nextParticipants);
              setLastUpdated(new Date());
              toast.success("Waiting room updated.");
            } catch (error) {
              console.error("[Onnonn Desktop] Manual waiting room refresh failed", error);
              toast.error("Could not refresh waiting room.");
            } finally {
              setRefreshing(false);
            }
          }}
        >
          <RefreshCcw size={16} className={`mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {participants.length ? (
          <ul className="space-y-3" role="list" aria-label="Participants in the waiting room">
            {participants.map((participant) => (
              <li key={participant.identity} className="rounded-[24px] border border-brand-800 bg-gradient-to-br from-brand-950/90 to-brand-900/70 p-4 shadow-panel">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="rounded-2xl bg-brand-accent/15 p-3 text-brand-accent">
                      <Hourglass size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-brand-text">{participant.name || participant.identity}</p>
                      <p className="mt-1 text-xs text-brand-muted">{participant.identity}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-900 px-3 py-1 text-brand-muted">
                          <Shield size={12} />
                          Waiting securely
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-accent/15 px-3 py-1 text-brand-accent">
                          <BadgeCheck size={12} />
                          Host approval required
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      className="btn-primary px-4 py-2"
                      aria-label={`Admit ${participant.name || participant.identity} to the meeting`}
                      onClick={async () => {
                        try {
                          await meetingService.admitWaiting(meeting.meetingId, participant.identity);
                          setParticipants((current) => current.filter((item) => item.identity !== participant.identity));
                          toast.success(`${participant.name || "Guest"} admitted.`);
                        } catch (error) {
                          console.error("[Onnonn Desktop] Admit waiting participant failed", error);
                          toast.error("Could not admit participant.");
                        }
                      }}
                    >
                      Admit
                    </button>
                    <button
                      className="btn-secondary px-4 py-2"
                      aria-label={`Reject ${participant.name || participant.identity} from the meeting`}
                      onClick={async () => {
                        try {
                          await meetingService.rejectWaiting(meeting.meetingId, participant.identity);
                          setParticipants((current) => current.filter((item) => item.identity !== participant.identity));
                          toast.success(`${participant.name || "Guest"} rejected.`);
                        } catch (error) {
                          console.error("[Onnonn Desktop] Reject waiting participant failed", error);
                          toast.error("Could not reject participant.");
                        }
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="Waiting room is clear" description="Anyone waiting for admission will show up here." />}
      </div>
      <div className="border-t border-brand-800 p-4">
        <button
          className="btn-primary w-full"
          aria-label="Admit every participant in the waiting room"
          onClick={async () => {
            try {
              await meetingService.admitAllWaiting(meeting.meetingId);
              setParticipants([]);
              toast.success("All waiting participants admitted.");
            } catch (error) {
              console.error("[Onnonn Desktop] Admit all waiting participants failed", error);
              toast.error("Could not admit everyone.");
            }
          }}
        >
          Admit all
        </button>
      </div>
    </div>
  );
}

function MeetingRoomContent({ meeting, token, panel, setPanel, currentUser, onMeetingClosed }) {
  const room = useRoomContext();
  const announce = useUiStore((state) => state.announce);
  const [liveParticipants, setLiveParticipants] = useState([]);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [recording, setRecording] = useState(null);
  const [startedAt] = useState(Date.now());
  const [elapsed, setElapsed] = useState("0 seconds");
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [screenSources, setScreenSources] = useState([]);
  const [screenPickerOpen, setScreenPickerOpen] = useState(false);

  const isHost = useMemo(() => {
    const hostId = typeof meeting.host === "object" ? meeting.host?._id : meeting.host;
    return Boolean(currentUser?._id && hostId && String(currentUser._id) === String(hostId));
  }, [currentUser?._id, meeting.host]);

  const toggleMic = useCallback(async () => {
    await room.localParticipant.setMicrophoneEnabled(muted);
    setMuted((current) => !current);
  }, [muted, room.localParticipant]);

  const toggleCamera = useCallback(async () => {
    await room.localParticipant.setCameraEnabled(cameraOff);
    setCameraOff((current) => !current);
  }, [cameraOff, room.localParticipant]);

  const beginScreenShare = useCallback(async (sourceId, sourceName) => {
    try {
      await window.electronAPI.selectScreenShareSource(sourceId);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      const track = stream.getVideoTracks()[0];
      if (!track) {
        return;
      }
      const localTrack = new LocalVideoTrack(track);
      track.addEventListener("ended", () => {
        room.localParticipant.unpublishTrack(localTrack, true);
      });
      await room.localParticipant.publishTrack(localTrack, { source: Track.Source.ScreenShare });
      setScreenPickerOpen(false);
      toast.success(`Sharing ${sourceName}`);
    } catch (error) {
      console.error("Screen sharing failed", error);
      toast.error("Could not start screen sharing.");
    }
  }, [room.localParticipant]);

  const shareScreen = useCallback(async () => {
    const sources = await window.electronAPI.listDesktopSources();
    if (!sources.length) {
      toast.error("No screen source was available.");
      return;
    }
    setScreenSources(sources);
    setScreenPickerOpen(true);
  }, []);

  const toggleHand = useCallback(async () => {
    if (handRaised) {
      await meetingService.lowerHand(meeting.meetingId);
    } else {
      await meetingService.raiseHand(meeting.meetingId);
    }
    setHandRaised((current) => !current);
  }, [handRaised, meeting.meetingId]);

  const sendReaction = useCallback(async (reaction) => {
    if (reaction.emoji === "\u270B") {
      await toggleHand();
      return;
    }
    await meetingService.react(meeting.meetingId, { emoji: reaction.emoji });
    await publishMeetingData(room, {
      type: "reaction",
      emoji: reaction.emoji,
      senderName: currentUser?.displayName || room.localParticipant?.name || "You",
      timestamp: new Date().toISOString()
    });
    const id = `${reaction.emoji}-${Date.now()}`;
    setFloatingReactions((current) => [...current, { id, emoji: reaction.emoji, senderName: currentUser?.displayName || "You" }]);
    window.setTimeout(() => {
      setFloatingReactions((current) => current.filter((item) => item.id !== id));
    }, 3000);
  }, [currentUser?.displayName, meeting.meetingId, room, toggleHand]);

  const toggleRecording = useCallback(async () => {
    if (recording?._id) {
      await recordingService.stop(recording._id);
      setRecording(null);
      toast.success("Recording stopped.");
      return;
    }
    const nextRecording = await recordingService.start(meeting.meetingId);
    setRecording(nextRecording);
    toast.success("Recording started.");
  }, [meeting.meetingId, recording?._id]);

  const leaveRoom = useCallback(async () => {
    await room.disconnect();
    await window.electronAPI.closeMeetingWindow();
    await window.electronAPI.focusMainWindow();
  }, [room]);

  const endMeeting = useCallback(async () => {
    await meetingService.end(meeting.meetingId);
    toast.success("Meeting ended for all participants.");
    await leaveRoom();
  }, [leaveRoom, meeting.meetingId]);

  const muteParticipant = useCallback(async (participant) => {
    await meetingService.muteParticipant(meeting.meetingId, participant.identity, undefined, true);
  }, [meeting.meetingId]);

  const removeParticipant = useCallback(async (participant) => {
    await meetingService.removeParticipant(meeting.meetingId, participant.identity);
  }, [meeting.meetingId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(formatDistanceStrict(startedAt, Date.now()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    const mapParticipant = (participant) => {
      const publications = Array.from(participant.trackPublications.values?.() || []);
      return {
        identity: participant.identity,
        name: getParticipantLabel(participant),
        audioEnabled: publications.some((publication) => publication.kind === Track.Kind.Audio && !publication.isMuted),
        videoEnabled: publications.some((publication) => publication.kind === Track.Kind.Video && !publication.isMuted)
      };
    };

    const syncParticipants = () => {
      const all = [room.localParticipant, ...Array.from(room.remoteParticipants.values())].filter(Boolean).map(mapParticipant);
      setLiveParticipants(all);
    };

    syncParticipants();
    const handleParticipantConnected = (participant) => {
      syncParticipants();
      const participantName = getParticipantLabel(participant);
      toast.success(`${participantName} joined the meeting.`);
      announce(`${participantName} joined the meeting.`);
    };
    const handleParticipantDisconnected = (participant) => {
      syncParticipants();
      const participantName = getParticipantLabel(participant);
      toast(`${participantName} left the meeting.`);
      announce(`${participantName} left the meeting.`);
    };
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.TrackMuted, syncParticipants);
    room.on(RoomEvent.TrackUnmuted, syncParticipants);
    room.localParticipant?.on(ParticipantEvent.LocalTrackPublished, syncParticipants);
    room.localParticipant?.on(ParticipantEvent.LocalTrackUnpublished, syncParticipants);

    const handleData = (payload, participant) => {
      try {
        const decoded = JSON.parse(dataDecoder.decode(payload));
        if (decoded.type !== "reaction") {
          return;
        }
        const id = `${decoded.emoji}-${Date.now()}`;
        setFloatingReactions((current) => [...current, { id, emoji: decoded.emoji, senderName: decoded.senderName || participant?.name || "Participant" }]);
        window.setTimeout(() => {
          setFloatingReactions((current) => current.filter((item) => item.id !== id));
        }, 3000);
      } catch (_error) {
        // ignore other data payloads
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    room.on(RoomEvent.Disconnected, () => onMeetingClosed());

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.TrackMuted, syncParticipants);
      room.off(RoomEvent.TrackUnmuted, syncParticipants);
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [announce, onMeetingClosed, room]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented) {
        return;
      }

      const targetTag = event.target?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(targetTag)) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case "m":
          event.preventDefault();
          toggleMic().catch(() => {});
          announce("Microphone toggled.");
          break;
        case "c":
          event.preventDefault();
          toggleCamera().catch(() => {});
          announce("Camera toggled.");
          break;
        case "s":
          event.preventDefault();
          shareScreen().catch(() => {});
          announce("Choose a screen to share.");
          break;
        case "h":
          event.preventDefault();
          toggleHand().catch(() => {});
          announce(handRaised ? "Hand lowered." : "Hand raised.");
          break;
        case "r":
          event.preventDefault();
          toggleRecording().catch(() => {});
          announce(recording ? "Stopping recording." : "Starting recording.");
          break;
        case "escape":
          if (panel) {
            event.preventDefault();
            setPanel(null);
            announce("Side panel closed.");
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [announce, handRaised, panel, recording, setPanel, shareScreen, toggleCamera, toggleHand, toggleMic, toggleRecording]);

  return (
    <>
      <RoomAudioRenderer />
      <div className="flex h-screen flex-col bg-brand-950 text-brand-text">
        <header className="flex items-center justify-between gap-4 border-b border-brand-800 bg-brand-950/95 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">{meeting.title}</h1>
            <p className="text-xs text-brand-muted">{elapsed} in meeting</p>
          </div>
          <div className="flex items-center gap-4">
            {recording ? <span className="inline-flex items-center gap-2 rounded-full bg-brand-error/15 px-3 py-2 text-xs text-brand-error"><CircleDot size={12} />Recording</span> : null}
            <span className="rounded-full bg-brand-900 px-3 py-2 text-xs text-brand-muted">{liveParticipants.length} participants</span>
            <span className="rounded-full bg-brand-accent/15 px-3 py-2 text-xs text-brand-accent">{token ? "Room connected" : "Connecting"}</span>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex-1 overflow-hidden bg-black">
            <VideoConference />
            <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center gap-3">
              {floatingReactions.map((reaction) => (
                <div
                  key={reaction.id}
                  className="rounded-full bg-brand-900/90 px-4 py-3 text-3xl shadow-panel"
                  style={{ animation: "float-up 3s ease-out forwards" }}
                >
                  {reaction.emoji}
                </div>
              ))}
            </div>
          </div>

          <aside className="w-[390px] border-l border-brand-800 bg-brand-900/80">
            {panel === "chat" ? <ChatPanel meeting={meeting} room={room} currentUser={currentUser} liveParticipants={liveParticipants} /> : null}
            {panel === "participants" ? <ParticipantsPanel liveParticipants={liveParticipants} isHost={isHost} onMute={muteParticipant} onRemove={removeParticipant} /> : null}
            {panel === "polls" ? <PollsPanel meeting={meeting} /> : null}
            {panel === "whiteboard" ? <WhiteboardPanel meeting={meeting} /> : null}
            {panel === "waiting" ? <WaitingRoomPanel meeting={meeting} isHost={isHost} /> : null}
          </aside>
        </div>

        <footer className="border-t border-brand-800 bg-brand-950/95 px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ControlButton active={!muted} icon={muted ? MicOff : Mic} label={muted ? "Unmute" : "Mute"} onClick={toggleMic} shortcut="M" />
            <ControlButton active={!cameraOff} icon={cameraOff ? CameraOff : Camera} label={cameraOff ? "Camera on" : "Camera off"} onClick={toggleCamera} shortcut="C" />
            <ControlButton active={false} icon={MonitorUp} label="Share" onClick={shareScreen} shortcut="S" />
            <ControlButton active={handRaised} icon={Hand} label={handRaised ? "Lower hand" : "Raise hand"} onClick={toggleHand} shortcut="H" />
            <div className="relative">
              <ControlButton active={panel === "reactions"} icon={Smile} label="Reactions" onClick={() => setPanel((current) => current === "reactions" ? null : "reactions")} />
              {panel === "reactions" ? <ReactionPicker onSelect={sendReaction} /> : null}
            </div>
            <ControlButton active={panel === "chat"} icon={MessageSquare} label="Chat" onClick={() => setPanel(panel === "chat" ? null : "chat")} />
            <ControlButton active={panel === "participants"} icon={Users} label="People" onClick={() => setPanel(panel === "participants" ? null : "participants")} />
            <ControlButton active={panel === "polls"} icon={Vote} label="Polls" onClick={() => setPanel(panel === "polls" ? null : "polls")} />
            <ControlButton active={panel === "whiteboard"} icon={ClipboardPenLine} label="Whiteboard" onClick={() => setPanel(panel === "whiteboard" ? null : "whiteboard")} />
            <ControlButton active={panel === "waiting"} icon={ShieldCheck} label="Waiting room" onClick={() => setPanel(panel === "waiting" ? null : "waiting")} />
            <ControlButton active={Boolean(recording)} icon={CircleDot} label={recording ? "Stop rec" : "Record"} onClick={toggleRecording} shortcut="R" />
            <ControlButton danger icon={PhoneOff} label="Leave" onClick={leaveRoom} />
            <ControlButton danger icon={PhoneOff} label="End" onClick={endMeeting} />
          </div>
        </footer>
      </div>
      <Modal open={screenPickerOpen} onClose={() => setScreenPickerOpen(false)} title="Choose screen to share">
        <div className="grid gap-3 md:grid-cols-2">
          {screenSources.map((source) => (
            <button key={source.id} className="rounded-2xl border border-brand-800 p-3 text-left" onClick={() => beginScreenShare(source.id, source.name)}>
              <img src={source.thumbnail} alt={source.name} className="h-28 w-full rounded-xl object-cover" />
              <p className="mt-3 text-sm font-medium">{source.name}</p>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}

function InMeetingShell({ meeting, token, panel, setPanel, currentUser, onMeetingClosed }) {
  return (
    <LiveKitRoom token={token} serverUrl={LIVEKIT_URL} connect audio video data-lk-theme="default" className="h-full">
      <MeetingRoomContent meeting={meeting} token={token} panel={panel} setPanel={setPanel} currentUser={currentUser} onMeetingClosed={onMeetingClosed} />
    </LiveKitRoom>
  );
}

export function MeetingRoomPage() {
  const [meeting, setMeeting] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState("chat");
  const [postEnded, setPostEnded] = useState(false);
  const [error, setError] = useState("");
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinForm, setJoinForm] = useState({ displayName: "", email: "", password: "" });
  const user = useAuthStore((state) => state.user);
  const search = useMemo(() => new URLSearchParams(window.location.hash.split("?")[1] || ""), []);
  const meetingId = search.get("meetingId");
  const title = search.get("title");
  const prefilledPassword = search.get("password") || "";

  useEffect(() => {
    const hydrate = async (incoming = null) => {
      const resolvedMeetingId = incoming?.meetingId || meetingId;
      const resolvedPassword = incoming?.password || prefilledPassword;
      if (!resolvedMeetingId) {
        setError("Meeting ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const details = await meetingService.get(resolvedMeetingId);
        setMeeting(details);
        setJoinForm((current) => ({
          ...current,
          displayName: user?.displayName || current.displayName,
          email: user?.email || current.email,
          password: resolvedPassword || current.password
        }));
        setJoinModalOpen(true);
      } catch (_error) {
        setError("Could not load meeting details.");
      } finally {
        setLoading(false);
      }
    };

    hydrate();
    const offMeetingJoin = window.electronAPI.onMeetingJoin(hydrate);
    return () => {
      offMeetingJoin?.();
    };
  }, [meetingId, prefilledPassword, user?.displayName, user?.email]);

  async function joinMeeting() {
    if (!meeting) {
      return;
    }
    setLoading(true);
    try {
      const result = await meetingService.token(meeting.meetingId, {
        guestName: joinForm.displayName || user?.displayName,
        displayName: joinForm.displayName || user?.displayName,
        email: joinForm.email || user?.email,
        password: joinForm.password || undefined
      });
      setToken(result.token);
      setJoinModalOpen(false);
      setError("");
    } catch (joinError) {
      setError(joinError?.response?.data?.message || "Could not join the meeting.");
    } finally {
      setLoading(false);
    }
  }

  function handleMeetingClosed() {
    setPostEnded(true);
    window.setTimeout(() => {
      window.electronAPI.closeMeetingWindow();
    }, 1200);
  }

  if (postEnded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-950 text-brand-text">
        <div className="panel max-w-xl p-10 text-center">
          <h1 className="text-3xl font-semibold">Meeting ended</h1>
          <p className="mt-3 text-sm text-brand-muted">Returning you to the main Onnonn workspace.</p>
        </div>
      </div>
    );
  }

  if (loading && !meeting) {
    return <div className="flex min-h-screen items-center justify-center bg-brand-950 text-brand-muted">Preparing meeting room...</div>;
  }

  if (error && !meeting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-950 px-6 text-brand-text">
        <div className="panel max-w-xl p-8">
          <h1 className="text-2xl font-semibold">{title || "Meeting unavailable"}</h1>
          <p className="mt-3 text-sm text-brand-muted">{error}</p>
          <button className="btn-primary mt-6" onClick={() => window.electronAPI.closeMeetingWindow()}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {token && meeting ? <InMeetingShell meeting={meeting} token={token} panel={panel} setPanel={setPanel} currentUser={user} onMeetingClosed={handleMeetingClosed} /> : null}

      <Modal open={joinModalOpen} onClose={() => window.electronAPI.closeMeetingWindow()} title={`Join ${meeting?.title || title || "meeting"}`}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="join-display-name" className="field-label">Display name</label>
            <input id="join-display-name" className="field" placeholder="Display name" value={joinForm.displayName} onChange={(event) => setJoinForm((current) => ({ ...current, displayName: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <label htmlFor="join-email" className="field-label">Email</label>
            <input id="join-email" className="field" placeholder="Email" value={joinForm.email} onChange={(event) => setJoinForm((current) => ({ ...current, email: event.target.value }))} />
          </div>
          {prefilledPassword ? (
            <div className="rounded-2xl border border-brand-accent/30 bg-brand-accent/10 px-4 py-3 text-sm text-brand-text">
              This invite already includes the meeting password. Enter your display name and join.
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="join-password" className="field-label">Meeting password</label>
              <input id="join-password" className="field" type="password" placeholder="Meeting password (if required)" value={joinForm.password} onChange={(event) => setJoinForm((current) => ({ ...current, password: event.target.value }))} />
            </div>
          )}
          {error ? <p className="text-sm text-brand-error">{error}</p> : null}
          <LoadingButton loading={loading} className="btn-primary w-full" onClick={joinMeeting}>Join meeting</LoadingButton>
        </div>
      </Modal>
    </>
  );
}
