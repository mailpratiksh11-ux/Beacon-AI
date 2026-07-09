import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { decryptSecret } from '../utils/crypto.js';

const TIMEOUT_MS = 30_000;

// OpenAI-compatible AI. Default provider = OpenRouter (env key, free Qwen3-32B).
// Users can override with their own OpenAI-compatible provider (custom, per-user).
export const aiService = {
  // Global default provider info (for Settings/status display).
  async config() {
    return {
      provider: 'Groq',
      baseUrl: env.aiBaseUrl,
      defaultModel: env.aiModel,
      configured: Boolean(env.aiApiKey),
    };
  },

  // Effective config for a user: their own provider (if set) or the default.
  // `user` must be loaded with secrets (+aiCustomApiKey).
  async resolve(user) {
    if (user?.aiUseCustom) {
      return {
        source: 'custom',
        provider: 'Custom',
        baseUrl: user.aiCustomBaseUrl || '',
        apiKey: decryptSecret(user.aiCustomApiKey) || '',
        model: user.aiCustomModel || '',
        headers: {},
        configured: Boolean(user.aiCustomBaseUrl && user.aiCustomModel && user.aiCustomApiKey),
      };
    }
    return {
      source: 'default',
      provider: 'Groq',
      baseUrl: env.aiBaseUrl,
      apiKey: env.aiApiKey,
      model: env.aiModel,
      defaultModel: env.aiModel,
      headers: {},
      configured: Boolean(env.aiApiKey),
    };
  },

  // Low-level chat with 30s timeout + one retry on temporary failures.
  async chat({ system, user, model, baseUrl, apiKey, headers = {}, temperature = 0.5, maxTokens = 1000 }) {
    if (!baseUrl || !apiKey) throw ApiError.badRequest('AI is not configured');
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const payload = {
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [system ? { role: 'system', content: system } : null, { role: 'user', content: user }].filter(Boolean),
    };
    // Groq reasoning models (Qwen3/DeepSeek): keep the <think> reasoning out of the content.
    if (/groq\.com/i.test(baseUrl)) payload.reasoning_format = 'hidden';

    const attempt = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...headers },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          let retryAfterMs = 1200;
          const ra = res.headers.get('retry-after');
          if (ra) retryAfterMs = Math.max(retryAfterMs, parseFloat(ra) * 1000 || 0);
          try { const s = JSON.parse(t)?.error?.metadata?.retry_after_seconds; if (s) retryAfterMs = Math.max(600, s * 1000); } catch { /* not json */ }
          return { retryable: res.status === 429 || res.status >= 500, error: mapError(res.status, t), retryAfterMs };
        }
        const data = await res.json();
        let text = data?.choices?.[0]?.message?.content || '';
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        if (!text) return { retryable: true, error: 'Empty response from the model.' };
        return { ok: true, text };
      } catch (e) {
        return { retryable: true, error: e?.name === 'AbortError' ? 'Request timed out.' : 'Network error contacting the AI provider.' };
      } finally {
        clearTimeout(timer);
      }
    };

    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    let r = await attempt();
    let tries = 0;
    while (!r.ok && r.retryable && tries < 2) {
      await sleep(Math.min(r.retryAfterMs || 1200, 4000));
      r = await attempt();
      tries++;
    }
    if (!r.ok) throw ApiError.badRequest(r.error || 'AI request failed');
    return r.text;
  },
};

function mapError(status, text) {
  if (status === 401 || status === 403) return 'Invalid or unauthorized API key.';
  if (status === 429) return 'Rate limit reached — try again shortly.';
  if (status === 404) return 'The selected model is unavailable.';
  if (status === 402) return 'AI credits/quota exhausted for this key.';
  if (status >= 500) return 'The AI provider is temporarily unavailable.';
  return `AI request failed (${status})${text ? `: ${String(text).slice(0, 160)}` : ''}`;
}
