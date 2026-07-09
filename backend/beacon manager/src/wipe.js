import { connectDB, disconnectDB } from './config/db.js';
import mongoose from 'mongoose';

async function run() {
  await connectDB();
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  if (!collections.length) { console.log('No collections to drop.'); }
  for (const c of collections) {
    await db.collection(c.name).deleteMany({});
    console.log(`✔ Cleared collection: ${c.name}`);
  }
  console.log('\n✔ All data deleted. Fresh start.');
  await disconnectDB();
  process.exit(0);
}

run().catch((e) => { console.error('Wipe failed:', e.message); process.exit(1); });
