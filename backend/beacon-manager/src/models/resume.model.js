import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

// Stored in its own dedicated "resumes" collection — no existing collection is reused.
const resumeSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    // Scope for every read. userId below is attribution — who created it.
    // Not required yet: backfill-orgs.js has to tag existing rows before a
    // missing orgId can be treated as a fault. Tighten once that has run.
    orgId: { type: String, ref: 'Organization', default: '', index: true },
    userId: { type: String, ref: 'User', required: true, index: true },
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    // Raw file bytes. select:false so list/read queries don't pull the payload unless asked.
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true, collection: 'resumes', id: false, toJSON: { virtuals: true } }
);

export const Resume = mongoose.model('Resume', resumeSchema);
