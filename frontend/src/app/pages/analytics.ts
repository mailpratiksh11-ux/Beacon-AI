import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LucideAngularModule, Send, CheckCircle2, XCircle, MailOpen, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-angular';
import { PageHeader } from '../shared/page-header';
import { ApiService } from '../core/api.service';
import { AnalyticsData } from '../core/models';

interface DonutSeg { label: string; stroke: string; dash: string; offset: string; pctLabel: string; }

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [LucideAngularModule, PageHeader],
  template: `
    <app-page-header title="Analytics" subtitle="Performance across all your cold email campaigns.">
      <div class="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        @for (r of ranges; track r) {
          <button class="px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors"
                  [class]="range() === r ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'"
                  (click)="range.set(r)">{{ r }}</button>
        }
      </div>
    </app-page-header>

    @if (loading()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        @for (i of [1,2,3,4]; track i) { <div class="skeleton h-32 w-full rounded-2xl"></div> }
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="skeleton h-72 w-full rounded-2xl"></div>
        <div class="skeleton h-72 w-full rounded-2xl"></div>
      </div>
    } @else {
      <!-- KPI cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        @for (k of kpis(); track k.label) {
          <div class="card p-5">
            <div class="flex items-start justify-between">
              <div class="h-10 w-10 rounded-xl flex items-center justify-center" [class]="k.tint">
                <lucide-icon [img]="k.icon" [size]="20" [class]="k.color" />
              </div>
              <span class="badge" [class]="k.up ? 'badge-success' : 'badge-danger'">
                <lucide-icon [img]="k.up ? Up : Down" [size]="12" />{{ k.delta }}
              </span>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white mt-4">{{ k.value }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ k.label }}</p>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Weekly bar chart -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-5">
            <div><h2 class="font-semibold text-slate-900 dark:text-white">Emails Sent</h2><p class="text-xs text-slate-400 mt-0.5">Last 7 days</p></div>
            <span class="text-sm font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1"><lucide-icon [img]="Trend" [size]="14" /> {{ weekTotal() }} total</span>
          </div>
          <div class="flex items-end justify-between gap-2 sm:gap-3 h-48">
            @for (d of weekly(); track $index) {
              <div class="flex-1 flex flex-col items-center gap-2 group">
                <div class="relative w-full flex items-end justify-center flex-1">
                  <div class="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-400 transition-all duration-500 group-hover:from-brand-600 group-hover:to-brand-500 relative"
                       [style.height.%]="barHeight(d.value)">
                    <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{{ d.value }}</span>
                  </div>
                </div>
                <span class="text-xs text-slate-400">{{ d.label }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Delivery donut -->
        <div class="card p-5">
          <h2 class="font-semibold text-slate-900 dark:text-white mb-1">Delivery Breakdown</h2>
          <p class="text-xs text-slate-400 mb-4">{{ analytics()?.totalSent }} emails total</p>
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
                <span class="text-2xl font-bold text-slate-900 dark:text-white">{{ analytics()?.deliveryRate }}%</span>
                <span class="text-[11px] text-slate-400">delivered</span>
              </div>
            </div>
            <div class="space-y-3 flex-1">
              @for (seg of donut(); track seg.label) {
                <div class="flex items-center gap-2.5">
                  <span class="h-2.5 w-2.5 rounded-full" [style.background]="seg.stroke"></span>
                  <span class="text-sm text-slate-600 dark:text-slate-300 flex-1">{{ seg.label }}</span>
                  <span class="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{{ seg.pctLabel }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Monthly area chart -->
      <div class="card p-5 mb-6">
        <div class="flex items-center justify-between mb-5">
          <div><h2 class="font-semibold text-slate-900 dark:text-white">Campaign Performance</h2><p class="text-xs text-slate-400 mt-0.5">Sent vs. opened, last 6 months</p></div>
          <div class="flex items-center gap-4 text-xs">
            <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-brand-500"></span> Sent</span>
            <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-success-500"></span> Opened</span>
          </div>
        </div>
        <div class="relative">
          <svg viewBox="0 0 600 220" class="w-full h-56" preserveAspectRatio="none">
            <defs>
              <linearGradient id="fillSent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2563eb" stop-opacity="0.25" /><stop offset="100%" stop-color="#2563eb" stop-opacity="0" />
              </linearGradient>
            </defs>
            @for (y of [0,1,2,3,4]; track y) {
              <line x1="0" [attr.y1]="y * 50 + 10" x2="600" [attr.y2]="y * 50 + 10" class="stroke-slate-100 dark:stroke-slate-800" stroke-width="1" />
            }
            <path [attr.d]="sentArea()" fill="url(#fillSent)" />
            <path [attr.d]="sentLine()" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <path [attr.d]="openLine()" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            @for (p of sentPoints(); track $index) {
              <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3.5" fill="#2563eb" class="stroke-white dark:stroke-slate-900" stroke-width="2" />
            }
          </svg>
          <div class="flex justify-between mt-2 px-1">
            @for (m of months(); track $index) { <span class="text-xs text-slate-400">{{ m }}</span> }
          </div>
        </div>
      </div>

      <!-- Top campaigns -->
      <div class="card p-5">
        <h2 class="font-semibold text-slate-900 dark:text-white mb-4">Top Performing Campaigns</h2>
        @if (topCampaigns().length === 0) {
          <p class="text-sm text-slate-400">No campaign performance data yet.</p>
        } @else {
          <div class="space-y-4">
            @for (c of topCampaigns(); track c.name) {
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ c.name }}</span>
                  <span class="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{{ c.rate }}%</span>
                </div>
                <div class="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div class="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" [style.width.%]="c.rate"></div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class Analytics implements OnInit {
  private api = inject(ApiService);

  range = signal('30d');
  ranges = ['7d', '30d', '90d'];
  loading = signal(true);

  readonly Up = ArrowUpRight; readonly Down = ArrowDownRight; readonly Trend = TrendingUp;

  analytics = signal<AnalyticsData | null>(null);
  weekly = computed(() => this.analytics()?.weekly ?? []);
  monthly = computed(() => this.analytics()?.monthly ?? []);
  months = computed(() => this.monthly().map((m) => m.label));
  topCampaigns = computed(() => this.analytics()?.topCampaigns ?? []);
  weekTotal = computed(() => this.weekly().reduce((a, d) => a + d.value, 0));
  private weeklyMax = computed(() => Math.max(1, ...this.weekly().map((d) => d.value)));
  private chartMax = computed(() => Math.max(1, ...this.monthly().flatMap((m) => [m.sent, m.opened])));

  kpis = computed(() => {
    const a = this.analytics();
    if (!a) return [];
    return [
      { label: 'Emails Sent', value: a.totalSent.toLocaleString(), delta: '18%', up: true, icon: Send, tint: 'bg-brand-50 dark:bg-brand-500/10', color: 'text-brand-500' },
      { label: 'Delivery Rate', value: a.deliveryRate + '%', delta: '2.1%', up: true, icon: CheckCircle2, tint: 'bg-success-50 dark:bg-success-500/10', color: 'text-success-500' },
      { label: 'Failure Rate', value: a.failureRate + '%', delta: '0.8%', up: false, icon: XCircle, tint: 'bg-red-50 dark:bg-red-500/10', color: 'text-red-500' },
      { label: 'Open Rate', value: a.openRate + '%', delta: '6.3%', up: true, icon: MailOpen, tint: 'bg-violet-50 dark:bg-violet-500/10', color: 'text-violet-500' },
    ];
  });

  donut = computed<DonutSeg[]>(() => {
    const a = this.analytics();
    if (!a) return [];
    const b = (s: string) => a.breakdown.find((x) => x.status === s)?.count || 0;
    const raw = [
      { label: 'Delivered', value: b('delivered'), stroke: '#10b981' },
      { label: 'Opened', value: b('opened'), stroke: '#2563eb' },
      { label: 'Pending', value: b('pending'), stroke: '#f59e0b' },
      { label: 'Failed', value: b('failed') + b('bounced'), stroke: '#ef4444' },
    ].filter((s) => s.value > 0);
    const total = raw.reduce((acc, s) => acc + s.value, 0) || 1;
    const circ = 100;
    let acc = 0;
    return raw.map((s) => {
      const len = (s.value / total) * circ;
      const seg: DonutSeg = { label: s.label, stroke: s.stroke, dash: `${len.toFixed(2)} ${(circ - len).toFixed(2)}`, offset: (-acc).toFixed(2), pctLabel: `${Math.round((s.value / total) * 100)}%` };
      acc += len;
      return seg;
    });
  });

  sentPoints = computed(() => this.toPoints(this.monthly().map((m) => m.sent)));
  sentLine = computed(() => this.toLine(this.monthly().map((m) => m.sent)));
  openLine = computed(() => this.toLine(this.monthly().map((m) => m.opened)));
  sentArea = computed(() => this.toArea(this.monthly().map((m) => m.sent)));

  ngOnInit() {
    this.api.getAnalytics().subscribe({
      next: (a) => { this.analytics.set(a); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  barHeight(v: number) { return (v / this.weeklyMax()) * 100; }

  private toPoints(data: number[]) {
    const w = 600, h = 200, pad = 10;
    const n = Math.max(1, data.length - 1);
    const max = this.chartMax();
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
}
