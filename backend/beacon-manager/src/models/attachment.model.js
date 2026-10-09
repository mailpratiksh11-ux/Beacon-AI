import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

// Ad-hoc email attachments uploaded from the Compose screen (separate from the default resume).
const attachmentSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    // Scope for every read. userId below is attribution — who created it.
    // Not required yet: backfill-orgs.js has to tag existing rows before a
    // missing orgId can be treated as a fault. Tighten once that has run.
    orgId: { type: String, ref: 'Organization', default: '', index: true },
    userId: { type: String, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    data: { type: Buffer, select: false },
  },
  { timestamps: true, collection: 'attachments', id: false, toJSON: { virtuals: true } }
);

export const Attachment = mongoose.model('Attachment', attachmentSchema);
