import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Copy, Trash2, Pencil, ArrowRight, LayoutTemplate, FileText, Eye, X, Save, Loader2 } from 'lucide-angular';
import { DataService } from '../core/data.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { EmailTemplate, TemplateInput } from '../core/models';
import { PageHeader } from '../shared/page-header';
import { EmptyState } from '../shared/empty-state';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [LucideAngularModule, FormsModule, PageHeader, EmptyState],
  template: `
    <app-page-header title="Templates" subtitle="Reusable email templates with personalization variables.">
      <button class="btn-primary" (click)="openNew()"><lucide-icon [img]="Plus" [size]="16" /> New Template</button>
    </app-page-header>

    @if (!data.loaded()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        @for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton h-64 w-full rounded-2xl"></div> }
      </div>
    } @else if (data.templates().length === 0) {
      <div class="card">
        <app-empty-state title="No templates yet" subtitle="Create reusable templates to send campaigns faster." [icon]="Tmpl">
          <button class="btn-primary" (click)="openNew()"><lucide-icon [img]="Plus" [size]="16" /> Create template</button>
        </app-empty-state>
      </div>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        @for (t of data.templates(); track t.id) {
          <div class="card card-hover p-0 overflow-hidden group flex flex-col">
            <!-- preview -->
            <button class="relative h-36 p-4 overflow-hidden text-left w-full" [class]="tint(t.accent)" (click)="openPreview(t)">
              <div class="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:14px_14px]"></div>
              <div class="relative">
                <span class="badge bg-white/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 mb-2">{{ t.category }}</span>
                <p class="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-1">{{ t.subject }}</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-3 whitespace-pre-line leading-relaxed">{{ plain(t.body) }}</p>
              </div>
            </button>
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
                <button class="btn-icon h-8 w-8" title="Preview" (click)="openPreview(t)"><lucide-icon [img]="EyeIcon" [size]="15" /></button>
                <button class="btn-icon h-8 w-8" title="Edit" (click)="openEdit(t)"><lucide-icon [img]="EditIcon" [size]="15" /></button>
                <button class="btn-icon h-8 w-8" title="Duplicate" (click)="duplicate(t.id)"><lucide-icon [img]="CopyIcon" [size]="15" /></button>
                <button class="btn-icon h-8 w-8 hover:text-red-500" title="Delete" (click)="remove(t.id, t.name)"><lucide-icon [img]="TrashIcon" [size]="15" /></button>
                <button class="btn-primary ml-auto h-8 px-3 text-xs" (click)="use(t)">Use <lucide-icon [img]="ArrowIcon" [size]="14" /></button>
              </div>
            </div>
          </div>
        }
      </div>
    }

    <!-- ---------- Editor modal ---------- -->
    @if (editorOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" (click)="editorOpen.set(false)"></div>
        <div class="relative card w-full max-w-2xl p-0 shadow-pop animate-scale-in flex flex-col max-h-[90vh]">
          <div class="flex items-center justify-between px-5 h-14 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h2 class="font-semibold text-slate-900 dark:text-white">{{ editingId() ? 'Edit template' : 'New template' }}</h2>
            <button class="btn-icon h-8 w-8" (click)="editorOpen.set(false)"><lucide-icon [img]="XIcon" [size]="16" /></button>
          </div>

          <div class="overflow-y-auto p-5 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="label">Template name</label>
                <input class="input" placeholder="Cold outreach — SaaS" [(ngModel)]="form.name" />
              </div>
              <div>
                <label class="label">Category</label>
                <input class="input" list="tplCategories" placeholder="Outreach" [(ngModel)]="form.category" />
                <datalist id="tplCategories">@for (c of categories(); track c) { <option [value]="c"></option> }</datalist>
              </div>
            </div>

            <div>
              <label class="label">Accent</label>
              <div class="flex items-center gap-2">
                @for (a of accents; track a.key) {
                  <button type="button" class="h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 transition-transform hover:scale-110"
                          [style.background]="a.dot"
                          [class]="form.accent === a.key ? 'ring-slate-400 dark:ring-slate-500' : 'ring-transparent'"
                          (click)="form.accent = a.key" [title]="a.key"></button>
                }
              </div>
            </div>

            <div>
              <label class="label">Subject</label>
              <input class="input" placeholder="Quick idea for {{ '{{' }}company{{ '}}' }}" [(ngModel)]="form.subject" />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="label mb-0">Body</label>
                <span class="text-xs text-slate-400">Click a variable to insert</span>
              </div>
              <div class="flex flex-wrap gap-1.5 mb-2">
                @for (v of variables; track v) {
                  <button type="button" class="px-2 py-0.5 rounded-md text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-300 hover:bg-brand-500/20 transition-colors"
                          (click)="insertVar(v)">{{ '{{' }}{{ v }}{{ '}}' }}</button>
                }
              </div>
              <textarea #bodyArea class="input min-h-[200px] resize-y font-mono text-[13px] leading-relaxed"
                        placeholder="Hi {{ '{{' }}firstName{{ '}}' }},&#10;&#10;I noticed {{ '{{' }}company{{ '}}' }} is…" [(ngModel)]="form.body"></textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button class="btn-secondary" (click)="editorOpen.set(false)">Cancel</button>
            <button class="btn-primary" (click)="save()" [disabled]="saving()">
              @if (saving()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Saving… }
              @else { <lucide-icon [img]="SaveIcon" [size]="16" /> {{ editingId() ? 'Save changes' : 'Create template' }} }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ---------- Preview modal ---------- -->
    @if (previewT(); as p) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" (click)="previewT.set(null)"></div>
        <div class="relative card w-full max-w-lg p-0 shadow-pop animate-scale-in flex flex-col max-h-[85vh]">
          <div class="flex items-center justify-between px-5 h-14 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div class="min-w-0">
              <h2 class="font-semibold text-slate-900 dark:text-white truncate">{{ p.name }}</h2>
              <p class="text-xs text-slate-400">{{ p.category }}</p>
            </div>
            <button class="btn-icon h-8 w-8" (click)="previewT.set(null)"><lucide-icon [img]="XIcon" [size]="16" /></button>
          </div>
          <div class="overflow-y-auto p-5">
            <p class="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Subject</p>
            <p class="text-sm font-medium text-slate-900 dark:text-white mb-4">{{ p.subject }}</p>
            <p class="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Body</p>
            <div class="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">{{ plain(p.body) }}</div>
          </div>
          <div class="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button class="btn-secondary" (click)="openEdit(p); previewT.set(null)"><lucide-icon [img]="EditIcon" [size]="15" /> Edit</button>
            <button class="btn-primary" (click)="use(p)">Use template <lucide-icon [img]="ArrowIcon" [size]="15" /></button>
          </div>
        </div>
      </div>
    }
  `,
})
export class Templates {
  data = inject(DataService);
  private confirm = inject(ConfirmService);
  private router = inject(Router);
  toast = inject(ToastService);

  readonly accents = [
    { key: 'brand', dot: '#6366f1' },
    { key: 'violet', dot: '#8b5cf6' },
    { key: 'emerald', dot: '#10b981' },
    { key: 'amber', dot: '#f59e0b' },
    { key: 'rose', dot: '#f43f5e' },
    { key: 'cyan', dot: '#06b6d4' },
  ];
  readonly variables = ['firstName', 'lastName', 'company', 'position', 'email'];

  // Editor state
  editorOpen = signal(false);
  editingId = signal<string | null>(null);
  saving = signal(false);
  form: TemplateInput = { name: '', category: 'General', subject: '', body: '', accent: 'brand' };

  // Preview state
  previewT = signal<EmailTemplate | null>(null);

  categories = () => Array.from(new Set(this.data.templates().map((t) => t.category).filter(Boolean)));

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

  // Strip any stored HTML for plain-text previews.
  plain(body: string) { return (body || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim(); }

  openNew() {
    this.editingId.set(null);
    this.form = { name: '', category: 'General', subject: '', body: '', accent: 'brand' };
    this.editorOpen.set(true);
  }
  openEdit(t: EmailTemplate) {
    this.editingId.set(t.id);
    this.form = { name: t.name, category: t.category || 'General', subject: t.subject, body: this.plain(t.body), accent: t.accent || 'brand' };
    this.editorOpen.set(true);
  }
  openPreview(t: EmailTemplate) { this.previewT.set(t); }

  insertVar(v: string) { this.form.body = `${this.form.body || ''}{{${v}}}`; }

  save() {
    const name = this.form.name.trim();
    const subject = this.form.subject.trim();
    const body = this.form.body.trim();
    if (!name) { this.toast.error('Name required', 'Give your template a name.'); return; }
    if (!subject) { this.toast.error('Subject required', 'Add a subject line.'); return; }
    if (!body) { this.toast.error('Body required', 'Write the email body.'); return; }
    const payload: TemplateInput = { name, subject, body, category: this.form.category.trim() || 'General', accent: this.form.accent };
    this.saving.set(true);
    const id = this.editingId();
    const req = id ? this.data.updateTemplate(id, payload) : this.data.createTemplate(payload);
    req.subscribe({
      next: () => { this.saving.set(false); this.editorOpen.set(false); this.toast.success(id ? 'Template saved' : 'Template created', name); },
      error: (e) => { this.saving.set(false); this.toast.error('Could not save template', e?.error?.message || 'Try again.'); },
    });
  }

  use(t: EmailTemplate) {
    this.previewT.set(null);
    this.router.navigate(['/compose'], { queryParams: { template: t.id } });
  }

  duplicate(id: string) { this.data.duplicateTemplate(id); this.toast.success('Template duplicated'); }
  async remove(id: string, name: string) {
    const ok = await this.confirm.ask({ title: 'Delete template?', message: `“${name}” will be permanently removed.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    this.data.deleteTemplate(id);
    this.toast.success('Template deleted');
  }

  readonly Plus = Plus; readonly CopyIcon = Copy; readonly TrashIcon = Trash2; readonly EditIcon = Pencil;
  readonly EyeIcon = Eye; readonly ArrowIcon = ArrowRight; readonly Tmpl = LayoutTemplate; readonly FileIcon = FileText;
  readonly XIcon = X; readonly SaveIcon = Save; readonly Spinner = Loader2;
}
