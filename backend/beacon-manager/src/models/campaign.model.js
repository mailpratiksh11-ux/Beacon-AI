import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const campaignSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    // Scope for every read. userId below is attribution — who created it.
    // Not required yet: backfill-orgs.js has to tag existing rows before a
    // missing orgId can be treated as a fault. Tighten once that has run.
    orgId: { type: String, ref: 'Organization', default: '', index: true },
    userId: { type: String, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    sent: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['sent', 'sending', 'scheduled', 'draft', 'failed', 'paused'],
      default: 'draft',
      index: true,
    },
    openRate: { type: Number, min: 0, max: 100 },
    subject: { type: String, trim: true },
    body: { type: String },
    // Snapshot of the recipients this campaign sends to (a saved contact group)
    recipients: {
      type: [{ email: String, name: String, company: String, position: String, _id: false }],
      default: [],
    },
  },
  { timestamps: true, id: false }
);

campaignSchema.virtual('progress').get(function () {
  return this.total === 0 ? 0 : Math.round((this.sent / this.total) * 100);
});

campaignSchema.set('toJSON', { virtuals: true });

export const Campaign = mongoose.model('Campaign', campaignSchema);
