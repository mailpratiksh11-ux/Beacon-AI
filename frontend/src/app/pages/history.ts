import { Component, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, of, debounceTime, switchMap, catchError, tap } from 'rxjs';
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
        @if (loading()) {
          <lucide-icon [img]="Spinner" [size]="15" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
        }
      </div>
      <select class="input sm:w-48" [ngModel]="filter()" (ngModelChange)="onFilter($event)">
        <option value="all">All statuses</option>
        <option value="delivered">Delivered</option>
        <option value="pending">Pending</option>
        <option value="bounced">Bounced</option>
        <option value="failed">Failed</option>
      </select>
      @if (grandTotal() !== null) {
        <div class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 h-[42px] shrink-0"
             [title]="grandTotalLabel() + ' emails sent in total'">
          <lucide-icon [img]="MailIcon" [size]="15" class="text-brand-500" />
          <span class="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{{ grandTotalLabel() }}</span>
          <span class="text-xs text-slate-400">total</span>
        </div>
      }
    </div>

    @if (firstLoad()) {
      <div class="card p-5 space-y-3">
        @for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton h-12 w-full"></div> }
      </div>
    } @else if (rows().length === 0) {
      <div class="card">
        @if (isFiltered()) {
          <app-empty-state title="No matching emails" subtitle="Nothing matches this search or status. Try clearing the filter." [icon]="HistoryIco" />
        } @else {
          <app-empty-state title="No email history" subtitle="Emails you send will appear here with their delivery status." [icon]="HistoryIco" />
        }
      </div>
    } @else {
      <div class="card overflow-hidden" [class.opacity-60]="loading()">
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
              @for (e of rows(); track e.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer" (click)="openDetails(e)">
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
                      <button class="text-xs font-medium text-slate-500 hover:text-brand-500 hover:underline" (click)="openDetails(e)">Details</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- pagination -->
        <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800">
          <p class="text-xs text-slate-400">
            Showing {{ rangeStart().toLocaleString() }}–{{ rangeEnd().toLocaleString() }}
            of {{ totalLabel() }}{{ isFiltered() ? ' matching' : '' }}
          </p>
          <div class="flex items-center gap-1">
            <button class="btn-icon h-8 w-8" [disabled]="page() === 1 || loading()" (click)="goto(page() - 1)" aria-label="Previous page">
              <lucide-icon [img]="Prev" [size]="16" />
            </button>
            @for (p of pages(); track $index) {
              @if (p === 0) {
                <span class="px-1 text-sm text-slate-400 select-none">…</span>
              } @else {
                <button class="h-8 min-w-8 px-2 rounded-lg text-sm font-medium tabular-nums transition-colors"
                        [class]="p === page() ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'"
                        [attr.aria-current]="p === page() ? 'page' : null"
                        (click)="goto(p)">{{ p }}</button>
              }
            }
            <button class="btn-icon h-8 w-8" [disabled]="page() >= totalPages() || loading()" (click)="goto(page() + 1)" aria-label="Next page">
              <lucide-icon [img]="Next" [size]="16" />
            </button>
          </div>
        </div>
      </div>
    }

    <!-- details drawer -->
    @if (open(); as e) {
      <div class="fixed inset-0 z-[80]">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" (click)="closeDetails()"></div>
        <div class="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-pop animate-slide-in-right overflow-y-auto">
          <div class="flex items-center justify-between px-5 h-16 border-b border-slate-100 dark:border-slate-800">
            <h3 class="font-semibold text-slate-900 dark:text-white">Email Details</h3>
            <button class="btn-icon" (click)="closeDetails()"><lucide-icon [img]="XIcon" [size]="18" /></button>
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
              <div class="flex items-center gap-2 mb-3"><lucide-icon [img]="MailIcon" [size]="15" class="text-brand-500" /><p class="text-sm font-semibold text-slate-900 dark:text-white">{{ e.subject }}</p></div>
              @if (bodyLoading()) {
                <div class="space-y-2">
                  <div class="skeleton h-3.5 w-11/12"></div>
                  <div class="skeleton h-3.5 w-full"></div>
                  <div class="skeleton h-3.5 w-8/12"></div>
                </div>
              } @else if (body()) {
                <div class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed prose-editor" [innerHTML]="body()"></div>
              } @else {
                <p class="text-sm text-slate-400 italic">The message body wasn’t stored for this email.</p>
              }
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

  /** The current page of results, fetched from the server. */
  rows = signal<EmailRecord[]>([]);
  /** Count matching the active status/search — drives pagination. */
  total = signal(0);
  /** Lifetime unfiltered count — drives the "total" chip. null until known. */
  grandTotal = signal<number | null>(null);
  loading = signal(false);
  firstLoad = signal(true);

  /** The real sent body, fetched when the drawer opens. EmailRecord doesn't carry html. */
  body = signal('');
  bodyLoading = signal(false);

  totalLabel = computed(() => this.total().toLocaleString());
  grandTotalLabel = computed(() => (this.grandTotal() ?? 0).toLocaleString());
  isFiltered = computed(() => this.filter() !== 'all' || this.query().trim() !== '');

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.perPage)));
  rangeStart = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.perPage + 1));
  rangeEnd = computed(() => Math.min(this.page() * this.perPage, this.total()));

  /**
   * Windowed page numbers: first, last, and the current page ±1, with 0 marking
   * an elided run. Without this, a real total would render hundreds of buttons.
   */
  pages = computed<number[]>(() => {
    const last = this.totalPages();
    const cur = this.page();
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

    const out: number[] = [1];
    const from = Math.max(2, cur - 1);
    const to = Math.min(last - 1, cur + 1);
    if (from > 2) out.push(0);
    for (let p = from; p <= to; p++) out.push(p);
    if (to < last - 1) out.push(0);
    out.push(last);
    return out;
  });

  private reload$ = new Subject<void>();

  constructor() {
    // Debounced so typing in the search box does not fire a request per keystroke;
    // switchMap drops responses from queries the user has already moved past.
    this.reload$
      .pipe(
        debounceTime(220),
        tap(() => this.loading.set(true)),
        switchMap(() =>
          this.api
            .listEmailsPaged({
              page: this.page(),
              limit: this.perPage,
              status: this.filter() === 'all' ? undefined : this.filter(),
              search: this.query().trim() || undefined,
            })
            .pipe(catchError(() => of(null)))
        ),
        takeUntilDestroyed()
      )
      .subscribe((res) => {
        this.loading.set(false);
        this.firstLoad.set(false);
        if (!res) return; // request failed; keep whatever is on screen
        this.rows.set(res.items);
        this.total.set(res.total);
      });

    this.reload$.next();
    this.loadGrandTotal();
  }

  /** One row over the wire, purely to read the unfiltered lifetime count. */
  private loadGrandTotal() {
    this.api.listEmailsPaged({ limit: 1 }).subscribe({
      next: (r) => this.grandTotal.set(r.total),
      error: () => this.grandTotal.set(null),
    });
  }

  private reload() { this.reload$.next(); }

  /** Open the drawer and load what was actually sent. */
  openDetails(e: EmailRecord) {
    this.open.set(e);
    this.body.set('');
    this.bodyLoading.set(true);
    this.api.getEmail(e.id).subscribe({
      next: (full) => { this.body.set(full.html || ''); this.bodyLoading.set(false); },
      error: () => { this.body.set(''); this.bodyLoading.set(false); },
    });
  }

  closeDetails() {
    this.open.set(null);
    this.body.set('');
    this.bodyLoading.set(false);
  }

  onQuery(v: string) { this.query.set(v); this.page.set(1); this.reload(); }
  onFilter(v: string) { this.filter.set(v); this.page.set(1); this.reload(); }

  goto(p: number) {
    const clamped = Math.min(Math.max(1, p), this.totalPages());
    if (clamped === this.page()) return;
    this.page.set(clamped);
    this.reload();
  }

  checkBounces() {
    this.syncing.set(true);
    this.api.syncBounces().subscribe({
      next: (r) => {
        this.syncing.set(false);
        if (r.updated > 0) {
          this.toast.success('Bounces synced', `${r.updated} email${r.updated === 1 ? '' : 's'} marked as bounced.`);
          this.reload();
          this.loadGrandTotal();
          this.data.refreshHistory(); // keeps Compose's "reuse a sent email" list current
        } else {
          this.toast.info('No new bounces', 'Nothing to update, all recent sends look fine.');
        }
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
        this.reload();          // a resend logs a new history row
        this.loadGrandTotal();
        this.data.refreshHistory();
      },
      error: (err) => { this.resending.set(''); this.toast.error('Resend failed', err?.error?.message || 'Try again.'); },
    });
  }

  initials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(); }

  readonly SearchIcon = Search; readonly DownloadIcon = Download; readonly Prev = ChevronLeft;
  readonly Next = ChevronRight; readonly XIcon = X; readonly MailIcon = Mail; readonly HistoryIco = HistoryIcon;
  readonly ResendIcon = RefreshCw; readonly Spinner = Loader2;
}
