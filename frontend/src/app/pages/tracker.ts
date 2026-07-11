// ---------------------------------------------------------------------------
// Application Tracker page (Job Mode).
// Shows every job the user is pursuing across the 10-stage hiring pipeline, with
// stat cards, a per-stage filter, inline status advancement (each change appends
// a timeline entry on the server), and an expandable per-application timeline.
// ---------------------------------------------------------------------------
import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Loader2, Trash2, ChevronDown, ChevronRight, Briefcase, Building2, Clock } from 'lucide-angular';
import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { Application, ApplicationStatus } from '../core/models';
import { PageHeader } from '../shared/page-header';
import { EmptyState } from '../shared/empty-state';

interface Stat { key: string; label: string; value: number; tint: string; }

@Component({
  selector: 'app-tracker',
  standalone: true,
  imports: [LucideAngularModule, FormsModule, RouterLink, PageHeader, EmptyState],
  template: `
    <app-page-header title="Application Tracker" subtitle="Every role you're pursuing, from saved to offer — with a timeline for each.">
      <a routerLink="/jobs" class="btn-primary"><lucide-icon [img]="BriefcaseIcon" [size]="16" /> Find jobs</a>
    </app-page-header>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      @for (s of stats(); track s.key) {
        <div class="card p-4">
          <p class="text-xs font-medium text-slate-400">{{ s.label }}</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1" [class]="s.tint">{{ s.value }}{{ s.key === 'responseRate' ? '%' : '' }}</p>
        </div>
      }
    </div>

    <!-- Status filter -->
    <div class="flex gap-1.5 overflow-x-auto pb-2 mb-3">
      <button class="px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors" [class]="filter() === 'all' ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'" (click)="setFilter('all')">All ({{ total() }})</button>
      @for (st of statuses; track st) {
        @if (counts()[st]) {
          <button class="px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors" [class]="filter() === st ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'" (click)="setFilter(st)">{{ label(st) }} ({{ counts()[st] }})</button>
        }
      }
    </div>

    @if (loading()) {
      <div class="space-y-3">@for (i of [1,2,3,4]; track i) { <div class="skeleton h-20 w-full rounded-2xl"></div> }</div>
    } @else if (total() === 0) {
      <div class="card">
        <app-empty-state title="No applications yet" subtitle="Track a job from the Job Search page to start building your pipeline." [icon]="BriefcaseIcon">
          <a routerLink="/jobs" class="btn-primary"><lucide-icon [img]="BriefcaseIcon" [size]="16" /> Find jobs</a>
        </app-empty-state>
      </div>
    } @else {
      <div class="space-y-3">
        @for (a of visible(); track a.id) {
          <div class="card p-4">
            <div class="flex items-start gap-3">
              <div class="h-10 w-10 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0"><lucide-icon [img]="CompanyIcon" [size]="18" class="text-brand-500" /></div>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h3 class="font-semibold text-slate-900 dark:text-white truncate">{{ a.title || 'Untitled role' }}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 truncate">{{ a.company || '—' }}</p>
                  </div>
                  <span class="text-[11px] font-semibold px-2 py-1 rounded-full shrink-0" [class]="statusTint(a.status)">{{ label(a.status) }}</span>
                </div>
                <div class="flex flex-wrap items-center gap-2 mt-3">
                  <select class="input w-auto py-1.5 text-sm" [ngModel]="a.status" (ngModelChange)="changeStatus(a, $event)">
                    @for (st of statuses; track st) { <option [value]="st">{{ label(st) }}</option> }
                  </select>
                  <button class="btn-ghost h-8 px-2 text-xs" (click)="toggle(a.id)">
                    <lucide-icon [img]="expanded().has(a.id) ? Down : Right" [size]="14" /> Timeline ({{ a.timeline.length }})
                  </button>
                  @if (a.appliedAt) { <span class="text-xs text-slate-400 inline-flex items-center gap-1"><lucide-icon [img]="ClockIcon" [size]="12" /> Applied {{ a.appliedAt }}</span> }
                  <button class="btn-icon h-8 w-8 ml-auto hover:text-red-500" (click)="remove(a)"><lucide-icon [img]="TrashIcon" [size]="15" /></button>
                </div>
                @if (expanded().has(a.id)) {
                  <div class="mt-3 pl-3 border-l-2 border-slate-100 dark:border-slate-800 space-y-2.5 animate-slide-up">
                    @for (t of a.timeline.slice().reverse(); track $index) {
                      <div class="flex items-start gap-2.5">
                        <span class="h-2 w-2 rounded-full mt-1.5 shrink-0 bg-brand-500"></span>
                        <div>
                          <p class="text-sm text-slate-700 dark:text-slate-200">{{ label(t.status) }}</p>
                          <p class="text-xs text-slate-400">{{ t.at }}{{ t.note ? ' · ' + t.note : '' }}</p>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class Tracker {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  // Pipeline stages in order (must match the backend APPLICATION_STATUSES enum).
  readonly statuses: ApplicationStatus[] = ['saved', 'preparing', 'applied', 'oa', 'interview', 'hr_round', 'technical_round', 'manager_round', 'offer', 'rejected'];
  // Human labels for each stage key.
  private readonly labels: Record<string, string> = {
    saved: 'Saved', preparing: 'Preparing', applied: 'Applied', oa: 'Online Assessment', interview: 'Interview',
    hr_round: 'HR Round', technical_round: 'Technical', manager_round: 'Manager Round', offer: 'Offer', rejected: 'Rejected',
  };

  apps = signal<Application[]>([]);
  counts = signal<Record<string, number>>({});
  loading = signal(true);
  filter = signal<'all' | ApplicationStatus>('all');
  expanded = signal<Set<string>>(new Set());
  statsData = signal<any>({ total: 0, applied: 0, interviewing: 0, offers: 0, rejected: 0, responseRate: 0 });

  total = computed(() => this.apps().length);
  visible = computed(() => (this.filter() === 'all' ? this.apps() : this.apps().filter((a) => a.status === this.filter())));
  stats = computed<Stat[]>(() => {
    const s = this.statsData();
    return [
      { key: 'total', label: 'Applications', value: s.total, tint: '' },
      { key: 'applied', label: 'Applied', value: s.applied, tint: 'text-brand-600 dark:text-brand-400' },
      { key: 'interviewing', label: 'Interviewing', value: s.interviewing, tint: 'text-amber-500' },
      { key: 'offers', label: 'Offers', value: s.offers, tint: 'text-success-600 dark:text-success-400' },
      { key: 'rejected', label: 'Rejected', value: s.rejected, tint: 'text-slate-400' },
      { key: 'responseRate', label: 'Response rate', value: s.responseRate, tint: '' },
    ];
  });

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.listApplications().subscribe({
      next: (r) => { this.apps.set(r.items); this.counts.set(r.counts); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Could not load applications'); },
    });
    this.api.jobStats().subscribe((s) => this.statsData.set(s));
  }

  setFilter(f: 'all' | ApplicationStatus) { this.filter.set(f); }
  label(s: string) { return this.labels[s] || s; }
  toggle(id: string) { const n = new Set(this.expanded()); n.has(id) ? n.delete(id) : n.add(id); this.expanded.set(n); }

  // Advance/change an application's stage; the server appends a timeline entry.
  // Optimistic-ish: we swap in the server's returned copy, or roll back on error.
  changeStatus(a: Application, status: ApplicationStatus) {
    if (status === a.status) return;
    const prev = a.status;
    this.api.updateApplication(a.id, { status }).subscribe({
      next: (updated) => { this.apps.update((l) => l.map((x) => (x.id === a.id ? updated : x))); this.refreshCounts(); this.api.jobStats().subscribe((s) => this.statsData.set(s)); },
      error: (e) => { this.apps.update((l) => l.map((x) => (x.id === a.id ? { ...x, status: prev } : x))); this.toast.error('Could not update', e?.error?.message || 'Try again.'); },
    });
  }

  private refreshCounts() {
    const c: Record<string, number> = {};
    for (const a of this.apps()) c[a.status] = (c[a.status] || 0) + 1;
    this.counts.set(c);
  }

  async remove(a: Application) {
    const ok = await this.confirm.ask({ title: 'Remove from tracker?', message: `${a.title || 'This application'} will be removed.`, confirmText: 'Remove', danger: true });
    if (!ok) return;
    this.apps.update((l) => l.filter((x) => x.id !== a.id));
    this.refreshCounts();
    this.api.deleteApplication(a.id).subscribe({ error: () => this.load() });
    this.toast.success('Removed from tracker');
  }

  statusTint(s: string) {
    const map: Record<string, string> = {
      saved: 'bg-slate-500/12 text-slate-400', preparing: 'bg-brand-500/15 text-brand-600 dark:text-brand-300',
      applied: 'bg-brand-500/15 text-brand-600 dark:text-brand-300', oa: 'bg-violet-500/15 text-violet-500',
      interview: 'bg-amber-500/15 text-amber-500', hr_round: 'bg-amber-500/15 text-amber-500',
      technical_round: 'bg-amber-500/15 text-amber-500', manager_round: 'bg-amber-500/15 text-amber-500',
      offer: 'bg-success-500/15 text-success-600 dark:text-success-400', rejected: 'bg-red-500/12 text-red-500',
    };
    return map[s] || map['saved'];
  }

  readonly Spinner = Loader2; readonly TrashIcon = Trash2; readonly Down = ChevronDown; readonly Right = ChevronRight;
  readonly BriefcaseIcon = Briefcase; readonly CompanyIcon = Building2; readonly ClockIcon = Clock;
}
