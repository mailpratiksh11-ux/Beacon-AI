import { JobSource, inferRemoteType, extractSkills, stripHtml } from './job-source.js';

const API = 'https://remoteok.com/api';
const TIMEOUT_MS = 15_000;

// RemoteOK exposes a public JSON API of remote jobs. The first array element is a
// legal/attribution notice (not a job) and is skipped. A descriptive User-Agent is
// required by their terms.
export class RemoteOkSource extends JobSource {
  constructor() {
    super({ id: 'remoteok', name: 'RemoteOK', enabled: true });
  }

  async fetch({ search = '', limit = 50 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let rows;
    try {
      const res = await fetch(API, {
        signal: controller.signal,
        headers: { 'User-Agent': 'BeaconAI-JobMode/1.0 (+https://beacon-ai.app)', Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`RemoteOK responded ${res.status}`);
      rows = await res.json();
    } finally {
      clearTimeout(timer);
    }
    if (!Array.isArray(rows)) return [];

    const term = search.trim().toLowerCase();
    const out = [];
    for (const r of rows) {
      if (!r || !r.position || !r.id) continue; // skips the legal-notice element too
      const tags = Array.isArray(r.tags) ? r.tags : [];
      const desc = stripHtml(r.description || '');
      const blob = `${r.position} ${r.company} ${tags.join(' ')} ${desc}`.toLowerCase();
      if (term && !blob.includes(term)) continue;

      out.push({
        title: r.position,
        company: r.company || '',
        companyLogo: r.company_logo || r.logo || '',
        location: r.location || 'Remote',
        salary: r.salary_min && r.salary_max ? `$${r.salary_min.toLocaleString()}–$${r.salary_max.toLocaleString()}` : '',
        salaryMin: r.salary_min || null,
        salaryMax: r.salary_max || null,
        description: desc,
        requiredSkills: extractSkills(desc, tags),
        applicationUrl: r.apply_url || r.url || '',
        remoteType: 'remote',
        employmentType: 'full-time',
        tags,
        externalId: String(r.id),
        postedDate: r.date ? new Date(r.date) : null,
        _remoteHint: inferRemoteType(r.location || ''),
      });
      if (out.length >= limit) break;
    }
    return out;
  }
}
