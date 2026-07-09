import { connectDB, disconnectDB } from './config/db.js';
import mongoose from 'mongoose';

async function run() {
  await connectDB();
  const col = mongoose.connection.db.collection('contacts');

  const before = await col.indexes();
  console.log('contacts indexes BEFORE:');
  before.forEach((i) => console.log('  ', i.name, JSON.stringify(i.key), i.unique ? '(unique)' : ''));

  // Drop the stale global-unique index on email alone, if present
  const stale = before.find((i) => i.name === 'email_1' || (i.key && i.key.email === 1 && !i.key.userId));
  if (stale) {
    await col.dropIndex(stale.name);
    console.log(`\n✔ Dropped stale index: ${stale.name}`);
  } else {
    console.log('\nNo stale email_1 index found.');
  }

  // Ensure the compound per-user unique index exists
  await col.createIndex({ userId: 1, email: 1 }, { unique: true });
  console.log('✔ Ensured { userId: 1, email: 1 } unique index');

  const after = await col.indexes();
  console.log('\ncontacts indexes AFTER:');
  after.forEach((i) => console.log('  ', i.name, JSON.stringify(i.key), i.unique ? '(unique)' : ''));

  await disconnectDB();
  process.exit(0);
}

run().catch((e) => { console.error('Fix failed:', e.message); process.exit(1); });
