import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

// The application-tracker pipeline stages (spec §8), in order.
export const APPLICATION_STATUSES = [
  'saved', 'preparing', 'applied', 'oa', 'interview',
  'hr_round', 'technical_round', 'manager_round', 'offer', 'rejected',
];

const timelineEntrySchema = new mongoose.Schema(
  {
    status: { type: String, enum: APPLICATION_STATUSES, required: true },
    note: { type: String, default: '' },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

// Tracks one job through the hiring pipeline, with a status-change timeline.
const applicationSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    userId: { type: String, ref: 'User', required: true, index: true },
    jobId: { type: String, ref: 'Job', required: true, index: true },

    // Denormalized so the tracker renders without a join even if the Job is later purged.
    title: { type: String, default: '' },
    company: { type: String, default: '' },

    status: { type: String, enum: APPLICATION_STATUSES, default: 'saved', index: true },
    resumeId: { type: String, default: '' }, // which resume was used
    notes: { type: String, default: '' },
    appliedAt: { type: Date, default: null },
    timeline: { type: [timelineEntrySchema], default: [] },
  },
  { timestamps: true, id: false, toJSON: { virtuals: true } }
);

// One application per user+job.
applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export const Application = mongoose.model('Application', applicationSchema);
