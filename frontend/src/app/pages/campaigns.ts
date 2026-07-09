import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Search, Megaphone, Trash2, Copy, Eye, MoreHorizontal, Send } from 'lucide-angular';
import { DataService } from '../core/data.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { PageHeader } from '../shared/page-header';
import { StatusBadge } from '../shared/status-badge';
import { EmptyState } from '../shared/empty-state';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, FormsModule, PageHeader, StatusBadge, EmptyState],
  template: `
    <app-page-header title="Campaigns" subtitle="Manage and track all your cold email campaigns.">
      <a routerLink="/compose" class="btn-primary"><lucide-icon [img]="Plus" [size]="16" /> New Campaign</a>
    </app-page-header>

    <!-- filter bar -->
    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <div class="relative flex-1">
        <lucide-icon [img]="SearchIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input class="input pl-9" placeholder="Search campaigns…" [ngModel]="query()" (ngModelChange)="query.set($event)" />
      </div>
      <div class="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 overflow-x-auto">
        @for (f of filters; track f) {
          <button class="px-3.5 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors capitalize"
                  [class]="filter() === f ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'"
                  (click)="filter.set(f)">{{ f }}</button>
        }
      </div>
    </div>

    @if (!data.loaded()) {
      <div class="card p-5 space-y-3">
        @for (i of [1,2,3,4,5]; track i) { <div class="skeleton h-12 w-full"></div> }
      </div>
    } @else if (filtered().length === 0) {
      <div class="card">
        <app-empty-state title="No campaigns found" subtitle="Try a different search, or create a new campaign to get started." [icon]="MegaphoneIcon">
          <a routerLink="/compose" class="btn-primary"><lucide-icon [img]="Plus" [size]="16" /> Create campaign</a>
        </app-empty-state>
      </div>
    } @else {
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th class="px-5 py-3">Campaign Name</th>
                <th class="px-5 py-3">Progress</th>
                <th class="px-5 py-3">Open Rate</th>
                <th class="px-5 py-3">Status</th>
                <th class="px-5 py-3">Created</th>
                <th class="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (c of filtered(); track c.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
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
                      <span class="text-xs tabular-nums text-slate-500 whitespace-nowrap">{{ c.sent }}/{{ c.total }}</span>
                    </div>
                  </td>
                  <td class="px-5 py-3.5 tabular-nums text-slate-600 dark:text-slate-300">{{ c.openRate ? c.openRate + '%' : '—' }}</td>
                  <td class="px-5 py-3.5"><app-status-badge [status]="c.status" /></td>
                  <td class="px-5 py-3.5 text-slate-500 whitespace-nowrap">{{ c.createdAt }}</td>
                  <td class="px-5 py-3.5">
                    <div class="flex items-center justify-end gap-1">
                      <a [routerLink]="['/compose']" [queryParams]="{ campaign: c.id }" class="btn-primary h-8 px-3 text-xs" title="Send / Resume">
                        <lucide-icon [img]="SendIcon" [size]="14" /> {{ c.sent >= c.total && c.total > 0 ? 'View' : (c.sent > 0 ? 'Resume' : 'Send') }}
                      </a>
                      <button class="btn-icon h-8 w-8 hover:text-red-500" title="Delete" (click)="remove(c.id, c.name)"><lucide-icon [img]="TrashIcon" [size]="15" /></button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class Campaigns {
  data = inject(DataService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  query = signal('');
  filter = signal('all');
  filters = ['all', 'sent', 'sending', 'scheduled', 'draft', 'failed'];

  filtered = computed(() => {
    const term = this.query().toLowerCase();
    return this.data.campaigns().filter((c) => {
      const matchF = this.filter() === 'all' || c.status === this.filter();
      const matchQ = c.name.toLowerCase().includes(term);
      return matchF && matchQ;
    });
  });

  pct(a: number, b: number) { return b === 0 ? 0 : Math.round((a / b) * 100); }

  async remove(id: string, name: string) {
    const ok = await this.confirm.ask({ title: 'Delete campaign?', message: `“${name}” will be permanently removed.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    this.data.deleteCampaign(id);
    this.toast.success('Campaign deleted');
  }

  readonly Plus = Plus; readonly SearchIcon = Search; readonly MegaphoneIcon = Megaphone;
  readonly TrashIcon = Trash2; readonly CopyIcon = Copy; readonly EyeIcon = Eye; readonly More = MoreHorizontal; readonly SendIcon = Send;
}
