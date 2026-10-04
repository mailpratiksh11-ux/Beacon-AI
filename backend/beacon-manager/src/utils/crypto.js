import crypto from 'crypto';
import { env } from '../config/env.js';

// AES-256-GCM encryption for secrets stored in the DB (mail passwords, AI keys, refresh tokens).
// Format: "enc:v1:<base64(iv|tag|ciphertext)>". Reads are tolerant of legacy plaintext.
const PREFIX = 'enc:v1:';
const KEY = crypto.createHash('sha256').update(env.encryptionKey || env.jwtSecret || 'beacon-dev-key').digest(); // 32 bytes

export function encryptSecret(plain) {
  if (plain == null || plain === '') return plain;
  const s = String(plain);
  if (s.startsWith(PREFIX)) return s; // already encrypted — don't double-encrypt
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([cipher.update(s, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptSecret(value) {
  if (value == null || value === '') return value;
  const s = String(value);
  if (!s.startsWith(PREFIX)) return s; // legacy plaintext — return as-is
  try {
    const raw = Buffer.from(s.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return ''; // wrong key / tampered
  }
}

export const isEncrypted = (v) => typeof v === 'string' && v.startsWith(PREFIX);
