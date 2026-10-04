import { aiService } from '../services/ai.service.js';
import { aiWriter } from '../services/ai-writer.service.js';
import { userService } from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

function ensureAllowed(user) {
  if (user.plan === 'free') throw ApiError.badRequest('AI is a Pro feature — upgrade to use it.');
  if (!user.aiEnabled) throw ApiError.badRequest('Enable the AI writing assistant in Settings first.');
}

export const aiController = {
  // Provider config + this user's AI state (used by Settings + Compose).
  status: asyncHandler(async (req, res) => {
    const user = await userService.getByIdWithSecrets(req.userId);
    const cfg = await aiService.resolve(user);
    const global = await aiService.config();
    return ok(res, {
      configured: cfg.configured,
      provider: cfg.provider,
      source: cfg.source, // 'default' | 'custom'
      model: cfg.model,
      defaultModel: global?.defaultModel || null,
      enabled: !!user.aiEnabled,
      plan: user.plan,
      // custom config (no key)
      useCustom: !!user.aiUseCustom,
      customBaseUrl: user.aiCustomBaseUrl || '',
      customModel: user.aiCustomModel || '',
      customConfigured: Boolean(user.aiCustomApiKey),
    });
  }),

  generate: asyncHandler(async (req, res) => {
    const user = await userService.getByIdWithSecrets(req.userId);
    ensureAllowed(user);
    const { kind = 'email', prompt = '', tone = 'professional' } = req.body;
    if (!String(prompt).trim()) throw ApiError.badRequest('Describe what you want to write.');

    const cfg = await aiService.resolve(user);
    if (!cfg.configured) {
      throw ApiError.badRequest(
        cfg.source === 'custom'
          ? 'Complete your custom AI setup (base URL, model and API key) in Settings.'
          : 'AI is not configured — add a free Groq key (AI_API_KEY) from console.groq.com to the backend .env.'
      );
    }
    const call = (opts) => aiService.chat({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, model: cfg.model, headers: cfg.headers, ...opts });

    if (kind === 'subject') {
      const text = await call({
        maxTokens: 220,
        system: 'You write concise, high-open-rate cold-email subject lines. Return exactly 5 options, one per line, no numbering, no quotes.',
        user: `Email goal: ${prompt}`,
      });
      const subjects = text.split('\n').map((s) => s.replace(/^["'\d.\-)\s]+/, '').trim()).filter(Boolean).slice(0, 5);
      return ok(res, { kind, subjects });
    }

    if (kind === 'improve') {
      const body = await call({
        maxTokens: 700,
        system: `You improve cold emails: clearer, more concise, ${tone} tone. Keep {{firstName}}/{{company}} placeholders. Return only the improved email body as HTML <p> paragraphs (no subject, no wrapper).`,
        user: prompt,
      });
      return ok(res, { kind, body: toHtml(body) });
    }

    // default: full cold email
    const raw = await call({
      maxTokens: 700,
      system:
        `You are an expert cold-email copywriter. Write a short, personalized cold email in a ${tone} tone. ` +
        `Use {{firstName}} and {{company}} placeholders where natural. Under 130 words, one clear call-to-action. ` +
        `Output EXACTLY in this format:\nSubject: <one-line subject>\n\n<email body as HTML <p> paragraphs, no <html> wrapper>`,
      user: prompt,
    });
    const m = raw.match(/^\s*subject\s*:\s*(.+)$/im);
    const subject = m ? m[1].trim() : '';
    const body = toHtml(raw.replace(/^\s*subject\s*:.*$/im, '').trim());
    return ok(res, { kind, subject, body });
  }),

  // ---- Example routes: direct OpenRouter helpers (return { success, data } | { success, error }) ----
  rewrite: asyncHandler(async (req, res) => {
    ensureAllowed(await userService.getById(req.userId));
    return res.json(await aiWriter.rewriteEmail(req.body.email));
  }),
  grammar: asyncHandler(async (req, res) => {
    ensureAllowed(await userService.getById(req.userId));
    return res.json(await aiWriter.fixGrammar(req.body.text));
  }),
  subject: asyncHandler(async (req, res) => {
    ensureAllowed(await userService.getById(req.userId));
    return res.json(await aiWriter.improveSubject(req.body.subject));
  }),
  coldEmail: asyncHandler(async (req, res) => {
    ensureAllowed(await userService.getById(req.userId));
    return res.json(await aiWriter.generateColdEmail(req.body.prompt));
  }),
};

// Ensure the body is HTML paragraphs.
function toHtml(text) {
  const t = String(text || '').trim();
  if (/<p|<div|<br/i.test(t)) return t;
  return t.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}
