import { Application, APPLICATION_STATUSES } from '../models/application.model.js';
import { Job } from '../models/job.model.js';
import { ApiError } from '../utils/ApiError.js';

export const applicationService = {
  statuses() {
    return APPLICATION_STATUSES;
  },

  // Move a job into the tracker (or advance an existing entry).
  async apply(userId, { jobId, status = 'applied', resumeId = '', notes = '' }) {
    const job = await Job.findOne({ id: jobId, userId });
    if (!job) throw ApiError.notFound('Job not found');
    if (!APPLICATION_STATUSES.includes(status)) throw ApiError.badRequest('Invalid application status.');

    const existing = await Application.findOne({ userId, jobId });
    const appliedAt = status === 'applied' ? new Date() : null;

    if (existing) {
      return this.updateStatus(userId, existing.id, status, notes);
    }
    return Application.create({
      userId,
      jobId,
      title: job.title,
      company: job.company,
      status,
      resumeId,
      notes,
      appliedAt,
      timeline: [{ status, note: notes, at: new Date() }],
    });
  },

  // Grouped by status for a Kanban/timeline view, plus a flat list.
  async list(userId, { status } = {}) {
    const filter = { userId };
    if (status && status !== 'all') filter.status = status;
    const items = await Application.find(filter).sort({ updatedAt: -1 }).lean();
    const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, []]));
    for (const a of items) (byStatus[a.status] ||= []).push(a);
    const counts = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, byStatus[s].length]));
    return { items, byStatus, counts, total: items.length };
  },

  async getById(userId, id) {
    const app = await Application.findOne({ id, userId });
    if (!app) throw ApiError.notFound('Application not found');
    return app;
  },

  // Change status → appends a timeline entry; PATCH can also edit notes.
  async updateStatus(userId, id, status, note = '') {
    const app = await this.getById(userId, id);
    if (status && !APPLICATION_STATUSES.includes(status)) throw ApiError.badRequest('Invalid application status.');

    if (status && status !== app.status) {
      app.status = status;
      app.timeline.push({ status, note, at: new Date() });
      if (status === 'applied' && !app.appliedAt) app.appliedAt = new Date();
    }
    if (note !== undefined && note !== '') app.notes = note;
    await app.save();
    return app;
  },

  async patch(userId, id, body = {}) {
    const app = await this.getById(userId, id);
    if (body.status && body.status !== app.status) {
      return this.updateStatus(userId, id, body.status, body.note || '');
    }
    if ('notes' in body) app.notes = body.notes;
    if ('resumeId' in body) app.resumeId = body.resumeId;
    await app.save();
    return app;
  },

  async remove(userId, id) {
    const app = await Application.findOneAndDelete({ id, userId });
    if (!app) throw ApiError.notFound('Application not found');
    return { removed: true };
  },

  // Feeds the Job-Mode dashboard cards.
  async stats(userId) {
    const all = await Application.find({ userId }).select('status appliedAt createdAt').lean();
    const counts = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0]));
    for (const a of all) counts[a.status] = (counts[a.status] || 0) + 1;
    const interviewing = counts.interview + counts.hr_round + counts.technical_round + counts.manager_round + counts.oa;
    const applied = all.filter((a) => a.appliedAt).length;
    const responseRate = applied ? Math.round(((interviewing + counts.offer + counts.rejected) / applied) * 100) : 0;
    return {
      total: all.length,
      applied,
      interviewing,
      offers: counts.offer,
      rejected: counts.rejected,
      responseRate,
      byStatus: counts,
    };
  },
};
