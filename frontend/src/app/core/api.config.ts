/**
 * Base URL for the Beacon AI backend API.
 *
 * - Local dev (localhost) → the local backend on :5050
 * - Deployed              → same origin, served behind Caddy at /api
 *
 * Deliberately relative in production. The API and the app share one hostname,
 * which means CORS never applies and, more usefully here, changing domain needs
 * no rebuild — there is no host baked into the bundle.
 */
const isLocal =
  typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

export const API_BASE_URL = isLocal ? 'http://localhost:5050/api' : '/api';

/**
 * Where Socket.IO connects. Derived separately rather than by stripping "/api"
 * off the base: with a relative base that leaves an empty string, and
 * socket.io-client turns '' into a broken "https://" host rather than falling
 * back to the current origin.
 */
export const SOCKET_URL = isLocal
  ? 'http://localhost:5050'
  : (typeof location !== 'undefined' ? location.origin : '');
