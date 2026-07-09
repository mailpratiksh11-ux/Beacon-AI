import mongoose from 'mongoose';

// Global AI provider configuration — a single "default" document in the `ai_integration`
// collection (seeded by src/seed-ai.js). Fetched at runtime instead of using env vars.
const aiIntegrationSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true }, // singleton key
    provider: { type: String, default: 'Groq' },
    baseUrl: { type: String, default: 'https://api.groq.com/openai/v1' }, // OpenAI-compatible
    apiKey: { type: String, default: '' },
    defaultModel: { type: String, default: 'qwen/qwen3-32b' },
    // Models offered in the Settings dropdown
    models: [{ id: String, label: String, _id: false }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'ai_integration' }
);

export const AiIntegration = mongoose.model('AiIntegration', aiIntegrationSchema);
