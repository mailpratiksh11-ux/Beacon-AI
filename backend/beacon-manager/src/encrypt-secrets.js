import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.js';
import { encryptSecret, isEncrypted } from './utils/crypto.js';

// One-time: encrypt any plaintext secrets currently stored in the users collection.
async function run() {
  await connectDB();
  const col = mongoose.connection.db.collection('users');
  const users = await col.find({}).toArray();
  let count = 0;
  for (const u of users) {
    const set = {};
    for (const f of ['mailPassword', 'googleRefreshToken', 'aiCustomApiKey']) {
      const v = u[f];
      if (v && !isEncrypted(v)) set[f] = encryptSecret(v);
    }
    if (Object.keys(set).length) {
      await col.updateOne({ _id: u._id }, { $set: set });
      count++;
      console.log(`  ✔ ${u.email}: encrypted ${Object.keys(set).join(', ')}`);
    }
  }
  console.log(`\n✔ Encrypted secrets for ${count} user(s).`);
  await disconnectDB();
  process.exit(0);
}

run().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
