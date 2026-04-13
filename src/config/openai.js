const OpenAI = require("openai");
const env = require("./env");

const openai = env.openAiApiKey ? new OpenAI({ apiKey: env.openAiApiKey }) : null;

module.exports = { openai };
