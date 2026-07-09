import { Component, inject, signal, computed, effect, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, map, distinctUntilChanged } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Search, Upload, Trash2, Users, Loader2, Star, FolderPlus, ChevronDown, Check, Folder, X, Pencil } from 'lucide-angular';
import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { parseContactsCsv } from '../core/csv-parser';
import { Contact } from '../core/models';
import { PageHeader } from '../shared/page-header';
import { EmptyState } from '../shared/empty-state';
import { Avatar } from '../shared/avatar';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [LucideAngularModule, FormsModule, PageHeader, EmptyState, Avatar],
  template: `
    <app-page-header title="Contacts" [subtitle]="subtitle()">
      <input #csvInput type="file" accept=".csv" class="hidden" (change)="onCsvSelected($event)" />
      <button class="btn-secondary" (click)="csvInput.click()" [disabled]="importing()">
        @if (importing()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Importing… }
        @else { <lucide-icon [img]="UploadIcon" [size]="16" /> Import CSV }
      </button>
      <button class="btn-primary" (click)="openAdd()"><lucide-icon [img]="Plus" [size]="16" /> Add Contact</button>
    </app-page-header>

    <!-- Add / edit contact modal -->
    @if (addOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" (click)="addOpen.set(false)"></div>
        <div class="relative card w-full max-w-md p-5 shadow-pop animate-scale-in">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-slate-900 dark:text-white">{{ editingId() ? 'Edit contact' : 'Add contact' }}</h2>
            <button class="btn-icon h-8 w-8" (click)="addOpen.set(false)"><lucide-icon [img]="XIcon" [size]="16" /></button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="label">Full name</label>
              <input class="input" placeholder="Jane Doe" [(ngModel)]="newContact.name" (keyup.enter)="saveContact()" />
            </div>
            <div>
              <label class="label">Email</label>
              <input class="input" type="email" placeholder="jane@company.com" [(ngModel)]="newContact.email" (keyup.enter)="saveContact()" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Company <span class="text-slate-400 font-normal">(optional)</span></label>
                <input class="input" placeholder="Company" [(ngModel)]="newContact.company" (keyup.enter)="saveContact()" />
              </div>
              <div>
                <label class="label">Position <span class="text-slate-400 font-normal">(optional)</span></label>
                <input class="input" placeholder="Title" [(ngModel)]="newContact.position" (keyup.enter)="saveContact()" />
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button class="btn-secondary" (click)="addOpen.set(false)">Cancel</button>
            <button class="btn-primary" (click)="saveContact()" [disabled]="savingContact()">
              @if (savingContact()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Saving… }
              @else if (editingId()) { <lucide-icon [img]="CheckIcon" [size]="16" /> Save changes }
              @else { <lucide-icon [img]="Plus" [size]="16" /> Add contact }
            </button>
          </div>
        </div>
      </div>
    }

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px]">
        <lucide-icon [img]="SearchIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input class="input pl-9" placeholder="Search contacts…" [ngModel]="query()" (ngModelChange)="onSearch($event)" />
        @if (loading() && items().length) { <lucide-icon [img]="Spinner" [size]="15" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" /> }
      </div>
      <div class="relative shrink-0">
        <button type="button" class="input w-auto py-2 pr-2.5 flex items-center gap-2 min-w-[150px] justify-between" (click)="groupMenuOpen.set(!groupMenuOpen())" title="Filter by group">
          <span class="flex items-center gap-1.5 truncate">
            <lucide-icon [img]="FolderIcon" [size]="14" class="text-slate-400 shrink-0" />
            {{ groupFilter() === 'all' ? 'All groups' : groupFilter() }}
          </span>
          <lucide-icon [img]="ChevronDown" [size]="15" class="text-slate-400 shrink-0 transition-transform" [class.rotate-180]="groupMenuOpen()" />
        </button>
        @if (groupMenuOpen()) {
          <div class="fixed inset-0 z-40" (click)="groupMenuOpen.set(false)"></div>
          <div class="absolute right-0 mt-2 w-60 card p-1.5 shadow-pop z-50 animate-scale-in origin-top-right max-h-72 overflow-y-auto">
            <button [class]="rowClass(groupFilter() === 'all')" (click)="pickGroup('all')">
              <span class="flex items-center gap-2 truncate"><lucide-icon [img]="FolderIcon" [size]="15" /> All groups</span>
              @if (groupFilter() === 'all') { <lucide-icon [img]="CheckIcon" [size]="15" class="shrink-0 text-brand-500" /> }
            </button>
            @if (groups().length) { <div class="h-px bg-slate-100 dark:bg-slate-800 my-1"></div> }
            @for (g of groups(); track g.name) {
              <button [class]="rowClass(groupFilter() === g.name)" (click)="pickGroup(g.name)">
                <span class="flex items-center gap-2 truncate">{{ g.name }}
                  <span class="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-400 tabular-nums">{{ g.count }}</span>
                </span>
                @if (groupFilter() === g.name) { <lucide-icon [img]="CheckIcon" [size]="15" class="shrink-0 text-brand-500" /> }
              </button>
            }
          </div>
        }
      </div>
      <button class="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors"
              [class]="favOnly() ? 'bg-amber-500/15 text-amber-500 [&_svg]:fill-amber-400' : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 hover:text-amber-500'"
              (click)="toggleFav()" title="Show favorites only">
        <lucide-icon [img]="StarIcon" [size]="14" /> Favorites
      </button>
      <span class="badge-info shrink-0 tabular-nums">
        <lucide-icon [img]="UsersIcon" [size]="13" /> {{ total() }}
      </span>
    </div>

    <!-- Selection toolbar (bulk group) -->
    @if (selected().size > 0) {
      <div class="card p-3 mb-4 flex flex-wrap items-center gap-3 animate-slide-up border-brand-500/40 dark:border-brand-500/40">
        <span class="text-sm font-medium text-slate-700 dark:text-slate-200 px-1">{{ selected().size }} selected</span>
        <div class="flex items-center gap-2 flex-1 min-w-[220px]">
          <input class="input py-2 flex-1" list="groupList" placeholder="New or existing group name…" [ngModel]="groupName()" (ngModelChange)="groupName.set($event)"
                 (keyup.enter)="applyGroup('add')" />
          <datalist id="groupList">@for (g of groups(); track g.name) { <option [value]="g.name"></option> }</datalist>
          <button class="btn-primary shrink-0" (click)="applyGroup('add')" [disabled]="!groupName().trim() || savingGroup()">
            @if (savingGroup()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> } @else { <lucide-icon [img]="FolderPlus" [size]="16" /> }
            Add to group
          </button>
        </div>
        <button class="btn-secondary shrink-0" (click)="clearSelection()">Clear</button>
      </div>
    }

    @if (loading() && items().length === 0) {
      <div class="card p-5 space-y-3">
        @for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton h-12 w-full"></div> }
      </div>
    } @else if (total() === 0) {
      <div class="card">
        @if (isFiltered()) {
          <app-empty-state title="No matching contacts" subtitle="Try a different search, group or clear the filters." [icon]="SearchIcon">
            <button class="btn-secondary" (click)="clearFilters()">Clear filters</button>
          </app-empty-state>
        } @else {
          <app-empty-state title="No contacts added" subtitle="Add contacts or import a CSV to build your recipient lists." [icon]="UsersIcon">
            <button class="btn-primary" (click)="csvInput.click()"><lucide-icon [img]="UploadIcon" [size]="16" /> Import CSV</button>
          </app-empty-state>
        }
      </div>
    } @else {
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th class="pl-5 pr-2 py-3 w-0">
                  <input type="checkbox" class="accent-brand-500 h-4 w-4 align-middle cursor-pointer" [checked]="allSelected()" (change)="toggleAll()" title="Select all loaded" />
                </th>
                <th class="px-5 py-3">Name</th>
                <th class="px-5 py-3">Groups</th>
                <th class="px-5 py-3">Company</th>
                <th class="px-5 py-3">Added</th>
                <th class="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (c of items(); track c.id) {
                <tr class="transition-colors" [class]="selected().has(c.id) ? 'bg-brand-500/[0.06]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'">
                  <td class="pl-5 pr-2 py-3.5 w-0">
                    <input type="checkbox" class="accent-brand-500 h-4 w-4 align-middle cursor-pointer" [checked]="selected().has(c.id)" (change)="toggleSelect(c.id)" />
                  </td>
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-3">
                      <app-avatar [name]="c.name" [size]="34" [rounded]="0.5" />
                      <div class="min-w-0"><p class="font-medium text-slate-900 dark:text-slate-100 truncate">{{ c.name }}</p><p class="text-xs text-slate-400 truncate">{{ c.email }}</p></div>
                    </div>
                  </td>
                  <td class="px-5 py-3.5">
                    @if (c.groups.length) {
                      <div class="flex flex-wrap gap-1">
                        @for (g of c.groups; track g) {
                          <span class="inline-flex items-center gap-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 px-2 py-0.5 text-xs font-medium">
                            {{ g }}
                            <button class="opacity-50 hover:opacity-100 hover:text-red-500" (click)="removeFromGroup(c.id, g)" title="Remove from group">×</button>
                          </span>
                        }
                      </div>
                    } @else { <span class="text-slate-400 text-xs">—</span> }
                  </td>
                  <td class="px-5 py-3.5 text-slate-600 dark:text-slate-300">{{ c.company || '—' }}</td>
                  <td class="px-5 py-3.5 text-slate-500 whitespace-nowrap tabular-nums">{{ c.addedAt || '—' }}</td>
                  <td class="px-5 py-3.5 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button class="btn-icon h-8 w-8" (click)="toggleFavorite(c)" [title]="c.favorite ? 'Remove from favorites' : 'Add to favorites'"
                              [class]="c.favorite ? 'text-amber-400 [&_svg]:fill-amber-400 hover:text-amber-500' : 'hover:text-amber-500'">
                        <lucide-icon [img]="StarIcon" [size]="16" />
                      </button>
                      <button class="btn-icon h-8 w-8 hover:text-brand-500" (click)="openEdit(c)" title="Edit contact"><lucide-icon [img]="EditIcon" [size]="15" /></button>
                      <button class="btn-icon h-8 w-8 hover:text-red-500" (click)="remove(c.id, c.name)" title="Delete contact"><lucide-icon [img]="TrashIcon" [size]="15" /></button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <!-- Infinite-scroll sentinel + progress -->
        <div class="flex items-center justify-center gap-2 px-5 py-3.5 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
          @if (hasMore()) {
            <span #sentinel class="inline-flex items-center gap-2"><lucide-icon [img]="Spinner" [size]="14" class="animate-spin" /> Loading more… ({{ items().length }} of {{ total() }})</span>
          } @else {
            <span>Showing all {{ total() }} contact{{ total() === 1 ? '' : 's' }}</span>
          }
        </div>
      </div>
    }
  `,
})
export class Contacts implements OnDestroy {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);
  private route = inject(ActivatedRoute);
  toast = inject(ToastService);
  private routeSub?: Subscription;

  // Server-paginated state
  items = signal<Contact[]>([]);
  total = signal(0);
  loading = signal(false);
  private pageNum = 0;
  private readonly limit = 30;

  // Filters (all applied server-side)
  query = signal('');
  favOnly = signal(false);
  groupFilter = signal('all');
  groupMenuOpen = signal(false);
  groups = signal<{ name: string; count: number }[]>([]);

  // Selection + grouping
  selected = signal<Set<string>>(new Set());
  groupName = signal('');
  savingGroup = signal(false);
  importing = signal(false);

  private searchTimer: any;
  private sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  // Manual add / edit contact modal
  addOpen = signal(false);
  savingContact = signal(false);
  editingId = signal<string | null>(null);
  newContact = { name: '', email: '', company: '', position: '' };

  openAdd() { this.editingId.set(null); this.newContact = { name: '', email: '', company: '', position: '' }; this.addOpen.set(true); }
  openEdit(c: Contact) {
    this.editingId.set(c.id);
    this.newContact = { name: c.name || '', email: c.email || '', company: c.company || '', position: c.position || '' };
    this.addOpen.set(true);
  }
  saveContact() {
    const name = this.newContact.name.trim();
    const email = this.newContact.email.trim();
    if (!name) { this.toast.error('Name required', 'Enter the contact’s name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.toast.error('Invalid email', 'Enter a valid email address.'); return; }
    const body = { name, email, company: this.newContact.company.trim(), position: this.newContact.position.trim() };
    this.savingContact.set(true);
    const id = this.editingId();
    if (id) {
      this.api.updateContact(id, body).subscribe({
        next: () => {
          this.savingContact.set(false); this.addOpen.set(false);
          this.items.update((l) => l.map((x) => (x.id === id ? { ...x, ...body } : x)));
          this.toast.success('Contact updated', name);
        },
        error: (e) => { this.savingContact.set(false); this.toast.error('Could not update contact', e?.error?.message || (e?.status === 409 ? 'That email already exists.' : 'Try again.')); },
      });
    } else {
      this.api.createContact(body).subscribe({
        next: () => { this.savingContact.set(false); this.addOpen.set(false); this.toast.success('Contact added', name); this.reload(); },
        error: (e) => { this.savingContact.set(false); this.toast.error('Could not add contact', e?.error?.message || (e?.status === 409 ? 'That email already exists.' : 'Try again.')); },
      });
    }
  }

  hasMore = computed(() => this.items().length < this.total());
  isFiltered = computed(() => !!this.query().trim() || this.favOnly() || this.groupFilter() !== 'all');

  constructor() {
    this.loadGroups();
    // Prefill the search from a ?q= param (e.g. jumped here from the top-bar search).
    this.routeSub = this.route.queryParamMap
      .pipe(map((p) => (p.get('q') || '').trim()), distinctUntilChanged())
      .subscribe((q) => {
        this.query.set(q);
        this.reload();
      });
    // Infinite scroll: load the next page when the sentinel scrolls into view.
    effect((onCleanup) => {
      const el = this.sentinel()?.nativeElement;
      if (!el) return;
      const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) this.fetchNext(); }, { rootMargin: '400px' });
      io.observe(el);
      onCleanup(() => io.disconnect());
    });
  }

  ngOnDestroy() { clearTimeout(this.searchTimer); this.routeSub?.unsubscribe(); }

  private queryParams() {
    return {
      page: this.pageNum + 1,
      limit: this.limit,
      search: this.query().trim() || undefined,
      favorite: this.favOnly() ? 'true' : undefined,
      group: this.groupFilter() !== 'all' ? this.groupFilter() : undefined,
    };
  }

  // Monotonic request id — responses that aren't the latest are discarded so
  // overlapping reloads (e.g. fast filter/search changes) can't corrupt state.
  private reqSeq = 0;

  // Reset and load the first page (on filter/search change). Keeps existing rows
  // visible until the new page arrives to avoid an empty-skeleton flash.
  reload() {
    this.selected.set(new Set());
    this.fetchPage(1);
  }

  // Load the next page and append (infinite scroll).
  fetchNext() {
    if (this.loading()) return;
    if (!this.hasMore()) return;
    this.fetchPage(this.pageNum + 1);
  }

  private fetchPage(page: number) {
    // Ignore a duplicate in-flight request for the same page (scroll re-fires).
    if (this.loading() && page > 1) return;
    const seq = ++this.reqSeq;
    this.loading.set(true);
    this.api.listContactsPaged({ ...this.queryParams(), page }).subscribe({
      next: ({ items, total }) => {
        if (seq !== this.reqSeq) return; // a newer request superseded this one
        this.pageNum = page;
        this.items.update((cur) => (page === 1 ? items : [...cur, ...items]));
        this.total.set(total);
        this.loading.set(false);
      },
      error: (e) => {
        if (seq !== this.reqSeq) return;
        this.loading.set(false);
        this.toast.error('Could not load contacts', e?.error?.message || 'Try again.');
      },
    });
  }

  onSearch(v: string) {
    this.query.set(v);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.reload(), 300);
  }
  setGroupFilter(v: string) { this.groupFilter.set(v); this.reload(); }
  pickGroup(v: string) { this.groupMenuOpen.set(false); if (v !== this.groupFilter()) this.setGroupFilter(v); }
  rowClass(active: boolean) {
    const base = 'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors';
    return active
      ? `${base} bg-brand-500/10 text-brand-600 dark:text-brand-300 font-medium`
      : `${base} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]`;
  }
  toggleFav() { this.favOnly.set(!this.favOnly()); this.reload(); }
  clearFilters() { this.query.set(''); this.favOnly.set(false); this.groupFilter.set('all'); this.reload(); }

  loadGroups() { this.api.listContactGroups().subscribe((g) => this.groups.set(g)); }

  subtitle = computed(() => {
    const n = this.total();
    const grp = this.groups().length;
    if (n === 0 && !this.isFiltered()) return 'Your saved recipients and lead lists.';
    const bits = [`${n} contact${n === 1 ? '' : 's'}`];
    if (grp) bits.push(`${grp} group${grp === 1 ? '' : 's'}`);
    return bits.join(' · ') + '.';
  });

  // ---- selection (operates on loaded rows) ----
  allSelected = computed(() => {
    const f = this.items();
    return f.length > 0 && f.every((c) => this.selected().has(c.id));
  });
  toggleSelect(id: string) {
    const next = new Set(this.selected());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selected.set(next);
  }
  toggleAll() {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.items().map((c) => c.id)));
  }
  clearSelection() { this.selected.set(new Set()); this.groupName.set(''); }

  private patchGroups(ids: string[], name: string, action: 'add' | 'remove') {
    const set = new Set(ids);
    this.items.update((list) => list.map((c) => {
      if (!set.has(c.id)) return c;
      const groups = action === 'remove' ? c.groups.filter((g) => g !== name) : c.groups.includes(name) ? c.groups : [...c.groups, name];
      return { ...c, groups };
    }));
    // If viewing a specific group and we removed it, drop those rows.
    if (action === 'remove' && this.groupFilter() === name) {
      this.items.update((list) => list.filter((c) => !set.has(c.id)));
      this.total.update((t) => Math.max(0, t - ids.length));
    }
  }

  applyGroup(action: 'add' | 'remove') {
    const name = this.groupName().trim();
    const ids = [...this.selected()];
    if (!name || ids.length === 0) return;
    this.savingGroup.set(true);
    this.api.bulkGroupContacts(ids, name, action).subscribe({
      next: (r) => {
        this.savingGroup.set(false);
        this.toast.success(`Added to “${name}”`, `${r.modified} contact${r.modified === 1 ? '' : 's'} updated.`);
        this.patchGroups(ids, name, 'add');
        this.clearSelection();
        this.loadGroups();
      },
      error: (e) => { this.savingGroup.set(false); this.toast.error('Could not update group', e?.error?.message || 'Try again.'); },
    });
  }

  removeFromGroup(id: string, group: string) {
    this.api.bulkGroupContacts([id], group, 'remove').subscribe({
      next: () => { this.patchGroups([id], group, 'remove'); this.loadGroups(); },
      error: () => this.toast.error('Could not remove from group'),
    });
  }

  toggleFavorite(c: Contact) {
    const next = !c.favorite;
    this.items.update((l) => l.map((x) => (x.id === c.id ? { ...x, favorite: next } : x)));
    this.api.updateContact(c.id, { favorite: next }).subscribe({
      error: () => this.items.update((l) => l.map((x) => (x.id === c.id ? { ...x, favorite: !next } : x))),
    });
    if (this.favOnly() && !next) { // unfavorited while viewing favorites → drop it
      this.items.update((l) => l.filter((x) => x.id !== c.id));
      this.total.update((t) => Math.max(0, t - 1));
    }
  }

  onCsvSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      this.toast.error('Export as CSV first', 'In Excel/Google Sheets: File → Download → CSV, then import that file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseContactsCsv(String(reader.result));
      if (rows.length === 0) { this.toast.error('No emails found', 'Make sure the file has an Email column.'); return; }
      this.importing.set(true);
      this.api.importContacts(rows).subscribe({
        next: (r) => {
          this.importing.set(false);
          this.toast.success('Contacts imported', `${r.inserted} added, ${r.updated} updated.`);
          this.reload();
        },
        error: (e) => { this.importing.set(false); this.toast.error('Import failed', e?.error?.message || 'Could not import contacts.'); },
      });
    };
    reader.readAsText(file);
  }

  async remove(id: string, name: string) {
    const ok = await this.confirm.ask({ title: 'Delete contact?', message: `${name} will be removed from your contacts.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    this.items.update((l) => l.filter((c) => c.id !== id));
    this.total.update((t) => Math.max(0, t - 1));
    this.api.deleteContact(id).subscribe({ error: () => { this.toast.error('Delete failed'); this.reload(); } });
    this.toast.success('Contact deleted');
  }

  readonly Plus = Plus; readonly SearchIcon = Search; readonly UploadIcon = Upload;
  readonly TrashIcon = Trash2; readonly UsersIcon = Users; readonly Spinner = Loader2;
  readonly StarIcon = Star; readonly FolderPlus = FolderPlus;
  readonly ChevronDown = ChevronDown; readonly CheckIcon = Check; readonly FolderIcon = Folder; readonly XIcon = X; readonly EditIcon = Pencil;
}
