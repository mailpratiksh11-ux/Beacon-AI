import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

// A user's relationship to a job they've saved: favorite / archive / priority / notes.
// Kept separate from Job so the same posting can be saved by many users independently.
const savedJobSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    // Scope for every read. userId below is attribution — who created it.
    // Not required yet: backfill-orgs.js has to tag existing rows before a
    // missing orgId can be treated as a fault. Tighten once that has run.
    orgId: { type: String, ref: 'Organization', default: '', index: true },
    userId: { type: String, ref: 'User', required: true, index: true },
    jobId: { type: String, ref: 'Job', required: true, index: true },

    favorite: { type: Boolean, default: false, index: true },
    archived: { type: Boolean, default: false, index: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium', index: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true, id: false, toJSON: { virtuals: true } }
);

// A user can only save a given job once.
savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export const SavedJob = mongoose.model('SavedJob', savedJobSchema);
