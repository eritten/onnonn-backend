const { openai } = require("../config/openai");
const env = require("../config/env");
const { AIServiceError } = require("../utils/errors");

async function chatJson({ system, user, jsonSchemaHint }) {
  if (!openai) {
    return {};
  }
  try {
    const response = await openai.chat.completions.create({
      model: env.openAiModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${user}\n\nReturn JSON matching: ${jsonSchemaHint}` }
      ]
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    throw new AIServiceError("OpenAI chat request failed", { message: error.message });
  }
}

async function moderation(input) {
  if (!openai) {
    return { flagged: false };
  }
  try {
    const response = await openai.moderations.create({ model: "omni-moderation-latest", input });
    return response.results[0];
  } catch (error) {
    throw new AIServiceError("OpenAI moderation failed", { message: error.message });
  }
}

async function createEmbedding(input) {
  if (!openai) {
    return Array.from({ length: 8 }, () => 0);
  }
  const response = await openai.embeddings.create({ model: "text-embedding-3-small", input });
  return response.data[0].embedding;
}

module.exports = { chatJson, moderation, createEmbedding };
