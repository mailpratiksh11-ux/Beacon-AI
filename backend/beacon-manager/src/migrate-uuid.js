import { connectDB, disconnectDB } from './config/db.js';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

// Give every document a normal ObjectId _id + a UUID `id` field.
// (Existing docs currently have a UUID in _id from a prior step — move it to `id`.)
const { ObjectId } = mongoose.Types;
const isUuid = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

async function migrateCollection(db, name) {
  const col = db.collection(name);
  const docs = await col.find().toArray();
  if (!docs.length) { console.log(`  · ${name}: 0`); return; }
  const out = docs.map((d) => {
    const uuid = isUuid(d._id) ? d._id : isUuid(d.id) ? d.id : randomUUID();
    const { _id, id, ...rest } = d;
    return { _id: new ObjectId(), id: uuid, ...rest };
  });
  await col.deleteMany({});
  await col.insertMany(out, { ordered: false });
  console.log(`  ✔ ${name}: ${out.length}`);
}

async function run() {
  await connectDB();
  const db = mongoose.connection.db;
  console.log('Rebuilding: _id → ObjectId, id → UUID (userId references id) …');
  for (const name of ['users', 'campaigns', 'contacts', 'templates', 'resumes', 'emails']) {
    await migrateCollection(db, name);
  }
  console.log('\n✔ Done. _id is ObjectId; `id` is a UUID and userId references it.');
  await disconnectDB();
  process.exit(0);
}

run().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
