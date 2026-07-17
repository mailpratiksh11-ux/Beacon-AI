import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Download, ChevronLeft, ChevronRight, X, Mail, History as HistoryIcon, RefreshCw, Loader2 } from 'lucide-angular';
import { DataService } from '../core/data.service';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { ProfileService } from '../core/profile.service';
import { EmailRecord } from '../core/models';
import { PageHeader } from '../shared/page-header';
import { StatusBadge } from '../shared/status-badge';
import { EmptyState } from '../shared/empty-state';
import { Avatar } from '../shared/avatar';

@Component({
  selector: 'app-email-history',
  standalone: true,
  imports: [LucideAngularModule, FormsModule, PageHeader, StatusBadge, EmptyState, Avatar],
  template: `
    <app-page-header title="Email History" subtitle="Every email you’ve sent, with delivery status.">
      @if (profile.googleConnected()) {
        <button class="btn-secondary" (click)="checkBounces()" [disabled]="syncing()" title="Read bounce notices from Gmail and mark failed sends">
          @if (syncing()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Checking… }
          @else { <lucide-icon [img]="ResendIcon" [size]="16" /> Check bounces }
        </button>
      }
      <button class="btn-secondary"><lucide-icon [img]="DownloadIcon" [size]="16" /> Export</button>
    </app-page-header>

    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <div class="relative flex-1">
        <lucide-icon [img]="SearchIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input class="input pl-10" placeholder="Search by recipient or subject…" [ngModel]="query()" (ngModelChange)="onQuery($event)" />
      </div>
      <select class="input sm:w-48" [ngModel]="filter()" (ngModelChange)="onFilter($event)">
        <option value="all">All statuses</option>
        <option value="delivered">Delivered</option>
        <option value="opened">Opened</option>
        <option value="pending">Pending</option>
        <option value="bounced">Bounced</option>
        <option value="failed">Failed</option>
      </select>
    </div>

    @if (!data.loaded()) {
      <div class="card p-5 space-y-3">
        @for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton h-12 w-full"></div> }
      </div>
    } @else if (filtered().length === 0) {
      <div class="card">
        <app-empty-state title="No email history" subtitle="Emails you send will appear here with their delivery status." [icon]="HistoryIco" />
      </div>
    } @else {
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th class="px-5 py-3">Recipient</th>
                <th class="px-5 py-3">Subject</th>
                <th class="px-5 py-3">Status</th>
                <th class="px-5 py-3">Date</th>
                <th class="px-5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (e of paged(); track e.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer" (click)="open.set(e)">
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-3">
                      <app-avatar [name]="e.name" [size]="34" [rounded]="0.5" />
                      <div class="min-w-0">
                        <p class="font-medium text-slate-900 dark:text-slate-100 truncate">{{ e.name }}</p>
                        <p class="text-xs text-slate-400 truncate">{{ e.recipient }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-5 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">{{ e.subject }}</td>
                  <td class="px-5 py-3.5"><app-status-badge [status]="e.status" /></td>
                  <td class="px-5 py-3.5 text-slate-500 whitespace-nowrap">{{ e.date }}</td>
                  <td class="px-5 py-3.5 text-right">
                    <div class="flex items-center justify-end gap-3">
                      <button class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 disabled:opacity-50" (click)="$event.stopPropagation(); resend(e)" [disabled]="resending() === e.id" title="Send this email again">
                        @if (resending() === e.id) { <lucide-icon [img]="Spinner" [size]="12" class="animate-spin" /> } @else { <lucide-icon [img]="ResendIcon" [size]="12" /> }
                        Resend
                      </button>
                      <button class="text-xs font-medium text-slate-500 hover:text-brand-500 hover:underline" (click)="open.set(e)">Details</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- pagination -->
        <div class="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-800">
          <p class="text-xs text-slate-400">Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ filtered().length }}</p>
          <div class="flex items-center gap-1">
            <button class="btn-icon h-8 w-8" [disabled]="page() === 1" (click)="page.set(page() - 1)"><lucide-icon [img]="Prev" [size]="16" /></button>
            @for (p of pages(); track p) {
              <button class="h-8 w-8 rounded-lg text-sm font-medium transition-colors"
                      [class]="p === page() ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'"
                      (click)="page.set(p)">{{ p }}</button>
            }
            <button class="btn-icon h-8 w-8" [disabled]="page() === totalPages()" (click)="page.set(page() + 1)"><lucide-icon [img]="Next" [size]="16" /></button>
          </div>
        </div>
      </div>
    }

    <!-- details drawer -->
    @if (open(); as e) {
      <div class="fixed inset-0 z-[80]">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" (click)="open.set(null)"></div>
        <div class="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-pop animate-slide-in-right overflow-y-auto">
          <div class="flex items-center justify-between px-5 h-16 border-b border-slate-100 dark:border-slate-800">
            <h3 class="font-semibold text-slate-900 dark:text-white">Email Details</h3>
            <button class="btn-icon" (click)="open.set(null)"><lucide-icon [img]="XIcon" [size]="18" /></button>
          </div>
          <div class="p-5 space-y-5">
            <div class="flex items-center gap-3">
              <app-avatar [name]="e.name" [size]="44" [rounded]="0.5" />
              <div><p class="font-semibold text-slate-900 dark:text-white">{{ e.name }}</p><p class="text-sm text-slate-400">{{ e.recipient }}</p></div>
            </div>
            <dl class="space-y-3">
              <div class="flex justify-between"><dt class="text-sm text-slate-400">Status</dt><dd><app-status-badge [status]="e.status" /></dd></div>
              <div class="flex justify-between"><dt class="text-sm text-slate-400">Campaign</dt><dd class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ e.campaign }}</dd></div>
              <div class="flex justify-between"><dt class="text-sm text-slate-400">Sent at</dt><dd class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ e.date }}</dd></div>
            </dl>
            <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div class="flex items-center gap-2 mb-2"><lucide-icon [img]="MailIcon" [size]="15" class="text-brand-500" /><p class="text-sm font-semibold text-slate-900 dark:text-white">{{ e.subject }}</p></div>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Hi {{ e.name.split(' ')[0] }},<br><br>I hope you’re doing well. I came across your profile and wanted to connect regarding opportunities…<br><br>Best,<br>Pratik</p>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class EmailHistory {
  data = inject(DataService);
  profile = inject(ProfileService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  query = signal('');
  filter = signal('all');
  page = signal(1);
  open = signal<EmailRecord | null>(null);
  resending = signal('');
  syncing = signal(false);
  readonly perPage = 8;

  checkBounces() {
    this.syncing.set(true);
    this.api.syncBounces().subscribe({
      next: (r) => {
        this.syncing.set(false);
        if (r.updated > 0) { this.toast.success('Bounces synced', `${r.updated} email${r.updated === 1 ? '' : 's'} marked as bounced.`); this.data.refreshHistory(); }
        else this.toast.info('No new bounces', 'Nothing to update — all recent sends look fine.');
      },
      error: (e) => { this.syncing.set(false); this.toast.error('Couldn’t check bounces', e?.error?.message || 'Connect Google to read bounce notices.'); },
    });
  }

  resend(e: EmailRecord) {
    this.resending.set(e.id);
    this.api.resendEmail(e.id).subscribe({
      next: (r) => {
        this.resending.set('');
        if (r.status === 'delivered') this.toast.success('Resent', `Delivered to ${r.to}`);
        else this.toast.error('Resend failed', `Could not deliver to ${r.to}`);
        this.data.refreshHistory();
      },
      error: (err) => { this.resending.set(''); this.toast.error('Resend failed', err?.error?.message || 'Try again.'); },
    });
  }

  filtered = computed(() => {
    const term = this.query().toLowerCase();
    return this.data.history().filter((e) => {
      const matchF = this.filter() === 'all' || e.status === this.filter();
      const matchQ = e.recipient.toLowerCase().includes(term) || e.subject.toLowerCase().includes(term) || e.name.toLowerCase().includes(term);
      return matchF && matchQ;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.perPage)));
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  paged = computed(() => {
    const start = (this.page() - 1) * this.perPage;
    return this.filtered().slice(start, start + this.perPage);
  });
  rangeStart = computed(() => this.filtered().length === 0 ? 0 : (this.page() - 1) * this.perPage + 1);
  rangeEnd = computed(() => Math.min(this.page() * this.perPage, this.filtered().length));

  onQuery(v: string) { this.query.set(v); this.page.set(1); }
  onFilter(v: string) { this.filter.set(v); this.page.set(1); }

  initials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(); }

  readonly SearchIcon = Search; readonly DownloadIcon = Download; readonly Prev = ChevronLeft;
  readonly Next = ChevronRight; readonly XIcon = X; readonly MailIcon = Mail; readonly HistoryIco = HistoryIcon;
  readonly ResendIcon = RefreshCw; readonly Spinner = Loader2;
}
