import { connectDB, disconnectDB } from './config/db.js';
import { Campaign } from './models/campaign.model.js';
import { Email } from './models/email.model.js';
import { Template } from './models/template.model.js';
import { Contact } from './models/contact.model.js';
import { User } from './models/user.model.js';

const campaigns = [
  { name: 'Q3 Recruiter Outreach', sent: 243, total: 243, status: 'sent', openRate: 62 },
  { name: 'SaaS Founders — Series A', sent: 118, total: 200, status: 'sending', openRate: 41 },
  { name: 'Design Leads Follow-up', sent: 0, total: 87, status: 'scheduled' },
  { name: 'YC W26 Cold Intro', sent: 320, total: 320, status: 'sent', openRate: 58 },
  { name: 'Product Manager Network', sent: 0, total: 54, status: 'draft' },
  { name: 'Fintech Hiring Managers', sent: 45, total: 160, status: 'failed', openRate: 33 },
];

const templates = [
  { name: 'Job Application', category: 'Applications', subject: 'Application for {{position}} at {{company}}', body: 'Hi {{firstName}},\n\nI’m excited to apply for the {{position}} role at {{company}}. My background lines up closely with what you’re looking for.\n\nBest,\nPratik', uses: 42, accent: 'brand' },
  { name: 'Cold Outreach', category: 'Outreach', subject: 'Quick intro — {{company}}', body: 'Hi {{firstName}},\n\nI came across your profile and wanted to connect regarding opportunities at {{company}}.\n\nBest,\nPratik', uses: 118, accent: 'violet' },
  { name: 'Follow Up', category: 'Follow-up', subject: 'Following up — {{firstName}}', body: 'Hi {{firstName}},\n\nJust floating this back to the top of your inbox. Would love to hear your thoughts.\n\nThanks,\nPratik', uses: 76, accent: 'emerald' },
  { name: 'Recruiter', category: 'Recruiting', subject: 'Great fit for {{position}}', body: 'Hi {{firstName}},\n\nI’m a recruiter working with {{company}} and think you’d be a great fit for our {{position}} opening.\n\nBest,\nPratik', uses: 34, accent: 'amber' },
  { name: 'Networking', category: 'Networking', subject: 'Loved your work at {{company}}', body: 'Hi {{firstName}},\n\nI’ve been following your work at {{company}} and would love to connect and learn more.\n\nCheers,\nPratik', uses: 21, accent: 'rose' },
];

const contacts = [
  { name: 'John Carter', email: 'john@acme.com', company: 'Acme', position: 'Eng Manager', status: 'active' },
  { name: 'Alex Rivera', email: 'alex@northwind.io', company: 'Northwind', position: 'CTO', status: 'active' },
  { name: 'Emma Stone', email: 'emma@globex.com', company: 'Globex', position: 'Head of Talent', status: 'active' },
  { name: 'Mike Ross', email: 'mike@initech.dev', company: 'Initech', position: 'VP Engineering', status: 'bounced' },
  { name: 'Sara Lin', email: 'sara@umbrella.co', company: 'Umbrella', position: 'Design Lead', status: 'active' },
  { name: 'Dan Fox', email: 'dan@hooli.com', company: 'Hooli', position: 'Product Lead', status: 'unsubscribed' },
];

// People + companies used to synthesize realistic email history
const people = [
  { name: 'John Carter', email: 'john@acme.com', company: 'Acme' },
  { name: 'Alex Rivera', email: 'alex@northwind.io', company: 'Northwind' },
  { name: 'Emma Stone', email: 'emma@globex.com', company: 'Globex' },
  { name: 'Mike Ross', email: 'mike@initech.dev', company: 'Initech' },
  { name: 'Sara Lin', email: 'sara@umbrella.co', company: 'Umbrella' },
  { name: 'Dan Fox', email: 'dan@hooli.com', company: 'Hooli' },
  { name: 'Nina Patel', email: 'nina@piedpiper.com', company: 'Pied Piper' },
  { name: 'Omar Reed', email: 'omar@vandelay.com', company: 'Vandelay' },
  { name: 'Lily Nguyen', email: 'lily@stark.io', company: 'Stark' },
  { name: 'Raj Mehta', email: 'raj@wayne.com', company: 'Wayne' },
  { name: 'Kate Bishop', email: 'kate@cyberdyne.ai', company: 'Cyberdyne' },
  { name: 'Sam Wu', email: 'sam@tyrell.co', company: 'Tyrell' },
];

const subjects = [
  'Opportunities at {c}', 'Quick intro re: {c}', 'Connecting about {c} roles',
  'Following up on my application', 'Loved your work at {c}', 'Exploring roles at {c}',
  'Intro from a mutual connection', 'Design leadership at {c}', 'Coffee chat?',
  'Quick question about hiring', 'AI engineering roles at {c}',
];
const campaignNames = campaigns.map((c) => c.name);
const statuses = ['delivered', 'delivered', 'delivered', 'opened', 'opened', 'pending', 'bounced', 'failed'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

function buildEmails(count) {
  const now = Date.now();
  const out = [];
  for (let i = 0; i < count; i++) {
    const p = rand(people);
    // Weight ~35% of emails into the last 7 days, rest across ~180 days
    const daysAgo = Math.random() < 0.35 ? Math.floor(Math.random() * 7) : Math.floor(Math.random() * 180);
    const sentAt = new Date(now - daysAgo * 86_400_000 - Math.floor(Math.random() * 86_400_000));
    out.push({
      recipient: p.email,
      name: p.name,
      subject: rand(subjects).replace('{c}', p.company),
      status: rand(statuses),
      campaign: rand(campaignNames),
      sentAt,
    });
  }
  return out;
}

async function seed() {
  await connectDB();
  const DEMO_EMAIL = 'demo@coldmailer.ai';
  console.log(`Seeding a demo workspace for ${DEMO_EMAIL}…`);

  // Fresh demo user + wipe just that user's data (leave other users untouched)
  let demo = await User.findOne({ email: DEMO_EMAIL });
  if (!demo) demo = await User.create({ email: DEMO_EMAIL, name: 'Demo User' });
  const uid = demo._id;

  await Promise.all([
    Campaign.deleteMany({ userId: uid }),
    Email.deleteMany({ userId: uid }),
    Template.deleteMany({ userId: uid }),
    Contact.deleteMany({ userId: uid }),
  ]);

  const withUser = (arr) => arr.map((x) => ({ ...x, userId: uid }));
  const emails = buildEmails(160);
  const [c, e, t, k] = await Promise.all([
    Campaign.insertMany(withUser(campaigns)),
    Email.insertMany(withUser(emails)),
    Template.insertMany(withUser(templates)),
    Contact.insertMany(withUser(contacts)),
  ]);

  console.log(`✔ Seeded ${c.length} campaigns, ${e.length} emails, ${t.length} templates, ${k.length} contacts for ${DEMO_EMAIL}`);
  console.log(`  → log in with "${DEMO_EMAIL}" (email sign-in) to see this data.`);
  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
