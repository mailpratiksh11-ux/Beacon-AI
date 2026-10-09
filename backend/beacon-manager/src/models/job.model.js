import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

// A job posting imported from a connector (RemoteOK, WeWorkRemotely, manual paste, …).
// Scoped per user so one user's imported pool never leaks into another's.
const jobSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    // Scope for every read. userId below is attribution — who created it.
    // Not required yet: backfill-orgs.js has to tag existing rows before a
    // missing orgId can be treated as a fault. Tighten once that has run.
    orgId: { type: String, ref: 'Organization', default: '', index: true },
    userId: { type: String, ref: 'User', required: true, index: true },

    title: { type: String, required: true, trim: true, index: true },
    company: { type: String, trim: true, default: '', index: true },
    companyLogo: { type: String, default: '' },
    location: { type: String, trim: true, default: '' },

    // Free-text salary as shown by the source, plus parsed numbers when available.
    salary: { type: String, default: '' },
    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    salaryCurrency: { type: String, default: 'USD' },

    description: { type: String, default: '' },
    requiredSkills: { type: [String], default: [], index: true },
    applicationUrl: { type: String, default: '' },

    remoteType: { type: String, enum: ['remote', 'hybrid', 'onsite', 'unknown'], default: 'unknown', index: true },
    experienceLevel: { type: String, enum: ['intern', 'entry', 'mid', 'senior', 'lead', 'unknown'], default: 'unknown', index: true },
    employmentType: { type: String, enum: ['full-time', 'part-time', 'contract', 'internship', 'unknown'], default: 'unknown', index: true },
    visaSponsorship: { type: Boolean, default: false, index: true },
    easyApply: { type: Boolean, default: false, index: true },
    tags: { type: [String], default: [] },

    source: { type: String, required: true, index: true }, // connector id, e.g. 'remoteok'
    externalId: { type: String, default: '' }, // source's own id, for dedupe
    postedDate: { type: Date, default: null, index: true },
  },
  { timestamps: true, id: false, toJSON: { virtuals: true } }
);

// Dedupe the same posting per user+source.
jobSchema.index({ userId: 1, source: 1, externalId: 1 }, { unique: true, partialFilterExpression: { externalId: { $type: 'string' } } });
// Text search across the most relevant fields.
jobSchema.index({ title: 'text', company: 'text', description: 'text' });

export const Job = mongoose.model('Job', jobSchema);
