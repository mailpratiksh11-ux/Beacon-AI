import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const templateSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    // Scope for every read. userId below is attribution — who created it.
    // Not required yet: backfill-orgs.js has to tag existing rows before a
    // missing orgId can be treated as a fault. Tighten once that has run.
    orgId: { type: String, ref: 'Organization', default: '', index: true },
    userId: { type: String, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, trim: true, default: 'General' },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    uses: { type: Number, default: 0, min: 0 },
    // Non-empty for built-in default templates (seeded for every user). Lets us
    // dedupe/identify them; user edits to their own copy still persist.
    defaultKey: { type: String, default: '', index: true },
    accent: {
      type: String,
      enum: ['brand', 'violet', 'emerald', 'amber', 'rose', 'cyan'],
      default: 'brand',
    },
  },
  { timestamps: true, id: false, toJSON: { virtuals: true } }
);

export const Template = mongoose.model('Template', templateSchema);
