import { Component, inject, signal, computed, effect, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule, Search, SlidersHorizontal, RefreshCw, Plus, Star, MapPin,
  Briefcase, ExternalLink, Loader2, X, Check, Building2, Sparkles,
} from 'lucide-angular';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { Job, JobSourceMeta } from '../core/models';
import { PageHeader } from '../shared/page-header';
import { EmptyState } from '../shared/empty-state';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [LucideAngularModule, FormsModule, RouterLink, PageHeader, EmptyState],
  template: `
    <app-page-header title="Job Search" subtitle="Discover roles from connected sources, save the good ones, and track your applications.">
      <button class="btn-secondary" (click)="importOpen.set(true)"><lucide-icon [img]="PlusIcon" [size]="16" /> Add job</button>
      <button class="btn-primary" (click)="sync()" [disabled]="syncing()">
        @if (syncing()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Fetching… }
        @else { <lucide-icon [img]="RefreshIcon" [size]="16" /> Fetch latest }
      </button>
    </app-page-header>

    <!-- Search + filter toggle -->
    <div class="flex flex-wrap items-center gap-3 mb-3">
      <div class="relative flex-1 min-w-[220px]">
        <lucide-icon [img]="SearchIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input class="input pl-9" placeholder="Search title, company, keywords…" [ngModel]="f.search" (ngModelChange)="onSearch($event)" />
        @if (loading() && items().length) { <lucide-icon [img]="Spinner" [size]="15" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" /> }
      </div>
      <button class="btn-secondary shrink-0" [class.border-brand-500]="showFilters()" (click)="showFilters.set(!showFilters())">
        <lucide-icon [img]="FilterIcon" [size]="16" /> Filters @if (activeFilterCount()) { <span class="badge-info ml-1">{{ activeFilterCount() }}</span> }
      </button>
      <span class="badge-info shrink-0 tabular-nums"><lucide-icon [img]="BriefcaseIcon" [size]="13" /> {{ total() }}</span>
    </div>

    <!-- Filter panel -->
    @if (showFilters()) {
      <div class="card p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-slide-up">
        <label class="block"><span class="label">Job title</span><input class="input" [ngModel]="f.title" (ngModelChange)="setFilter('title', $event)" placeholder="e.g. Frontend Engineer" /></label>
        <label class="block"><span class="label">Skills (comma-separated)</span><input class="input" [ngModel]="f.skills" (ngModelChange)="setFilter('skills', $event)" placeholder="react, node.js" /></label>
        <label class="block"><span class="label">Company</span><input class="input" [ngModel]="f.company" (ngModelChange)="setFilter('company', $event)" placeholder="Any company" /></label>
        <label class="block"><span class="label">Location</span><input class="input" [ngModel]="f.location" (ngModelChange)="setFilter('location', $event)" placeholder="Any location" /></label>
        <label class="block"><span class="label">Work mode</span>
          <select class="input" [ngModel]="f.remoteType" (ngModelChange)="setFilter('remoteType', $event)">
            <option value="all">Any</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">Onsite</option>
          </select>
        </label>
        <label class="block"><span class="label">Employment type</span>
          <select class="input" [ngModel]="f.employmentType" (ngModelChange)="setFilter('employmentType', $event)">
            <option value="all">Any</option><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option>
          </select>
        </label>
        <label class="block"><span class="label">Date posted</span>
          <select class="input" [ngModel]="f.datePosted" (ngModelChange)="setFilter('datePosted', $event)">
            <option value="">Any time</option><option value="24h">Last 24 hours</option><option value="3d">Last 3 days</option><option value="7d">Last week</option><option value="30d">Last month</option>
          </select>
        </label>
        <label class="block"><span class="label">Min salary (USD)</span><input class="input" type="number" [ngModel]="f.salaryMin" (ngModelChange)="setFilter('salaryMin', $event)" placeholder="e.g. 80000" /></label>
        <label class="block"><span class="label">Source</span>
          <select class="input" [ngModel]="f.source" (ngModelChange)="setFilter('source', $event)">
            <option value="all">All sources</option>
            @for (s of sources(); track s.id) { <option [value]="s.id" [disabled]="!s.enabled">{{ s.name }}{{ s.enabled ? '' : ' (needs API)' }}</option> }
          </select>
        </label>
        <div class="flex items-center gap-4 sm:col-span-2 lg:col-span-3 pt-1">
          <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer"><input type="checkbox" class="accent-brand-500 h-4 w-4" [ngModel]="f.easyApply" (ngModelChange)="setFilter('easyApply', $event)" /> Easy apply only</label>
          <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer"><input type="checkbox" class="accent-brand-500 h-4 w-4" [ngModel]="f.visaSponsorship" (ngModelChange)="setFilter('visaSponsorship', $event)" /> Visa sponsorship</label>
          <button class="btn-ghost ml-auto text-sm" (click)="clearFilters()">Clear all</button>
        </div>
      </div>
    }

    <!-- Results -->
    @if (loading() && items().length === 0) {
      <div class="space-y-3">@for (i of [1,2,3,4,5]; track i) { <div class="skeleton h-28 w-full rounded-2xl"></div> }</div>
    } @else if (total() === 0) {
      <div class="card">
        <app-empty-state title="No jobs yet" subtitle="Fetch the latest roles from your connected sources, or add one manually." [icon]="BriefcaseIcon">
          <button class="btn-primary" (click)="sync()" [disabled]="syncing()"><lucide-icon [img]="RefreshIcon" [size]="16" /> Fetch latest jobs</button>
        </app-empty-state>
      </div>
    } @else {
      <div class="space-y-3">
        @for (j of items(); track j.id) {
          <div class="card card-hover p-5">
            <div class="flex items-start gap-4">
              <div class="h-11 w-11 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                @if (j.companyLogo) { <img [src]="j.companyLogo" alt="" class="h-full w-full object-cover" /> }
                @else { <lucide-icon [img]="CompanyIcon" [size]="20" class="text-brand-500" /> }
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h3 class="font-semibold text-slate-900 dark:text-white truncate">{{ j.title }}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 truncate">{{ j.company || 'Unknown company' }}</p>
                  </div>
                  <button class="btn-icon h-8 w-8 shrink-0" [class]="j.saved ? 'text-amber-400 [&_svg]:fill-amber-400' : 'hover:text-amber-500'" (click)="toggleSave(j)" [title]="j.saved ? 'Saved' : 'Save job'">
                    <lucide-icon [img]="StarIcon" [size]="17" />
                  </button>
                </div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  @if (j.location) { <span class="inline-flex items-center gap-1"><lucide-icon [img]="PinIcon" [size]="12" /> {{ j.location }}</span> }
                  @if (j.remoteType !== 'unknown') { <span class="badge-neutral capitalize">{{ j.remoteType }}</span> }
                  @if (j.salary) { <span class="text-success-600 dark:text-success-400 font-medium">{{ j.salary }}</span> }
                  <span class="badge-neutral">{{ sourceLabel(j.source) }}</span>
                  @if (j.postedDate) { <span>· {{ j.postedDate }}</span> }
                </div>
                @if (j.requiredSkills.length) {
                  <div class="flex flex-wrap gap-1.5 mt-3">
                    @for (s of j.requiredSkills.slice(0, 8); track s) { <span class="text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-300">{{ s }}</span> }
                  </div>
                }
                <div class="flex items-center gap-2 mt-4">
                  <button class="btn-primary h-9 px-3 text-sm" (click)="apply(j)" [disabled]="applyingId() === j.id">
                    @if (applyingId() === j.id) { <lucide-icon [img]="Spinner" [size]="15" class="animate-spin" /> } @else { <lucide-icon [img]="CheckIcon" [size]="15" /> }
                    Track application
                  </button>
                  @if (j.applicationUrl) {
                    <a [href]="j.applicationUrl" target="_blank" rel="noopener" class="btn-secondary h-9 px-3 text-sm">Apply <lucide-icon [img]="ExternalIcon" [size]="14" /></a>
                  }
                </div>
              </div>
            </div>
          </div>
        }
      </div>
      <div class="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
        @if (hasMore()) { <span #sentinel class="inline-flex items-center gap-2"><lucide-icon [img]="Spinner" [size]="14" class="animate-spin" /> Loading more… ({{ items().length }} of {{ total() }})</span> }
        @else { <span>Showing all {{ total() }} job{{ total() === 1 ? '' : 's' }}</span> }
      </div>
    }

    <!-- Manual import modal -->
    @if (importOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" (click)="importOpen.set(false)"></div>
        <div class="relative card w-full max-w-lg p-5 shadow-pop animate-scale-in">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-slate-900 dark:text-white">Add a job manually</h2>
            <button class="btn-icon h-8 w-8" (click)="importOpen.set(false)"><lucide-icon [img]="XIcon" [size]="16" /></button>
          </div>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="label">Title *</span><input class="input" [(ngModel)]="manual.title" placeholder="Software Engineer" /></label>
              <label class="block"><span class="label">Company</span><input class="input" [(ngModel)]="manual.company" placeholder="Acme" /></label>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="label">Location</span><input class="input" [(ngModel)]="manual.location" placeholder="Remote" /></label>
              <label class="block"><span class="label">Salary</span><input class="input" [(ngModel)]="manual.salary" placeholder="$120k–$150k" /></label>
            </div>
            <label class="block"><span class="label">Application URL</span><input class="input" [(ngModel)]="manual.applicationUrl" placeholder="https://…" /></label>
            <label class="block"><span class="label">Description / paste the JD</span><textarea class="input min-h-[120px] resize-y" [(ngModel)]="manual.description" placeholder="Paste the job description here — we'll pull out the skills."></textarea></label>
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button class="btn-secondary" (click)="importOpen.set(false)">Cancel</button>
            <button class="btn-primary" (click)="submitManual()" [disabled]="importing() || !manual.title.trim()">
              @if (importing()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Adding… } @else { <lucide-icon [img]="PlusIcon" [size]="16" /> Add job }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class Jobs implements OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  items = signal<Job[]>([]);
  total = signal(0);
  loading = signal(false);
  syncing = signal(false);
  applyingId = signal<string | null>(null);
  showFilters = signal(false);
  sources = signal<JobSourceMeta[]>([]);

  importOpen = signal(false);
  importing = signal(false);
  manual = { title: '', company: '', location: '', salary: '', applicationUrl: '', description: '' };

  f: any = { search: '', title: '', skills: '', company: '', location: '', remoteType: 'all', employmentType: 'all', datePosted: '', salaryMin: '', source: 'all', easyApply: false, visaSponsorship: false };

  private pageNum = 0;
  private readonly limit = 20;
  private reqSeq = 0;
  private searchTimer: any;
  private sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  hasMore = computed(() => this.items().length < this.total());
  activeFilterCount = computed(() => {
    let n = 0;
    for (const [k, v] of Object.entries(this.f)) {
      if (k === 'search') continue;
      if (v === true) n++;
      else if (typeof v === 'string' && v && v !== 'all') n++;
    }
    return n;
  });

  constructor() {
    this.api.getJobSources().subscribe((s) => this.sources.set(s));
    this.reload();
    effect((onCleanup) => {
      const el = this.sentinel()?.nativeElement;
      if (!el) return;
      const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) this.fetchNext(); }, { rootMargin: '400px' });
      io.observe(el);
      onCleanup(() => io.disconnect());
    });
  }
  ngOnDestroy() { clearTimeout(this.searchTimer); }

  private query(page: number) {
    return {
      page, limit: this.limit,
      search: this.f.search || undefined, title: this.f.title || undefined, skills: this.f.skills || undefined,
      company: this.f.company || undefined, location: this.f.location || undefined,
      remoteType: this.f.remoteType, employmentType: this.f.employmentType, datePosted: this.f.datePosted || undefined,
      salaryMin: this.f.salaryMin || undefined, source: this.f.source,
      easyApply: this.f.easyApply ? 'true' : undefined, visaSponsorship: this.f.visaSponsorship ? 'true' : undefined,
    };
  }

  reload() { this.fetchPage(1); }
  fetchNext() { if (!this.loading() && this.hasMore()) this.fetchPage(this.pageNum + 1); }

  private fetchPage(page: number) {
    if (this.loading() && page > 1) return;
    const seq = ++this.reqSeq;
    this.loading.set(true);
    this.api.searchJobs(this.query(page)).subscribe({
      next: ({ items, total }) => {
        if (seq !== this.reqSeq) return;
        this.pageNum = page;
        this.items.update((cur) => (page === 1 ? items : [...cur, ...items]));
        this.total.set(total);
        this.loading.set(false);
      },
      error: (e) => { if (seq !== this.reqSeq) return; this.loading.set(false); this.toast.error('Could not load jobs', e?.error?.message || 'Try again.'); },
    });
  }

  onSearch(v: string) { this.f.search = v; clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.reload(), 300); }
  setFilter(key: string, value: any) { this.f[key] = value; clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.reload(), 250); }
  clearFilters() {
    this.f = { search: this.f.search, title: '', skills: '', company: '', location: '', remoteType: 'all', employmentType: 'all', datePosted: '', salaryMin: '', source: 'all', easyApply: false, visaSponsorship: false };
    this.reload();
  }

  sync() {
    this.syncing.set(true);
    this.api.syncJobs({ search: this.f.search || undefined, limit: 50 }).subscribe({
      next: (r) => {
        this.syncing.set(false);
        this.toast.success('Jobs fetched', `${r.imported} role${r.imported === 1 ? '' : 's'} imported.`);
        this.reload();
      },
      error: (e) => { this.syncing.set(false); this.toast.error('Fetch failed', e?.error?.message || 'Could not reach the job sources.'); },
    });
  }

  toggleSave(j: Job) {
    const next = !j.saved;
    this.items.update((l) => l.map((x) => (x.id === j.id ? { ...x, saved: next } : x)));
    const call = next ? this.api.saveJob(j.id, { favorite: false }) : this.api.unsaveJob(j.id);
    call.subscribe({ error: () => this.items.update((l) => l.map((x) => (x.id === j.id ? { ...x, saved: !next } : x))) });
  }

  apply(j: Job) {
    this.applyingId.set(j.id);
    this.api.applyJob({ jobId: j.id, status: 'saved' }).subscribe({
      next: () => { this.applyingId.set(null); this.toast.success('Added to tracker', j.title); },
      error: (e) => { this.applyingId.set(null); this.toast.error('Could not add', e?.error?.message || (e?.status === 409 ? 'Already in your tracker.' : 'Try again.')); },
    });
  }

  submitManual() {
    if (!this.manual.title.trim()) return;
    this.importing.set(true);
    this.api.importJob(this.manual).subscribe({
      next: () => {
        this.importing.set(false); this.importOpen.set(false);
        this.manual = { title: '', company: '', location: '', salary: '', applicationUrl: '', description: '' };
        this.toast.success('Job added', 'It’s now in your search results.');
        this.reload();
      },
      error: (e) => { this.importing.set(false); this.toast.error('Could not add job', e?.error?.message || 'Try again.'); },
    });
  }

  sourceLabel(id: string) { return this.sources().find((s) => s.id === id)?.name || (id === 'manual' ? 'Manual' : id); }

  readonly SearchIcon = Search; readonly FilterIcon = SlidersHorizontal; readonly RefreshIcon = RefreshCw;
  readonly PlusIcon = Plus; readonly StarIcon = Star; readonly PinIcon = MapPin; readonly BriefcaseIcon = Briefcase;
  readonly ExternalIcon = ExternalLink; readonly Spinner = Loader2; readonly XIcon = X; readonly CheckIcon = Check;
  readonly CompanyIcon = Building2; readonly SparkIcon = Sparkles;
}
