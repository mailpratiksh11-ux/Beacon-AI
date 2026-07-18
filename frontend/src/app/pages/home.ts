import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule, PenSquare, Megaphone, Users, LayoutTemplate, BarChart3, Mail,
  Paperclip, Clock, Sparkles, Users2, Plug, Bot,
  ArrowRight, LayoutDashboard,
} from 'lucide-angular';
import { ProfileService } from '../core/profile.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [LucideAngularModule, RouterLink],
  template: `
    <!-- Hero -->
    <section class="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/[0.06] p-8 sm:p-10 mb-8"
             style="background:linear-gradient(140deg,rgba(14,165,233,.16),rgba(2,132,199,.10) 60%,transparent)">
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
  `,
})
export class Home {
  profile = inject(ProfileService);

  readonly Spark = Sparkles; readonly Compose = PenSquare; readonly UsersIcon = Users;
  readonly Arrow = ArrowRight; readonly Dash = LayoutDashboard;

  features = [
    { title: 'AI email writer', desc: 'Write or improve cold emails from a one-line prompt — right inside Compose.', icon: Sparkles, link: '/compose', tint: 'bg-fuchsia-500/12', color: 'text-fuchsia-500' },
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
    { title: 'Team workspaces', desc: 'Invite teammates, share templates and inboxes.', icon: Users2 },
    { title: 'Integrations', desc: 'Sync with HubSpot, LinkedIn, Zapier and your ATS.', icon: Plug },
    { title: 'Chat bot', desc: 'An AI assistant that answers questions and helps you work, right in Beacon.', icon: Bot },
  ];
}
