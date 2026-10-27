import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule, Send, Clock, XCircle, MailCheck, ArrowUpRight,
  ArrowDownRight, Plus, TrendingUp, MoreHorizontal, Megaphone, Users,
} from 'lucide-angular';
import { DataService } from '../core/data.service';
import { ApiService } from '../core/api.service';
import { ProfileService } from '../core/profile.service';
import { PageHeader } from '../shared/page-header';
import { StatusBadge } from '../shared/status-badge';
import { EmptyState } from '../shared/empty-state';

interface Stat {
  label: string; value: string; delta?: string; up?: boolean;
  icon: any; tint: string; iconColor: string; note: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, PageHeader, StatusBadge, EmptyState],
  template: `
    <app-page-header title="Dashboard" [subtitle]="greeting()">
      <button class="btn-secondary"><lucide-icon [img]="Trend" [size]="16" /> View report</button>
      <a routerLink="/compose" class="btn-primary"><lucide-icon [img]="Plus" [size]="16" /> New Campaign</a>
    </app-page-header>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      @if (loading()) {
        @for (i of [1,2,3,4]; track i) {
          <div class="card p-5">
            <div class="skeleton h-10 w-10 rounded-xl mb-4"></div>
            <div class="skeleton h-7 w-20 mb-2"></div>
            <div class="skeleton h-4 w-28"></div>
          </div>
        }
      } @else {
        @for (s of stats(); track s.label) {
          <div class="card card-hover p-5 animate-slide-up">
            <div class="flex items-start justify-between">
              <div class="h-10 w-10 rounded-xl flex items-center justify-center" [class]="s.tint">
                <lucide-icon [img]="s.icon" [size]="20" [class]="s.iconColor" />
              </div>
              @if (s.delta) {
                <span class="badge" [class]="s.up ? 'badge-success' : 'badge-danger'">
                  <lucide-icon [img]="s.up ? Up : Down" [size]="12" />{{ s.delta }}
                </span>
              }
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white mt-4">{{ s.value }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ s.label }}</p>
            <p class="text-xs text-slate-400 mt-2">{{ s.note }}</p>
          </div>
        }
      }
    </div>

    <!-- Recent campaigns -->
    <div class="card overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 class="font-semibold text-slate-900 dark:text-white">Recent Campaigns</h2>
          <p class="text-xs text-slate-400 mt-0.5">Your latest sending activity</p>
        </div>
        <a routerLink="/campaigns" class="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
          View all <lucide-icon [img]="ArrowUp" [size]="14" />
        </a>
      </div>

      @if (!data.loaded()) {
        <div class="p-5 space-y-3">
          @for (i of [1,2,3,4]; track i) { <div class="skeleton h-12 w-full"></div> }
        </div>
      } @else if (data.campaigns().length === 0) {
        <app-empty-state title="No campaigns yet" subtitle="Create your first cold email campaign, or import your contacts to get started." [icon]="MegaphoneIcon">
          <a routerLink="/compose" class="btn-primary"><lucide-icon [img]="Plus" [size]="16" /> Create Campaign</a>
          <a routerLink="/contacts" class="btn-secondary"><lucide-icon [img]="UsersIcon" [size]="16" /> Import Contacts</a>
        </app-empty-state>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th class="px-5 py-3 font-semibold">Campaign Name</th>
                <th class="px-5 py-3 font-semibold">Emails Sent</th>
                <th class="px-5 py-3 font-semibold">Status</th>
                <th class="px-5 py-3 font-semibold">Created Date</th>
                <th class="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (c of data.campaigns(); track c.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-3">
                      <div class="h-9 w-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
                        <lucide-icon [img]="MegaphoneIcon" [size]="16" class="text-brand-500" />
                      </div>
                      <span class="font-medium text-slate-900 dark:text-slate-100">{{ c.name }}</span>
                    </div>
                  </td>
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-2 w-40">
                      <div class="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div class="h-full rounded-full bg-brand-500" [style.width.%]="pct(c.sent, c.total)"></div>
                      </div>
                      <span class="text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">{{ c.sent }}/{{ c.total }}</span>
                    </div>
                  </td>
                  <td class="px-5 py-3.5"><app-status-badge [status]="c.status" /></td>
                  <td class="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{{ c.createdAt }}</td>
                  <td class="px-5 py-3.5 text-right">
                    <button class="btn-icon opacity-0 group-hover:opacity-100 transition-opacity"><lucide-icon [img]="More" [size]="16" /></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class Dashboard implements OnInit {
  data = inject(DataService);
  private api = inject(ApiService);
  private profile = inject(ProfileService);
  loading = signal(true);

  greeting = computed(() => {
    const first = this.profile.firstName();
    return first ? `Welcome back, ${first}, here’s your sending overview.` : 'Here’s your sending overview.';
  });

  readonly Up = ArrowUpRight; readonly Down = ArrowDownRight; readonly ArrowUp = ArrowUpRight;
  readonly Plus = Plus; readonly Trend = TrendingUp; readonly More = MoreHorizontal;
  readonly MegaphoneIcon = Megaphone; readonly UsersIcon = Users ;

  stats = signal<Stat[]>([]);

  ngOnInit() {
    this.api.getStats().subscribe({
      next: (s) => {
        this.stats.set([
          { label: 'Emails Sent Today', value: s.sentToday.toString(), delta: '12%', up: true, icon: Send, tint: 'bg-brand-50 dark:bg-brand-500/10', iconColor: 'text-brand-500', note: `${s.activeCampaigns} active campaigns` },
          { label: 'Pending Emails', value: s.pending.toString(), delta: '8%', up: true, icon: Clock, tint: 'bg-amber-50 dark:bg-amber-500/10', iconColor: 'text-amber-500', note: 'queued for delivery' },
          { label: 'Failed Emails', value: s.failed.toString(), delta: '3%', up: false, icon: XCircle, tint: 'bg-red-50 dark:bg-red-500/10', iconColor: 'text-red-500', note: 'bounced or rejected' },
          { label: 'Sending Email', value: this.profile.mailConfigured() ? 'Connected' : 'Not connected', icon: MailCheck, tint: this.profile.mailConfigured() ? 'bg-success-50 dark:bg-success-500/10' : 'bg-slate-100 dark:bg-slate-800', iconColor: this.profile.mailConfigured() ? 'text-success-500' : 'text-slate-400', note: this.profile.mailConfigured() ? this.profile.mailUser() : 'Connect in Settings' },
        ]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  pct(a: number, b: number) { return b === 0 ? 0 : Math.round((a / b) * 100); }
}
