import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

// Ad-hoc email attachments uploaded from the Compose screen (separate from the default resume).
const attachmentSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    userId: { type: String, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    data: { type: Buffer, select: false },
  },
  { timestamps: true, collection: 'attachments', id: false, toJSON: { virtuals: true } }
);

export const Attachment = mongoose.model('Attachment', attachmentSchema);
