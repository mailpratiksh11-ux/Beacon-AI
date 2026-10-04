import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const contactSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    userId: { type: String, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    company: { type: String, trim: true, default: '' },
    position: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['active', 'unsubscribed', 'bounced'],
      default: 'active',
      index: true,
    },
    favorite: { type: Boolean, default: false, index: true },
    groups: { type: [String], default: [], index: true },
  },
  { timestamps: true, id: false, toJSON: { virtuals: true } }
);

// Email is unique per user (not globally)
contactSchema.index({ userId: 1, email: 1 }, { unique: true });

export const Contact = mongoose.model('Contact', contactSchema);
