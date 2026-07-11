// Built-in default templates seeded for every user (see templateService.ensureDefaults).
// Personal contact details are intentionally placeholders ([Your Name], [Your Email], …)
// so the shared default never exposes one person's info — each applicant fills their own.
// Recipient variables ({{firstName}}, {{company}}) are substituted at send time as usual.

export const DEFAULT_TEMPLATES = [
  {
    defaultKey: 'job-application',
    name: 'Job Application',
    category: 'Job Search',
    accent: 'cyan',
    subject: 'Application for Software Engineer Opportunity at {{company}}',
    body: [
      'Hi {{firstName}},',
      '',
      'I hope you are doing well.',
      '',
      'I am writing to express my interest in any Software Engineer opportunities at {{company}}. I have hands-on experience as a Full-Stack Developer, working with Angular, Node.js, MongoDB, REST APIs, and microservices. Currently, I am working as an Associate Software Engineer, where I have been developing enterprise SaaS features, implementing RBAC, improving integrations, and building scalable backend solutions.',
      '',
      'I would be grateful if you could consider my profile for any suitable openings. I have attached my resume for your reference and would appreciate the opportunity to discuss how I can contribute to your team.',
      '',
      'Thank you for your time and consideration. I look forward to hearing from you.',
      '',
      'Best regards,',
      '[Your Name]',
      'Phone: [Your Phone]',
      'Email: [Your Email]',
      'LinkedIn: [Your LinkedIn]',
    ].join('\n'),
  },
];
