/**
 * Base URL for the Beacon AI backend API.
 * - Local dev (localhost) → local backend on :5050
 * - Deployed             → the Render backend
 * The Socket.IO URL is derived from this (with the trailing /api stripped).
 */
const isLocal =
  typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

export const API_BASE_URL = isLocal
  ? 'http://localhost:5050/api'
  : 'https://beacon-ai-urfq.onrender.com/api';
