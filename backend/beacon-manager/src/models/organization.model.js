import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

/**
 * An organization is the unit of data ownership. Contacts, templates,
 * campaigns and send history all belong to one, not to a user.
 *
 * Every user has one. On signup we create a personal org with the user as its
 * only member, so orgId is always set and every query can scope on it without
 * branching on whether the account "has a team". Inviting someone changes the
 * seat count, not the data model — which is the whole reason for doing it this
 * way rather than bolting teams on later.
 *
 * `personal` marks those auto-created orgs so the UI can stay out of the way
 * until somebody is actually invited.
 */
const organizationSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Typed on the login page to choose which workspace to sign in to, so it
    // must be unique, short and memorable. Derived from the name at creation
    // and uniquified with a numeric suffix when two orgs share a name.
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    ownerId: { type: String, ref: 'User', required: true, index: true },
    personal: { type: Boolean, default: false },

    // Shared sending credentials. A member with no SMTP of their own sends
    // through these — see mailerService.resolve(). Encrypted at rest and never
    // serialized to the client, exactly as the per-user fields are.
    mailUser: { type: String, trim: true, default: '' },
    mailPassword: { type: String, default: '', select: false },
    mailHost: { type: String, trim: true, default: '' },
    mailPort: { type: Number, default: 587 },
    mailFromName: { type: String, trim: true, default: '' },

    // Daily ceiling for the ORGANIZATION, counted across every member.
    //
    // This cannot be per-user once a mailbox is shared. Ten members at 250 each
    // would be allowed 2,500 sends a day through a Gmail account that Google
    // caps at 500 (consumer) or 2,000 (Workspace) — the mailbox gets throttled
    // or suspended, and it looks like the product broke.
    maxPerDay: { type: Number, default: 250, min: 1, max: 5000 },

    seatLimit: { type: Number, default: 10, min: 1, max: 500 },
    plan: { type: String, enum: ['free', 'pro', 'business'], default: 'free' },
  },
  { timestamps: true, collection: 'organizations', id: false, toJSON: { virtuals: true } }
);

export const Organization = mongoose.model('Organization', organizationSchema);
