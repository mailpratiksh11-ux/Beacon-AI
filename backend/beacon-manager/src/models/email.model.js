import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const emailSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    // Scope for every read. userId below is attribution — who created it.
    // Not required yet: backfill-orgs.js has to tag existing rows before a
    // missing orgId can be treated as a fault. Tighten once that has run.
    orgId: { type: String, ref: 'Organization', default: '', index: true },
    userId: { type: String, ref: 'User', required: true, index: true },
    recipient: { type: String, required: true, trim: true, lowercase: true, index: true },
    name: { type: String, trim: true, default: '' },
    subject: { type: String, required: true, trim: true },
    html: { type: String, default: '' }, // body, kept so the email can be resent
    status: {
      type: String,
      enum: ['delivered', 'opened', 'bounced', 'failed', 'pending'],
      default: 'pending',
      index: true,
    },
    campaign: { type: String, trim: true },
    campaignId: { type: String, ref: 'Campaign' },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true, id: false, toJSON: { virtuals: true } }
);

export const Email = mongoose.model('Email', emailSchema);
