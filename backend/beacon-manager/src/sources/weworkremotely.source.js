import { JobSource, extractSkills, stripHtml } from './job-source.js';

const TIMEOUT_MS = 15_000;
// WeWorkRemotely publishes public RSS feeds per category — a permitted, official feed.
const FEEDS = [
  'https://weworkremotely.com/categories/remote-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
];

// Minimal, dependency-free RSS reader — pulls <item> blocks and their fields.
function parseItems(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) items.push(m[1]);
  return items;
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

export class WeWorkRemotelySource extends JobSource {
  constructor() {
    super({ id: 'weworkremotely', name: 'WeWorkRemotely', enabled: true });
  }

  async fetch({ search = '', limit = 50 } = {}) {
    const term = search.trim().toLowerCase();
    const out = [];

    for (const url of FEEDS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let xml = '';
      try {
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'BeaconAI-JobMode/1.0', Accept: 'application/rss+xml' } });
        if (res.ok) xml = await res.text();
      } catch {
        /* one feed failing shouldn't sink the rest */
      } finally {
        clearTimeout(timer);
      }
      if (!xml) continue;

      for (const block of parseItems(xml)) {
        // WWR titles look like "Company Name: Job Title"
        const rawTitle = tag(block, 'title');
        const [company, ...rest] = rawTitle.split(':');
        const title = (rest.join(':') || rawTitle).trim();
        const link = tag(block, 'link');
        const desc = stripHtml(tag(block, 'description'));
        const region = tag(block, 'region') || 'Remote';
        const blob = `${rawTitle} ${desc}`.toLowerCase();
        if (term && !blob.includes(term)) continue;

        // externalId from the WWR listing slug
        const externalId = (link.match(/listings\/([^/]+)/) || [])[1] || link;

        out.push({
          title,
          company: (company || '').trim(),
          location: region,
          description: desc,
          requiredSkills: extractSkills(desc),
          applicationUrl: link,
          remoteType: 'remote',
          employmentType: 'full-time',
          externalId,
          postedDate: tag(block, 'pubDate') ? new Date(tag(block, 'pubDate')) : null,
        });
        if (out.length >= limit) return out;
      }
    }
    return out;
  }
}
