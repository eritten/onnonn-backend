const {
  AITranscription,
  AISummary,
  AIActionItem,
  AIMeetingCoach,
  AISentiment,
  AIEmbedding,
  Meeting,
  MeetingNote,
  Subscription
} = require("../models");
const mongoose = require("mongoose");
const { chatJson, createEmbedding } = require("./openaiService");
const { openai } = require("../config/openai");
const { getRedis } = require("../config/redis");
const { NotFoundError, PlanLimitError, AIServiceError } = require("../utils/errors");

async function resolveMeetingId(meetingIdentifier) {
  if (!meetingIdentifier) {
    throw new NotFoundError("Meeting not found");
  }

  if (mongoose.isValidObjectId(meetingIdentifier)) {
    const byId = await Meeting.findById(meetingIdentifier).select("_id");
    if (byId) {
      return byId._id;
    }
  }

  const byPublicId = await Meeting.findOne({ meetingId: meetingIdentifier }).select("_id");
  if (!byPublicId) {
    throw new NotFoundError("Meeting not found");
  }

  return byPublicId._id;
}

async function generateTranscription(recording) {
  if (!recording?.fileUrl) {
    throw new NotFoundError("Recording file is unavailable for transcription");
  }
  let segments = [{ startTime: 0, endTime: 5, speakerLabel: "Speaker 1", text: "Transcription unavailable.", confidence: 0.1 }];
  let fullText = segments[0].text;
  let language = "en";
  if (openai) {
    const response = await fetch(recording.fileUrl);
    if (!response.ok) {
      throw new AIServiceError("Unable to download recording for transcription");
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const file = new File([bytes], "recording.mp4", { type: "video/mp4" });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
      response_format: "verbose_json"
    });
    segments = (transcription.segments || []).map((segment) => ({
      startTime: segment.start,
      endTime: segment.end,
      speakerLabel: "Speaker 1",
      text: segment.text,
      confidence: segment.avg_logprob || 0.9
    }));
    fullText = transcription.text || segments.map((segment) => segment.text).join(" ");
    language = transcription.language || "en";
  }
  return AITranscription.findOneAndUpdate(
    { meeting: recording.meeting },
    {
      recording: recording._id,
      segments,
      fullText,
      language,
      status: "completed"
    },
    { upsert: true, new: true }
  );
}

async function generateSummary(meetingId) {
  const resolvedMeetingId = await resolveMeetingId(meetingId);
  const transcription = await AITranscription.findOne({ meeting: resolvedMeetingId });
  if (!transcription) {
    throw new NotFoundError("Transcription not found");
  }
  const summary = await chatJson({
    system: "You are an assistant that summarizes meetings into structured JSON.",
    user: transcription.fullText,
    jsonSchemaHint: "{overview:string,keyPoints:string[],decisions:string[],actionItems:{assigneeName:string,task:string,deadline:string}[],nextSteps:string[],smartNotes:string[]}"
  });
  const record = await AISummary.findOneAndUpdate(
    { meeting: resolvedMeetingId },
    {
      overview: summary.overview || "Summary unavailable",
      keyPoints: summary.keyPoints || [],
      decisions: summary.decisions || [],
      actionItems: summary.actionItems || [],
      nextSteps: summary.nextSteps || [],
      smartNotes: summary.smartNotes || [],
      status: "completed"
    },
    { upsert: true, new: true }
  );
  await AIActionItem.deleteMany({ meeting: resolvedMeetingId });
  if (record.actionItems.length) {
    const actionItems = await AIActionItem.insertMany(record.actionItems.map((item) => ({
      meeting: resolvedMeetingId,
      assigneeName: item.assigneeName,
      task: item.task,
      deadline: item.deadline ? new Date(item.deadline) : undefined
    })));
    const { getQueue } = require("../jobs");
    const reminderQueue = getQueue("reminder");
    if (reminderQueue) {
      for (const actionItem of actionItems) {
        if (actionItem.deadline) {
          const sendAt = new Date(new Date(actionItem.deadline).getTime() - (24 * 60 * 60 * 1000));
          if (sendAt > new Date()) {
            await reminderQueue.add({
              to: actionItem.assigneeName,
              subject: `Action item reminder: ${actionItem.task}`,
              html: `<p>Reminder: ${actionItem.task} is due on ${actionItem.deadline.toISOString()}</p>`
            }, { delay: sendAt.getTime() - Date.now() });
          }
        }
      }
    }
  }
  await generateEmbedding(resolvedMeetingId, record);
  return record;
}

async function generateSentiment(meetingId) {
  const resolvedMeetingId = await resolveMeetingId(meetingId);
  const transcription = await AITranscription.findOne({ meeting: resolvedMeetingId });
  const result = await chatJson({
    system: "Analyze meeting transcript sentiment and return structured JSON.",
    user: transcription?.fullText || "",
    jsonSchemaHint: "{overallSentiment:string,overallScore:number,segments:[],timeline:[]}"
  });
  return AISentiment.findOneAndUpdate({ meeting: resolvedMeetingId }, result, { upsert: true, new: true });
}

async function generateCoachingReport(meetingId) {
  const resolvedMeetingId = await resolveMeetingId(meetingId);
  const transcription = await AITranscription.findOne({ meeting: resolvedMeetingId });
  const result = await chatJson({
    system: "Generate a meeting coach report in JSON.",
    user: transcription?.fullText || "",
    jsonSchemaHint: "{speakingTimeBalance:object,interruptionCount:number,offTopicMoments:[],concisenessFeedback:string,positiveMoments:string[],overallScore:number,summary:string}"
  });
  return AIMeetingCoach.findOneAndUpdate({ meeting: resolvedMeetingId }, result, { upsert: true, new: true });
}

async function generateEmbedding(meetingId, summaryRecord) {
  const sourceText = [summaryRecord.overview, ...(summaryRecord.keyPoints || [])].join("\n");
  const embeddingVector = await createEmbedding(sourceText);
  return AIEmbedding.findOneAndUpdate({ meeting: meetingId }, { sourceText, embeddingVector }, { upsert: true, new: true });
}

async function translateTranscription(meetingId, userId, targetLanguage) {
  const resolvedMeetingId = await resolveMeetingId(meetingId);
  const transcription = await AITranscription.findOne({ meeting: resolvedMeetingId });
  if (!transcription) {
    throw new NotFoundError("Transcription not found");
  }
  const subscription = await Subscription.findOne({ user: userId }).populate("plan");
  if (subscription.aiTranslationCount >= 5) {
    throw new PlanLimitError("Translation limit reached for this billing period");
  }
  const result = await chatJson({
    system: `Translate meeting transcripts into ${targetLanguage}.`,
    user: transcription.fullText,
    jsonSchemaHint: "{translatedText:string}"
  });
  transcription.translations[targetLanguage] = result.translatedText || "";
  await transcription.save();
  subscription.aiTranslationCount += 1;
  await subscription.save();
  return transcription.translations[targetLanguage];
}

async function aiAssistant(meetingId, question) {
  const resolvedMeetingId = await resolveMeetingId(meetingId);
  const [transcriptBuffer, notes] = await Promise.all([
    getRedis().lrange(`meeting-transcript-buffer:${resolvedMeetingId}`, 0, -1),
    MeetingNote.find({ meeting: resolvedMeetingId })
  ]);
  return chatJson({
    system: "Answer questions about an in-progress meeting from transcript, notes, and shared context.",
    user: JSON.stringify({ question, transcriptBuffer, notes }),
    jsonSchemaHint: "{answer:string}"
  });
}

async function generateAgenda(meetingId, payload) {
  const resolvedMeetingId = await resolveMeetingId(meetingId);
  const result = await chatJson({
    system: "Create a structured meeting agenda with timed sections in JSON.",
    user: JSON.stringify(payload),
    jsonSchemaHint: "{sections:[{title:string,durationMinutes:number,discussionPoints:string[]}]}"
  });
  await Meeting.findByIdAndUpdate(resolvedMeetingId, { agenda: result });
  return result;
}

async function getAgenda(meetingId) {
  const resolvedMeetingId = await resolveMeetingId(meetingId);
  const meeting = await Meeting.findById(resolvedMeetingId);
  if (!meeting) {
    throw new NotFoundError("Meeting not found");
  }
  return meeting.agenda;
}

async function updateAgenda(meetingId, agenda) {
  const resolvedMeetingId = await resolveMeetingId(meetingId);
  const meeting = await Meeting.findByIdAndUpdate(resolvedMeetingId, { agenda }, { new: true });
  return meeting.agenda;
}

async function suggestMeetingTitle(payload) {
  return chatJson({
    system: "Suggest three meeting titles and one description.",
    user: JSON.stringify(payload),
    jsonSchemaHint: "{titles:string[],description:string}"
  });
}

async function generateFollowUpEmail(meetingId) {
  const resolvedMeetingId = await resolveMeetingId(meetingId);
  const [summary, meeting] = await Promise.all([AISummary.findOne({ meeting: resolvedMeetingId }), Meeting.findById(resolvedMeetingId)]);
  const result = await chatJson({
    system: "Generate a professional follow-up email for a meeting.",
    user: JSON.stringify({ summary, meeting }),
    jsonSchemaHint: "{email:string}"
  });
  meeting.followUpEmailDraft = result.email || "";
  await meeting.save();
  return meeting.followUpEmailDraft;
}

async function semanticSearch(query) {
  const queryEmbedding = await createEmbedding(query);
  const embeddings = await AIEmbedding.find();
  return embeddings.map((embedding) => ({
    meeting: embedding.meeting,
    score: cosineSimilarity(queryEmbedding, embedding.embeddingVector || []),
    excerpt: embedding.sourceText?.slice(0, 240) || ""
  })).sort((a, b) => b.score - a.score).slice(0, 10);
}

function cosineSimilarity(a, b) {
  if (!a.length || !b.length) {
    return 0;
  }
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    dot += a[index] * b[index];
    aNorm += a[index] ** 2;
    bNorm += b[index] ** 2;
  }
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm) || 1);
}

async function storeRealtimeCaption(meetingId, caption) {
  const resolvedMeetingId = await resolveMeetingId(meetingId);
  let text = caption.text;
  if (!text && caption.audioBase64 && openai) {
    const bytes = Buffer.from(caption.audioBase64, "base64");
    const file = new File([bytes], "chunk.wav", { type: "audio/wav" });
    const transcription = await openai.audio.transcriptions.create({ file, model: "gpt-4o-mini-transcribe" });
    text = transcription.text;
  }
  const payload = { ...caption, text, createdAt: Date.now() };
  await getRedis().rpush(`meeting-transcript-buffer:${resolvedMeetingId}`, JSON.stringify(payload));
  return payload;
}

module.exports = {
  resolveMeetingId,
  generateTranscription,
  generateSummary,
  generateSentiment,
  generateCoachingReport,
  translateTranscription,
  aiAssistant,
  generateAgenda,
  getAgenda,
  updateAgenda,
  suggestMeetingTitle,
  generateFollowUpEmail,
  semanticSearch,
  storeRealtimeCaption
};
