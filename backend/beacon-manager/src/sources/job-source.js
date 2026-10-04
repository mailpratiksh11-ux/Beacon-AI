// ---------------------------------------------------------------------------
// JobSource — the connector interface every job provider implements (spec §19/§20).
//
// A connector's ONLY job is to fetch postings from a *permitted* source and return
// them in the normalized shape below. The service layer handles persistence, dedupe,
// and per-user scoping — connectors never touch the database.
//
// Sources that prohibit scraping (LinkedIn, Indeed, Wellfound) ship as DISABLED stubs:
// enabled=false, requiresCredentials=true, and fetch() throws. The day official API
// credentials exist, only that one connector changes — nothing else in the app.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} NormalizedJob
 * @property {string} title
 * @property {string} company
 * @property {string} [companyLogo]
 * @property {string} [location]
 * @property {string} [salary]
 * @property {number|null} [salaryMin]
 * @property {number|null} [salaryMax]
 * @property {string} [description]
 * @property {string[]} [requiredSkills]
 * @property {string} [applicationUrl]
 * @property {'remote'|'hybrid'|'onsite'|'unknown'} [remoteType]
 * @property {'full-time'|'part-time'|'contract'|'internship'|'unknown'} [employmentType]
 * @property {string[]} [tags]
 * @property {string} externalId  // the source's own id — used for dedupe
 * @property {Date|null} [postedDate]
 */

export class JobSource {
  /**
   * @param {Object} cfg
   * @param {string} cfg.id            stable connector id, e.g. 'remoteok'
   * @param {string} cfg.name          human label, e.g. 'RemoteOK'
   * @param {boolean} cfg.enabled      is it usable right now?
   * @param {boolean} [cfg.requiresCredentials] does it need official API access we don't have?
   * @param {string} [cfg.note]        why it's disabled, shown in the UI
   */
  constructor({ id, name, enabled, requiresCredentials = false, note = '' }) {
    this.id = id;
    this.name = name;
    this.enabled = enabled;
    this.requiresCredentials = requiresCredentials;
    this.note = note;
  }

  /**
   * Fetch and normalize postings for a query.
   * @param {Object} query   { search, location, limit, ... }
   * @returns {Promise<NormalizedJob[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetch(query) {
    throw new Error(`${this.name} connector is not implemented`);
  }

  /** Public metadata for the "sources" list in the UI. */
  meta() {
    return { id: this.id, name: this.name, enabled: this.enabled, requiresCredentials: this.requiresCredentials, note: this.note };
  }
}

// ---- shared normalization helpers used by connectors ----

const REMOTE_HINTS = /\b(remote|anywhere|worldwide|distributed)\b/i;
const HYBRID_HINTS = /\bhybrid\b/i;

export function inferRemoteType(text = '') {
  if (HYBRID_HINTS.test(text)) return 'hybrid';
  if (REMOTE_HINTS.test(text)) return 'remote';
  return 'unknown';
}

// A small, dependency-free skill sniffer. Good enough for filtering + later AI matching.
const SKILL_DICT = [
  'javascript', 'typescript', 'node.js', 'node', 'react', 'angular', 'vue', 'svelte',
  'python', 'django', 'flask', 'java', 'spring', 'go', 'golang', 'rust', 'ruby', 'rails',
  'php', 'laravel', 'c++', 'c#', '.net', 'kotlin', 'swift', 'mongodb', 'postgres',
  'postgresql', 'mysql', 'redis', 'graphql', 'rest', 'aws', 'gcp', 'azure', 'docker',
  'kubernetes', 'terraform', 'ci/cd', 'html', 'css', 'tailwind', 'sass', 'next.js',
  'express', 'nestjs', 'fastapi', 'kafka', 'rabbitmq', 'elasticsearch', 'figma',
];

export function extractSkills(text = '', tags = []) {
  const hay = ` ${String(text).toLowerCase()} ${tags.map((t) => String(t).toLowerCase()).join(' ')} `;
  const found = new Set();
  for (const s of SKILL_DICT) {
    // word-ish boundary that tolerates the dots/pluses in tech names
    const re = new RegExp(`(^|[^a-z0-9])${s.replace(/[.+#]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    if (re.test(hay)) found.add(s);
  }
  return [...found];
}

export function stripHtml(html = '') {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
