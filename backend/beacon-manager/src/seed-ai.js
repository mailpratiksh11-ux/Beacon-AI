import { connectDB, disconnectDB } from './config/db.js';
import { AiIntegration } from './models/ai-integration.model.js';

// Seed the default AI integration config into the `ai_integration` collection.
// Default provider: Groq (free) with Qwen3-32B. Set the API key with:
//   AI_API_KEY=gsk_xxx node src/seed-ai.js
// (or update the doc later from Settings / a script). Free key: https://console.groq.com
const DEFAULT = {
  key: 'default',
  provider: 'Groq',
  baseUrl: 'https://api.groq.com/openai/v1',
  apiKey: process.env.AI_API_KEY || '',
  defaultModel: 'qwen/qwen3-32b',
  models: [
    { id: 'qwen/qwen3-32b', label: 'Qwen3 32B (default · free)' },
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fast)' },
    { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
  ],
  active: true,
};

async function run() {
  await connectDB();
  const existing = await AiIntegration.findOne({ key: 'default' });
  if (existing) {
    // Preserve an already-set API key unless a new one is provided.
    const apiKey = process.env.AI_API_KEY || existing.apiKey || '';
    await AiIntegration.updateOne(
      { key: 'default' },
      { $set: { provider: DEFAULT.provider, baseUrl: DEFAULT.baseUrl, defaultModel: DEFAULT.defaultModel, models: DEFAULT.models, apiKey, active: true } }
    );
    console.log(`✔ Updated ai_integration (apiKey ${apiKey ? 'set' : 'still empty'})`);
  } else {
    await AiIntegration.create(DEFAULT);
    console.log(`✔ Seeded ai_integration with default model ${DEFAULT.defaultModel} (apiKey ${DEFAULT.apiKey ? 'set' : 'empty'})`);
  }
  await disconnectDB();
  process.exit(0);
}

run().catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
