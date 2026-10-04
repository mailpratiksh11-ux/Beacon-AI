// Built-in starter templates seeded for every user (see templateService.ensureDefaults).
//
// These ship to everyone, so they carry no personal details. Square brackets
// mark what the user replaces by hand ([Your Name], [role], [one concrete
// result]); double braces are the real merge variables substituted per
// recipient at send time ({{firstName}}, {{company}}).
//
// They are deliberately short. A starter that reads like a finished email gets
// sent unedited, and a generic email sent unedited is what gets marked as spam.
// Leaving obvious blanks makes the editing step unavoidable.

export const DEFAULT_TEMPLATES = [
  {
    defaultKey: 'marketing-outreach',
    name: 'Marketing Outreach',
    category: 'Marketing',
    accent: 'amber',
    subject: 'Quick idea for {{company}}',
    body: [
      'Hi {{firstName}},',
      '',
      'I will keep this short.',
      '',
      '[One sentence on something specific you noticed — a launch, a recent hire, a page on their site. If you cannot write this line, do not send the email.]',
      '',
      'We help [type of company] [achieve outcome], usually within [timeframe]. [One concrete proof point: a number, a named result, a comparable customer.]',
      '',
      'Worth fifteen minutes next week to see whether it applies to {{company}}?',
      '',
      'Best,',
      '[Your Name]',
      '[Your Title], [Your Company]',
      '[Your Email]',
    ].join('\n'),
  },
  {
    defaultKey: 'job-outreach',
    name: 'Job Application',
    category: 'Job Search',
    accent: 'cyan',
    subject: '[Role] opportunities at {{company}}',
    body: [
      'Hi {{firstName}},',
      '',
      'I hope you are doing well.',
      '',
      'I am reaching out about [role] openings at {{company}}. I am a [your role] with [N] years of experience in [your main skills], and most recently I [one concrete achievement, with a number if you have one].',
      '',
      '[One sentence on why this company in particular — not a compliment, a reason.]',
      '',
      'I have attached my resume. I would welcome the chance to talk if there is a fit.',
      '',
      'Thank you for your time.',
      '',
      'Best regards,',
      '[Your Name]',
      '[Your Phone] | [Your Email]',
      '[Your LinkedIn]',
    ].join('\n'),
  },
  {
    defaultKey: 'idea-pitch',
    name: 'Idea Pitch',
    category: 'Pitch',
    accent: 'violet',
    subject: '[One-line idea] for {{company}}',
    body: [
      'Hi {{firstName}},',
      '',
      '[One sentence naming the problem you believe they have. Be specific enough to be wrong.]',
      '',
      'The idea: [what it is and who it is for, in two sentences].',
      '',
      'Why now: [a market shift, a new constraint, a change in their business that makes this timely].',
      '',
      '[What you actually want — feedback, an introduction, twenty minutes, a pilot. Ask for one thing.]',
      '',
      'Happy to send a one-pager if that is easier.',
      '',
      'Best,',
      '[Your Name]',
      '[Your Email]',
    ].join('\n'),
  },
];

/** defaultKeys currently shipped — used to retire built-ins we no longer send. */
export const DEFAULT_KEYS = DEFAULT_TEMPLATES.map((t) => t.defaultKey);
