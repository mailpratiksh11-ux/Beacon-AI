import { JobSource } from './job-source.js';
import { RemoteOkSource } from './remoteok.source.js';
import { WeWorkRemotelySource } from './weworkremotely.source.js';

// A disabled connector: the architecture supports it, but it needs official API access
// we don't have (scraping these is prohibited by their terms). Enabling one later means
// implementing ONE fetch() — nothing else in the app changes.
class StubSource extends JobSource {
  constructor(id, name, note) {
    super({ id, name, enabled: false, requiresCredentials: true, note });
  }
  async fetch() {
    throw new Error(`${this.name} requires official API access and is not enabled.`);
  }
}

// Live connectors (permitted public APIs / feeds) + manual paste.
const live = [new RemoteOkSource(), new WeWorkRemotelySource()];

// Prohibited-to-scrape sources ship as disabled stubs.
const stubs = [
  new StubSource('linkedin', 'LinkedIn Jobs', 'Requires official LinkedIn Talent Solutions partner API.'),
  new StubSource('indeed', 'Indeed', 'Requires Indeed Publisher/partner API access.'),
  new StubSource('wellfound', 'Wellfound', 'No public API; scraping is prohibited.'),
  new StubSource('greenhouse', 'Greenhouse', 'Per-company public board API — planned next phase.'),
  new StubSource('lever', 'Lever', 'Per-company public postings API — planned next phase.'),
  new StubSource('ashby', 'Ashby', 'Per-company public job-board API — planned next phase.'),
  new StubSource('ycombinator', 'Y Combinator', 'Needs a sanctioned feed — planned next phase.'),
];

const registry = new Map();
for (const s of [...live, ...stubs]) registry.set(s.id, s);

export const jobSources = {
  /** All connectors' public metadata (for the sources list in the UI). */
  list() {
    return [...registry.values()].map((s) => s.meta());
  },
  /** Just the connectors that can actually fetch right now. */
  enabled() {
    return [...registry.values()].filter((s) => s.enabled);
  },
  get(id) {
    return registry.get(id) || null;
  },
};
