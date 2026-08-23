import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { LucideAngularModule, Send, CheckCircle2, XCircle, TrendingUp, Loader2 } from 'lucide-angular';
import { ApiService } from '../core/api.service';
import { PageHeader } from '../shared/page-header';
import { AnalyticsData, AnalyticsRange } from '../core/models';

interface DonutSeg { label: string; stroke: string; dash: string; offset: string; pctLabel: string; count: number; }

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [LucideAngularModule, PageHeader],
  template: `
    <app-page-header title="Analytics" subtitle="Performance across all your cold email campaigns.">
      <div class="inline-flex flex-wrap rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        @for (r of ranges; track r.key) {
          <button class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                  [class]="range() === r.key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'"
                  [attr.aria-pressed]="range() === r.key"
                  (click)="setRange(r.key)">{{ r.label }}</button>
        }
      </div>
    </app-page-header>

    @if (loading()) {
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        @for (i of [1,2,3]; track i) { <div class="skeleton h-32 w-full rounded-2xl"></div> }
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="skeleton h-72 w-full rounded-2xl"></div>
        <div class="skeleton h-72 w-full rounded-2xl"></div>
      </div>
    } @else if (!analytics()) {
      <div class="card p-10 text-center">
        <p class="text-sm text-slate-500 dark:text-slate-400">Analytics couldn’t be loaded. Try again in a moment.</p>
      </div>
    } @else if (isEmpty()) {
      <div class="card p-10 text-center">
        <p class="font-semibold text-slate-900 dark:text-white">Nothing sent in this period</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1.5">No emails were sent {{ rangeLabel().toLowerCase() }}. Pick a wider range, or send a campaign.</p>
      </div>
    } @else {

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" [class.opacity-60]="refreshing()">
        @for (k of kpis(); track k.label) {
          <div class="card p-5">
            <div class="h-10 w-10 rounded-xl flex items-center justify-center" [class]="k.tint">
              <lucide-icon [img]="k.icon" [size]="20" [class]="k.color" />
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white mt-4 tabular-nums">{{ k.value }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ k.label }}</p>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" [class.opacity-60]="refreshing()">

        <!-- Volume over the selected range -->
        <div class="card p-5">
          <div class="flex items-start justify-between mb-5 gap-3">
            <div>
              <h2 class="font-semibold text-slate-900 dark:text-white">Emails Sent</h2>
              <p class="text-xs text-slate-400 mt-0.5">{{ rangeLabel() }} · by {{ granularityLabel() }}</p>
            </div>
            <span class="text-sm font-semibold text-brand-700 dark:text-brand-400 flex items-center gap-1 shrink-0">
              <lucide-icon [img]="Trend" [size]="14" /> <span class="tabular-nums">{{ seriesTotal().toLocaleString() }}</span>
            </span>
          </div>

          <!-- Bars for a handful of buckets, a line once there are too many to read as bars -->
          @if (series().length <= 14) {
            <div class="flex items-end justify-between gap-1.5 sm:gap-2 h-48">
              @for (d of series(); track $index) {
                <div class="flex-1 flex flex-col items-center gap-2 group min-w-0">
                  <div class="relative w-full flex items-end justify-center flex-1">
                    <div class="w-full max-w-[36px] rounded-t-md bg-brand-500 group-hover:bg-brand-600 transition-colors"
                         [style.height.%]="barHeight(d.value)" [attr.aria-label]="d.label + ': ' + d.value">
                      <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap tabular-nums">{{ d.value }}</span>
                    </div>
                  </div>
                  <span class="text-[11px] text-slate-400 truncate w-full text-center">{{ d.label }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="relative">
              <svg viewBox="0 0 600 220" class="w-full h-48" preserveAspectRatio="none" role="img" [attr.aria-label]="'Emails sent, ' + rangeLabel()">
                <defs>
                  <linearGradient id="fillSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#c2621b" stop-opacity="0.28" />
                    <stop offset="100%" stop-color="#c2621b" stop-opacity="0" />
                  </linearGradient>
                </defs>
                @for (y of [0,1,2,3,4]; track y) {
                  <line x1="0" [attr.y1]="y * 50 + 10" x2="600" [attr.y2]="y * 50 + 10" class="stroke-slate-100 dark:stroke-slate-800" stroke-width="1" />
                }
                <path [attr.d]="sentArea()" fill="url(#fillSent)" />
                <path [attr.d]="sentLine()" fill="none" stroke="#c2621b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="flex justify-between mt-2 px-1">
                @for (l of edgeLabels(); track $index) { <span class="text-[11px] text-slate-400">{{ l }}</span> }
              </div>
            </div>
          }
        </div>

        <!-- Delivery donut -->
        <div class="card p-5">
          <h2 class="font-semibold text-slate-900 dark:text-white mb-1">Delivery Breakdown</h2>
          <p class="text-xs text-slate-400 mb-4">{{ totalSent().toLocaleString() }} emails · {{ rangeLabel().toLowerCase() }}</p>
          <div class="flex items-center gap-6">
            <div class="relative h-40 w-40 shrink-0">
              <svg viewBox="0 0 36 36" class="h-40 w-40 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" class="stroke-slate-100 dark:stroke-slate-800" stroke-width="3.4" />
                @for (seg of donut(); track seg.label) {
                  <circle cx="18" cy="18" r="15.9" fill="none" [attr.stroke]="seg.stroke" stroke-width="3.4"
                          stroke-linecap="round" [attr.stroke-dasharray]="seg.dash" [attr.stroke-dashoffset]="seg.offset" />
                }
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{{ deliveryRate() }}%</span>
                <span class="text-[11px] text-slate-400">delivered</span>
              </div>
            </div>
            <div class="space-y-3 flex-1">
              @for (seg of donut(); track seg.label) {
                <div class="flex items-center gap-2.5">
                  <span class="h-2.5 w-2.5 rounded-full" [style.background]="seg.stroke"></span>
                  <span class="text-sm text-slate-600 dark:text-slate-300 flex-1">{{ seg.label }}</span>
                  <span class="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{{ seg.count.toLocaleString() }}</span>
                  <span class="text-xs text-slate-400 tabular-nums w-9 text-right">{{ seg.pctLabel }}</span>
                </div>
              }
            </div>
          </div>
        </div>

      </div>
    }
  `,
})
export class Analytics implements OnInit {
  private api = inject(ApiService);

  /** Defaults to all time: the safest first view is everything. */
  range = signal<AnalyticsRange>('all');
  readonly ranges: { key: AnalyticsRange; label: string }[] = [
    { key: 'all', label: 'All time' },
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: '90d', label: '90 days' },
  ];

  loading = signal(true);
  /** A range change re-queries; dim the existing figures rather than flashing skeletons. */
  refreshing = signal(false);
  analytics = signal<AnalyticsData | null>(null);

  series = computed(() => this.analytics()?.series ?? []);
  seriesTotal = computed(() => this.series().reduce((a, d) => a + d.value, 0));
  rangeLabel = computed(() => this.analytics()?.rangeLabel ?? 'All time');
  totalSent = computed(() => this.analytics()?.totalSent ?? 0);
  deliveryRate = computed(() => this.analytics()?.deliveryRate ?? 0);
  /** Loaded successfully but nothing was sent in the window. */
  isEmpty = computed(() => !!this.analytics() && this.totalSent() === 0);
  granularityLabel = computed(() => {
    const g = this.analytics()?.granularity;
    return g === 'hour' ? 'hour' : g === 'day' ? 'day' : g === 'week' ? 'week' : 'month';
  });
  private seriesMax = computed(() => Math.max(1, ...this.series().map((d) => d.value)));

  /** Only the ends and middle, so a 30-point axis stays legible. */
  edgeLabels = computed(() => {
    const s = this.series();
    if (s.length === 0) return [];
    const mid = s[Math.floor(s.length / 2)];
    return [s[0].label, mid.label, s[s.length - 1].label];
  });

  kpis = computed(() => {
    const a = this.analytics();
    if (!a) return [];
    // No deltas: they were hardcoded strings, so every account saw the same
    // invented trend. A real one needs a previous-period comparison.
    return [
      { label: 'Emails Sent', value: a.totalSent.toLocaleString(), icon: Send, tint: 'bg-brand-50 dark:bg-brand-500/10', color: 'text-brand-500' },
      { label: 'Delivery Rate', value: a.deliveryRate + '%', icon: CheckCircle2, tint: 'bg-success-50 dark:bg-success-500/10', color: 'text-success-500' },
      { label: 'Failure Rate', value: a.failureRate + '%', icon: XCircle, tint: 'bg-red-50 dark:bg-red-500/10', color: 'text-red-500' },
    ];
  });

  donut = computed<DonutSeg[]>(() => {
    const a = this.analytics();
    if (!a) return [];
    const b = (s: string) => a.breakdown.find((x) => x.status === s)?.count || 0;
    const raw = [
      { label: 'Delivered', value: b('delivered') + b('opened'), stroke: '#10b981' },
      { label: 'Pending', value: b('pending'), stroke: '#eab308' },
      { label: 'Failed', value: b('failed') + b('bounced'), stroke: '#ef4444' },
    ].filter((s) => s.value > 0);
    const total = raw.reduce((acc, s) => acc + s.value, 0) || 1;
    const circ = 100;
    let acc = 0;
    return raw.map((s) => {
      const len = (s.value / total) * circ;
      const seg: DonutSeg = {
        label: s.label, stroke: s.stroke,
        dash: `${len.toFixed(2)} ${(circ - len).toFixed(2)}`,
        offset: (-acc).toFixed(2),
        pctLabel: `${Math.round((s.value / total) * 100)}%`,
        count: s.value,
      };
      acc += len;
      return seg;
    });
  });

  sentLine = computed(() => this.toLine(this.series().map((d) => d.value)));
  sentArea = computed(() => this.toArea(this.series().map((d) => d.value)));

  ngOnInit() { this.load(); }

  setRange(r: AnalyticsRange) {
    if (r === this.range()) return;
    this.range.set(r);
    this.load();
  }

  private load() {
    const first = !this.analytics();
    if (first) this.loading.set(true); else this.refreshing.set(true);
    this.api.getAnalytics(this.range()).subscribe({
      next: (a) => { this.analytics.set(a); this.loading.set(false); this.refreshing.set(false); },
      error: () => { this.loading.set(false); this.refreshing.set(false); },
    });
  }

  barHeight(v: number) { return (v / this.seriesMax()) * 100; }

  private toPoints(data: number[]) {
    const w = 600, h = 200, pad = 10;
    const n = Math.max(1, data.length - 1);
    const max = this.seriesMax();
    return data.map((v, i) => ({
      x: (i / n) * (w - pad * 2) + pad,
      y: h - (v / max) * (h - pad) + 10,
    }));
  }
  private toLine(data: number[]) {
    return this.toPoints(data).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }
  private toArea(data: number[]) {
    const pts = this.toPoints(data);
    if (pts.length === 0) return '';
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return `${line} L${pts[pts.length - 1].x.toFixed(1)},210 L${pts[0].x.toFixed(1)},210 Z`;
  }

  readonly Trend = TrendingUp;
  readonly Spinner = Loader2;
}
