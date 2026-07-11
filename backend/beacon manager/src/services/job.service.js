// Job-search business logic (Job Mode).
// Owns syncing postings from connectors into the user's pool, filtered/paginated
// search, saved-job state, and manual paste import. Persistence + dedupe live here;
// connectors only fetch. Framework-agnostic — no req/res.
import { Job } from '../models/job.model.js';
import { SavedJob } from '../models/saved-job.model.js';
import { jobSources } from '../sources/index.js';
import { extractSkills, stripHtml } from '../sources/job-source.js';
import { ApiError } from '../utils/ApiError.js';

// How far back "date posted" filters look, in days.
const DATE_WINDOWS = { '24h': 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30 };

export const jobService = {
  // ---- connectors ----
  sources() {
    return jobSources.list();
  },

  // Pull fresh postings from the enabled connectors and upsert them into this user's pool.
  async sync(userId, { source, search = '', limit = 50 } = {}) {
    const connectors = source ? [jobSources.get(source)].filter(Boolean) : jobSources.enabled();
    if (!connectors.length) throw ApiError.badRequest('No enabled job source matches that request.');

    let imported = 0;
    const errors = [];
    for (const c of connectors) {
      if (!c.enabled) { errors.push({ source: c.id, error: c.note || 'disabled' }); continue; }
      try {
        const jobs = await c.fetch({ search, limit });
        for (const j of jobs) {
          await this._upsert(userId, c.id, j);
          imported++;
        }
      } catch (e) {
        errors.push({ source: c.id, error: e?.message || 'fetch failed' });
      }
    }
    return { imported, sources: connectors.map((c) => c.id), errors };
  },

  // Create a job from a pasted description / URL (works for any source we can't pull).
  async importManual(userId, { title, company = '', location = '', description = '', applicationUrl = '', salary = '' }) {
    const t = String(title || '').trim();
    if (!t) throw ApiError.badRequest('A job title is required.');
    const desc = stripHtml(description);
    return this._upsert(userId, 'manual', {
      title: t,
      company: String(company).trim(),
      location: String(location).trim(),
      description: desc,
      requiredSkills: extractSkills(desc),
      applicationUrl: String(applicationUrl).trim(),
      salary: String(salary).trim(),
      remoteType: 'unknown',
      easyApply: false,
      externalId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      postedDate: new Date(),
    });
  },

  async _upsert(userId, source, j) {
    const doc = {
      userId,
      source,
      title: j.title,
      company: j.company || '',
      companyLogo: j.companyLogo || '',
      location: j.location || '',
      salary: j.salary || '',
      salaryMin: j.salaryMin ?? null,
      salaryMax: j.salaryMax ?? null,
      description: j.description || '',
      requiredSkills: j.requiredSkills || [],
      applicationUrl: j.applicationUrl || '',
      remoteType: j.remoteType || 'unknown',
      employmentType: j.employmentType || 'unknown',
      visaSponsorship: !!j.visaSponsorship,
      easyApply: !!j.easyApply,
      tags: j.tags || [],
      externalId: j.externalId || '',
      postedDate: j.postedDate || null,
    };
    return Job.findOneAndUpdate(
      { userId, source, externalId: doc.externalId },
      { $set: doc },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  },

  // ---- search (all filters applied server-side, paginated) ----
  async search(userId, q = {}) {
    const page = Math.max(1, parseInt(q.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(q.limit || '20', 10)));
    const filter = { userId };

    if (q.title) filter.title = { $regex: escapeRe(q.title), $options: 'i' };
    if (q.company) filter.company = { $regex: escapeRe(q.company), $options: 'i' };
    if (q.location) filter.location = { $regex: escapeRe(q.location), $options: 'i' };
    if (q.remoteType && q.remoteType !== 'all') filter.remoteType = q.remoteType;
    if (q.experienceLevel && q.experienceLevel !== 'all') filter.experienceLevel = q.experienceLevel;
    if (q.employmentType && q.employmentType !== 'all') filter.employmentType = q.employmentType;
    if (q.source && q.source !== 'all') filter.source = q.source;
    if (q.visaSponsorship === 'true') filter.visaSponsorship = true;
    if (q.easyApply === 'true') filter.easyApply = true;
    if (q.salaryMin) filter.salaryMax = { $gte: parseInt(q.salaryMin, 10) };

    // skills=comma,separated → must contain all
    const skills = String(q.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (skills.length) filter.requiredSkills = { $all: skills.map((s) => new RegExp(`^${escapeRe(s)}$`, 'i')) };

    // free-text search box (title/company/description)
    if (q.search) {
      const rx = { $regex: escapeRe(q.search), $options: 'i' };
      filter.$or = [{ title: rx }, { company: rx }, { description: rx }];
    }

    if (q.datePosted && DATE_WINDOWS[q.datePosted]) {
      const since = new Date(Date.now() - DATE_WINDOWS[q.datePosted] * 86400000);
      filter.postedDate = { $gte: since };
    }

    const sort = q.sort === 'salary' ? { salaryMax: -1 } : { postedDate: -1, createdAt: -1 };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Job.find(filter).sort(sort).skip(skip).limit(limit),
      Job.countDocuments(filter),
    ]);

    // annotate whether each job is already saved by this user
    const savedIds = new Set(
      (await SavedJob.find({ userId, jobId: { $in: items.map((i) => i.id) } }).select('jobId favorite').lean())
        .map((s) => s.jobId)
    );
    const withState = items.map((i) => ({ ...i.toJSON(), saved: savedIds.has(i.id) }));
    return { items: withState, total, page, limit };
  },

  async getById(userId, id) {
    const job = await Job.findOne({ id, userId });
    if (!job) throw ApiError.notFound('Job not found');
    return job;
  },

  // ---- saved jobs ----
  async save(userId, jobId, patch = {}) {
    await this.getById(userId, jobId); // ensures ownership
    const allowed = {};
    for (const k of ['favorite', 'archived', 'priority', 'notes']) if (k in patch) allowed[k] = patch[k];
    return SavedJob.findOneAndUpdate(
      { userId, jobId },
      { $set: allowed, $setOnInsert: { userId, jobId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  },

  async unsave(userId, jobId) {
    await SavedJob.findOneAndDelete({ userId, jobId });
    return { removed: true };
  },

  async listSaved(userId, { favorite, archived = 'false' } = {}) {
    const filter = { userId };
    if (favorite === 'true') filter.favorite = true;
    filter.archived = archived === 'true';
    const saved = await SavedJob.find(filter).sort({ updatedAt: -1 }).lean();
    const jobs = await Job.find({ userId, id: { $in: saved.map((s) => s.jobId) } }).lean();
    const byId = new Map(jobs.map((j) => [j.id, j]));
    return saved.map((s) => ({ ...s, job: byId.get(s.jobId) || null })).filter((s) => s.job);
  },
};

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
