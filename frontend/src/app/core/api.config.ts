/**
 * Where the frontend finds the backend.
 *
 * Beacon runs in two topologies, and the difference matters:
 *
 *   Render     — frontend (static site) and backend (web service) are on
 *                DIFFERENT hosts, so the API needs an absolute URL.
 *   Hostinger  — one hostname, Caddy routing /api to the API, so a relative
 *                path works and CORS never applies.
 *
 * A single relative '/api' breaks Render completely: the request goes to the
 * static site, the SPA rewrite returns index.html, and every call silently
 * fails. So the host is mapped explicitly, and same-origin is the fallback
 * rather than the rule.
 *
 * Longer term this belongs in runtime config (a meta tag in index.html that the
 * deploy rewrites) so one build can serve any host without this table.
 */

/** Frontend host -> absolute API base. Add an entry per split-host deployment. */
const SPLIT_HOST_API: Record<string, string> = {
  'beacon-web-epyi.onrender.com': 'https://beacon-ai-urfq.onrender.com',
};

const host = typeof location !== 'undefined' ? location.hostname : '';
const isLocal = /^(localhost|127\.0\.0\.1)$/.test(host);

/** Origin of the API — no trailing slash, no /api suffix. */
const API_ORIGIN = isLocal
  ? 'http://localhost:5050'
  : (SPLIT_HOST_API[host] ?? ''); // '' = same origin (Caddy setup)

export const API_BASE_URL = `${API_ORIGIN}/api`;

/**
 * Where Socket.IO connects. Derived from API_ORIGIN rather than by stripping
 * '/api' off the base: same-origin leaves an empty string, and socket.io-client
 * turns '' into a broken "https://" host instead of using the current origin.
 */
export const SOCKET_URL = API_ORIGIN || (typeof location !== 'undefined' ? location.origin : '');
