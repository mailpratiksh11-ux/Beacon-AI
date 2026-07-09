import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule, PenSquare, Megaphone, Users, LayoutTemplate, BarChart3, Mail,
  Paperclip, Clock, Sparkles, FlaskConical, GitBranch, Repeat, Flame, Eye, Users2, Plug,
  ArrowRight, Check, Zap, Crown, Rocket, LayoutDashboard,
} from 'lucide-angular';
import { ProfileService } from '../core/profile.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [LucideAngularModule, RouterLink],
  template: `
    <!-- Hero -->
    <section class="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/[0.06] p-8 sm:p-10 mb-8"
             style="background:linear-gradient(140deg,rgba(99,102,241,.16),rgba(124,58,237,.10) 60%,transparent)">
      <div class="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-brand-500/20 blur-3xl"></div>
      <div class="relative">
        <span class="badge-info mb-4"><lucide-icon [img]="Spark" [size]="13" /> Beacon AI</span>
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Welcome back{{ profile.firstName() ? ', ' + profile.firstName() : '' }} 👋
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-2 max-w-xl leading-relaxed">
          Here's everything Beacon can do for you — send personalized cold emails from your own inbox,
          track results, and scale outreach without the busywork.
        </p>
        <div class="flex flex-wrap items-center gap-2.5 mt-6">
          <a routerLink="/compose" class="btn-primary"><lucide-icon [img]="Compose" [size]="16" /> Compose an email</a>
          <a routerLink="/contacts" class="btn-secondary"><lucide-icon [img]="UsersIcon" [size]="16" /> Import contacts</a>
          <a routerLink="/" class="btn-secondary"><lucide-icon [img]="Dash" [size]="16" /> Go to dashboard</a>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="mb-10">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">What you can do today</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Everything included in your workspace.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (f of features; track f.title) {
          <a [routerLink]="f.link" class="card card-hover p-5 block group">
            <div class="h-10 w-10 rounded-xl flex items-center justify-center mb-4" [class]="f.tint">
              <lucide-icon [img]="f.icon" [size]="20" [strokeWidth]="1.75" [class]="f.color" />
            </div>
            <h3 class="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              {{ f.title }}
              <lucide-icon [img]="Arrow" [size]="14" class="text-slate-300 dark:text-slate-600 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{{ f.desc }}</p>
          </a>
        }
      </div>
    </section>

    <!-- Upcoming -->
    <section class="mb-10">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Coming soon</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">On the roadmap — we ship fast.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        @for (u of upcoming; track u.title) {
          <div class="card p-5">
            <div class="flex items-start justify-between">
              <div class="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center">
                <lucide-icon [img]="u.icon" [size]="20" [strokeWidth]="1.75" class="text-slate-400" />
              </div>
              <span class="badge-warn">Soon</span>
            </div>
            <h3 class="font-semibold text-slate-900 dark:text-white mt-4">{{ u.title }}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{{ u.desc }}</p>
          </div>
        }
      </div>
    </section>

    <!-- Plans -->
    <section class="mb-4">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Upgrade your plan</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Start free. Upgrade when you're ready to scale.</p>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        @for (p of plans; track p.name) {
          <div class="card p-6 relative flex flex-col"
               [class]="p.featured ? 'border-brand-500/50 dark:border-brand-500/50' : ''"
               [style.box-shadow]="p.featured ? '0 0 0 1px rgba(99,102,241,.4), 0 24px 60px -24px rgba(99,102,241,.4)' : ''">
            @if (p.featured) { <span class="badge-info absolute top-5 right-5">Most popular</span> }
            <div class="h-10 w-10 rounded-xl flex items-center justify-center" [class]="p.tint">
              <lucide-icon [img]="p.icon" [size]="20" [strokeWidth]="1.75" [class]="p.color" />
            </div>
            <h3 class="font-semibold text-slate-900 dark:text-white mt-4">{{ p.name }}</h3>
            <div class="flex items-baseline gap-1 mt-2">
              <span class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{{ p.price }}</span>
              <span class="text-sm text-slate-400">{{ p.period }}</span>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{{ p.tagline }}</p>
            <ul class="mt-5 space-y-2.5 flex-1">
              @for (feat of p.perks; track feat) {
                <li class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                  <span class="mt-0.5 h-4 w-4 rounded-full bg-success-500/15 flex items-center justify-center shrink-0">
                    <lucide-icon [img]="CheckIcon" [size]="11" class="text-success-500" />
                  </span>
                  {{ feat }}
                </li>
              }
            </ul>
            @if (profile.plan() === p.name.toLowerCase()) {
              <button class="btn-secondary w-full mt-6" disabled>Current plan</button>
            } @else {
              <a routerLink="/upgrade" class="w-full mt-6 justify-center" [class]="p.featured ? 'btn-primary' : 'btn-secondary'">{{ p.cta }}</a>
            }
          </div>
        }
      </div>
      <p class="text-xs text-slate-400 text-center mt-4">Plans are illustrative — billing isn't wired up yet.</p>
    </section>
  `,
})
export class Home {
  profile = inject(ProfileService);

  readonly Spark = Sparkles; readonly Compose = PenSquare; readonly UsersIcon = Users;
  readonly Arrow = ArrowRight; readonly CheckIcon = Check; readonly Dash = LayoutDashboard;

  features = [
    { title: 'Compose & personalize', desc: 'Rich editor with {{firstName}}, {{company}} & more — every email feels 1-to-1.', icon: PenSquare, link: '/compose', tint: 'bg-brand-500/12', color: 'text-brand-500' },
    { title: 'Campaigns', desc: 'Save a contact group + email as a campaign. Send to all, pause and resume anytime.', icon: Megaphone, link: '/campaigns', tint: 'bg-violet-500/12', color: 'text-violet-500' },
    { title: 'Contacts', desc: 'Import thousands from a CSV — we auto-detect the columns and dedupe for you.', icon: Users, link: '/contacts', tint: 'bg-emerald-500/12', color: 'text-emerald-500' },
    { title: 'Templates', desc: 'Reusable templates for outreach, follow-ups, recruiting and networking.', icon: LayoutTemplate, link: '/templates', tint: 'bg-amber-500/12', color: 'text-amber-500' },
    { title: 'Analytics', desc: 'Delivery, open and failure rates with weekly and monthly performance graphs.', icon: BarChart3, link: '/analytics', tint: 'bg-cyan-500/12', color: 'text-cyan-500' },
    { title: 'Send from your inbox', desc: 'Connect your own Gmail or SMTP — emails send from your address, not ours.', icon: Mail, link: '/settings', tint: 'bg-rose-500/12', color: 'text-rose-500' },
    { title: 'Auto-attach resume', desc: 'Upload your resume once; it attaches automatically to job-application campaigns.', icon: Paperclip, link: '/settings', tint: 'bg-indigo-500/12', color: 'text-indigo-500' },
    { title: 'Smart throttling', desc: 'Delay between emails and daily caps keep your domain safe and out of spam.', icon: Clock, link: '/compose', tint: 'bg-teal-500/12', color: 'text-teal-500' },
  ];

  upcoming = [
    { title: 'AI email writer', desc: 'Generate high-converting cold emails from a one-line prompt.', icon: Sparkles },
    { title: 'A/B testing', desc: 'Test subject lines and copy, then auto-pick the winner.', icon: FlaskConical },
    { title: 'Auto follow-ups', desc: 'Multi-step sequences that stop when someone replies.', icon: Repeat },
    { title: 'Inbox warmup', desc: 'Gradually ramp sending to build sender reputation.', icon: Flame },
    { title: 'Open & reply tracking', desc: 'Know who opened, clicked and replied — in real time.', icon: Eye },
    { title: 'Team workspaces', desc: 'Invite teammates, share templates and inboxes.', icon: Users2 },
    { title: 'Sequences & branches', desc: 'Conditional steps based on opens, clicks and replies.', icon: GitBranch },
    { title: 'Integrations', desc: 'Sync with HubSpot, LinkedIn, Zapier and your ATS.', icon: Plug },
  ];

  plans = [
    {
      name: 'Free', price: '$0', period: '/mo', tagline: 'Everything to get started.', current: true, featured: false,
      icon: Zap, tint: 'bg-slate-500/12', color: 'text-slate-400', cta: 'Current plan',
      perks: ['Up to 50 emails/day', '1 sending account', 'Contacts & templates', 'Basic analytics'],
    },
    {
      name: 'Pro', price: '$29', period: '/mo', tagline: 'For serious outreach.', current: false, featured: true,
      icon: Crown, tint: 'bg-brand-500/15', color: 'text-brand-500', cta: 'Upgrade to Pro',
      perks: ['Up to 500 emails/day', 'AI email writer', 'A/B testing', 'Auto follow-ups', 'Full analytics & tracking'],
    },
    {
      name: 'Business', price: '$99', period: '/mo', tagline: 'For teams that scale.', current: false, featured: false,
      icon: Rocket, tint: 'bg-violet-500/12', color: 'text-violet-500', cta: 'Contact sales',
      perks: ['High-volume sending', 'Team workspaces', 'Inbox warmup', 'Integrations (HubSpot, Zapier…)', 'Priority support'],
    },
  ];
}
