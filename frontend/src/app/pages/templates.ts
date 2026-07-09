import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Plus, Copy, Trash2, Pencil, ArrowRight, LayoutTemplate, FileText } from 'lucide-angular';
import { DataService } from '../core/data.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { PageHeader } from '../shared/page-header';
import { EmptyState } from '../shared/empty-state';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, PageHeader, EmptyState],
  template: `
    <app-page-header title="Templates" subtitle="Reusable email templates with personalization variables.">
      <button class="btn-primary" (click)="toast.info('New template', 'Template editor coming up.')"><lucide-icon [img]="Plus" [size]="16" /> New Template</button>
    </app-page-header>

    @if (!data.loaded()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        @for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton h-64 w-full rounded-2xl"></div> }
      </div>
    } @else if (data.templates().length === 0) {
      <div class="card">
        <app-empty-state title="No templates yet" subtitle="Create reusable templates to send campaigns faster." [icon]="Tmpl">
          <button class="btn-primary"><lucide-icon [img]="Plus" [size]="16" /> Create template</button>
        </app-empty-state>
      </div>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        @for (t of data.templates(); track t.id) {
          <div class="card card-hover p-0 overflow-hidden group flex flex-col">
            <!-- preview -->
            <div class="relative h-36 p-4 overflow-hidden" [class]="tint(t.accent)">
              <div class="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:14px_14px]"></div>
              <div class="relative">
                <span class="badge bg-white/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 mb-2">{{ t.category }}</span>
                <p class="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-1">{{ t.subject }}</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-3 whitespace-pre-line leading-relaxed">{{ t.body }}</p>
              </div>
            </div>
            <!-- meta -->
            <div class="p-4 flex-1 flex flex-col">
              <div class="flex items-center gap-2">
                <div class="h-8 w-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
                  <lucide-icon [img]="FileIcon" [size]="15" class="text-brand-500" />
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-slate-900 dark:text-white truncate">{{ t.name }}</h3>
                  <p class="text-xs text-slate-400">{{ t.uses }} uses · edited {{ t.updatedAt }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button class="btn-icon h-8 w-8" title="Preview" (click)="toast.info('Preview', t.name)"><lucide-icon [img]="EyeIcon" [size]="15" /></button>
                <button class="btn-icon h-8 w-8" title="Edit" (click)="toast.info('Edit', t.name)"><lucide-icon [img]="EditIcon" [size]="15" /></button>
                <button class="btn-icon h-8 w-8" title="Duplicate" (click)="duplicate(t.id)"><lucide-icon [img]="CopyIcon" [size]="15" /></button>
                <button class="btn-icon h-8 w-8 hover:text-red-500" title="Delete" (click)="remove(t.id, t.name)"><lucide-icon [img]="TrashIcon" [size]="15" /></button>
                <a routerLink="/compose" class="btn-primary ml-auto h-8 px-3 text-xs">Use <lucide-icon [img]="ArrowIcon" [size]="14" /></a>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class Templates {
  data = inject(DataService);
  private confirm = inject(ConfirmService);
  toast = inject(ToastService);

  tint(accent: string) {
    const map: Record<string, string> = {
      brand: 'bg-brand-50 dark:bg-brand-500/5 text-brand-600',
      violet: 'bg-violet-50 dark:bg-violet-500/5 text-violet-600',
      emerald: 'bg-success-50 dark:bg-success-500/5 text-success-600',
      amber: 'bg-amber-50 dark:bg-amber-500/5 text-amber-600',
      rose: 'bg-rose-50 dark:bg-rose-500/5 text-rose-600',
      cyan: 'bg-cyan-50 dark:bg-cyan-500/5 text-cyan-600',
    };
    return map[accent] ?? map['brand'];
  }

  duplicate(id: string) { this.data.duplicateTemplate(id); this.toast.success('Template duplicated'); }
  async remove(id: string, name: string) {
    const ok = await this.confirm.ask({ title: 'Delete template?', message: `“${name}” will be permanently removed.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    this.data.deleteTemplate(id);
    this.toast.success('Template deleted');
  }

  readonly Plus = Plus; readonly CopyIcon = Copy; readonly TrashIcon = Trash2; readonly EditIcon = Pencil;
  readonly EyeIcon = FileText; readonly ArrowIcon = ArrowRight; readonly Tmpl = LayoutTemplate; readonly FileIcon = FileText;
}
