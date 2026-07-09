import { connectDB, disconnectDB } from './config/db.js';
import { User } from './models/user.model.js';

async function run() {
  await connectDB();
  const users = await User.find().select('+mailPassword +passwordHash');
  console.log(`\n${users.length} user(s):\n`);
  for (const u of users) {
    console.log(`- ${u.name || '(no name)'} <${u.email}>`);
    console.log(`    mailUser: ${u.mailUser || '(empty)'}`);
    console.log(`    mailPassword set: ${Boolean(u.mailPassword)} (len ${u.mailPassword ? u.mailPassword.length : 0})`);
    console.log(`    mailHost: ${u.mailHost || '(gmail)'}  gmailConnected: ${u.gmailConnected}`);
    console.log(`    mailConfigured => ${Boolean(u.mailUser && u.mailPassword)}`);
  }
  await disconnectDB();
  process.exit(0);
}
run().catch((e) => { console.error(e.message); process.exit(1); });
