import { randomUUID } from 'crypto';
import { connectDB, disconnectDB } from './config/db.js';
import { User } from './models/user.model.js';
import { Organization } from './models/organization.model.js';
import { Application } from './models/application.model.js';
import { Attachment } from './models/attachment.model.js';
import { Campaign } from './models/campaign.model.js';
import { Contact } from './models/contact.model.js';
import { Email } from './models/email.model.js';
import { Job } from './models/job.model.js';
import { Resume } from './models/resume.model.js';
import { SavedJob } from './models/saved-job.model.js';
import { Template } from './models/template.model.js';

/**
 * Backfill: give every existing user a personal organization and tag all of
 * their documents with its orgId.
 *
 * Run once before deploying the org-scoped queries. Until a document has an
 * orgId it is invisible to those queries, so this is the step that decides
 * whether anyone's data appears to vanish.
 *
 *   node src/backfill-orgs.js
 *
 * Idempotent by design, and safe to re-run: a user who already has an orgId
 * keeps it, and only documents still missing one are touched. Re-running after
 * a partial failure finishes the job rather than duplicating anything.
 *
 * Writes go through Model.collection, which gives the real collection name
 * while bypassing schema validation — orgId is `required`, so a validated
 * write would reject the very documents we are here to fix.
 */

// Every collection that scopes on orgId. Keep in step with the models.
const SCOPED = [Application, Attachment, Campaign, Contact, Email, Job, Resume, SavedJob, Template];

const MISSING_ORG = { $or: [{ orgId: { $exists: false } }, { orgId: '' }, { orgId: null }] };

function orgNameFor(user) {
  const who = (user.name || '').trim() || (user.email || '').split('@')[0] || 'My';
  return `${who}'s workspace`;
}

async function run() {
  await connectDB();

  const users = User.collection;
  const orgs = Organization.collection;
  const all = await users.find({}).toArray();

  console.log(`\nFound ${all.length} user(s).\n`);

  let created = 0;
  let existing = 0;
  let tagged = 0;

  for (const u of all) {
    let orgId = u.orgId;

    if (orgId) {
      existing++;
    } else {
      orgId = randomUUID();
      const now = new Date();
      await orgs.insertOne({
        id: orgId,
        name: orgNameFor(u),
        ownerId: u.id,
        personal: true,
        // Carry the user's own sending setup onto the org. Without this, the
        // first person they invite would have nothing to send through, and the
        // owner would have to re-enter SMTP details that are already working.
        // mailPassword is ciphertext under the same ENCRYPTION_KEY, so copying
        // the stored value across is sound — it is never decrypted here.
        mailUser: u.mailUser || '',
        mailPassword: u.mailPassword || '',
        mailHost: u.mailHost || '',
        mailPort: u.mailPort || 587,
        mailFromName: u.mailFromName || '',
        maxPerDay: u.maxPerDay || 250,
        seatLimit: 10,
        plan: u.plan || 'free',
        createdAt: now,
        updatedAt: now,
      });
      await users.updateOne({ _id: u._id }, { $set: { orgId, orgRole: 'owner' } });
      created++;
      console.log(`  + ${u.email}  ->  ${orgNameFor(u)}`);
    }

    for (const Model of SCOPED) {
      const { modifiedCount } = await Model.collection.updateMany(
        { userId: u.id, ...MISSING_ORG },
        { $set: { orgId } }
      );
      if (modifiedCount) {
        tagged += modifiedCount;
        console.log(`      ${Model.collection.collectionName.padEnd(14)} ${modifiedCount}`);
      }
    }
  }

  // Anything still untagged belongs to a userId with no matching user — data
  // orphaned by an earlier deletion. Reported rather than guessed at, because
  // inventing an owner for it would be worse than leaving it alone.
  let orphaned = 0;
  for (const Model of SCOPED) {
    const n = await Model.collection.countDocuments(MISSING_ORG);
    if (n) {
      orphaned += n;
      console.log(`  ! ${Model.collection.collectionName}: ${n} document(s) with no owning user`);
    }
  }

  console.log(`\n✔ ${created} organization(s) created, ${existing} user(s) already had one.`);
  console.log(`✔ ${tagged} document(s) tagged with an orgId.`);
  if (orphaned) console.log(`! ${orphaned} orphaned document(s) left untouched — see above.`);

  await disconnectDB();
  process.exit(0);
}

run().catch((e) => {
  console.error('\n✖ Backfill failed:', e);
  process.exit(1);
});
