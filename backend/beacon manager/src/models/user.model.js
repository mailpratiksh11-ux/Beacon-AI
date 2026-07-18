import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const userSchema = new mongoose.Schema(
  {
    // Public UUID identifier (referenced by userId elsewhere). _id stays a normal ObjectId.
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    googleId: { type: String, trim: true, index: true, sparse: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    name: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, default: '' },
    role: { type: String, trim: true, default: '' },
    signature: { type: String, default: '' },
    gmailAccount: { type: String, trim: true, lowercase: true, default: '' },
    gmailConnected: { type: Boolean, default: false },
    // Password auth — bcrypt hash, never sent to the client
    passwordHash: { type: String, default: '', select: false },
    resetTokenHash: { type: String, default: '', select: false },
    resetTokenExpiry: { type: Date, select: false },

    // OAuth refresh token — lets us send via this user's Gmail. Never sent to the client.
    googleRefreshToken: { type: String, default: '', select: false },

    // Microsoft / Outlook sign-in — refresh token lets us read/send the user's Outlook mailbox.
    microsoftId: { type: String, trim: true, index: true, sparse: true },
    microsoftRefreshToken: { type: String, default: '', select: false },
    outlookAccount: { type: String, trim: true, lowercase: true, default: '' },
    outlookConnected: { type: Boolean, default: false },

    // Per-user sending credentials (set in Settings). Password never sent to the client.
    mailUser: { type: String, trim: true, default: '' }, // sending email address
    mailPassword: { type: String, default: '', select: false }, // Gmail App Password or SMTP password
    mailHost: { type: String, trim: true, default: '' }, // blank => Gmail
    mailPort: { type: Number, default: 587 },
    mailFromName: { type: String, trim: true, default: '' },

    // Billing plan (billing not wired — upgrade is simulated) + AI integration.
    plan: { type: String, enum: ['free', 'pro', 'business'], default: 'free' },
    aiEnabled: { type: Boolean, default: false },
    aiModel: { type: String, default: 'qwen/qwen3-32b' }, // model within the default provider
    // Bring-your-own AI provider (OpenAI-compatible). Key never sent to the client.
    aiUseCustom: { type: Boolean, default: false },
    aiCustomBaseUrl: { type: String, trim: true, default: '' },
    aiCustomModel: { type: String, trim: true, default: '' },
    aiCustomApiKey: { type: String, default: '', select: false },
  },
  { timestamps: true, collection: 'users', id: false, toJSON: { virtuals: true } }
);

userSchema.virtual('initials').get(function () {
  return (this.name || this.email || '')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
});

export const User = mongoose.model('User', userSchema);
