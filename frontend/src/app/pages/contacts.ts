import { Component, inject, signal, computed, effect, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, map, distinctUntilChanged } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Search, Upload, Trash2, Users, Loader2, Star, FolderPlus, ChevronDown, Check, Folder, X, Pencil, AlertTriangle, Copy, Send } from 'lucide-angular';
import { ApiService, ContactFilters, DeliveryFilter } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { parseContactsCsvRows, CsvContactRow } from '../core/csv-parser';
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

    <!-- CSV import preview: review the rows, then choose a group to save them into -->
    @if (previewOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" (click)="closePreview()"></div>
        <div class="relative card w-full max-w-3xl shadow-pop animate-scale-in flex flex-col max-h-[85vh]">
          <div class="flex items-start justify-between gap-3 p-5 pb-3">
            <div class="min-w-0">
              <h2 class="font-semibold text-slate-900 dark:text-white">Import contacts</h2>
              <p class="text-xs text-slate-400 truncate mt-0.5">
                {{ previewFile() }} · {{ previewRows().length }} row{{ previewRows().length === 1 ? '' : 's' }} found
              </p>
            </div>
            <button class="btn-icon h-8 w-8 shrink-0" (click)="closePreview()"><lucide-icon [img]="XIcon" [size]="16" /></button>
          </div>

          <!-- What the file contained -->
          <div class="flex flex-wrap items-center gap-2 px-5 pb-3 text-xs">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 font-medium tabular-nums">
              <lucide-icon [img]="CheckIcon" [size]="13" /> {{ countOf('new') }} new
            </span>
            @if (countOf('duplicate')) {
              <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 font-medium tabular-nums">
                <lucide-icon [img]="CopyIcon" [size]="13" /> {{ countOf('duplicate') }} duplicate in file
              </span>
            }
            @if (countOf('invalid')) {
              <span class="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 text-red-500 px-2.5 py-1 font-medium tabular-nums">
                <lucide-icon [img]="WarnIcon" [size]="13" /> {{ countOf('invalid') }} no valid email
              </span>
            }
          </div>

          <!-- Rows -->
          <div class="overflow-y-auto border-y border-slate-100 dark:border-slate-800 flex-1">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-white dark:bg-slate-900 z-10">
                <tr class="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th class="pl-5 pr-2 py-2.5 w-0">
                    <input type="checkbox" class="accent-brand-500 h-4 w-4 align-middle cursor-pointer"
                           [checked]="allRowsChecked()" [disabled]="!importableCount() && !checkedCount()"
                           (change)="toggleAllRows()" title="Select all importable rows" />
                  </th>
                  <th class="px-4 py-2.5">Name</th>
                  <th class="px-4 py-2.5">Email</th>
                  <th class="px-4 py-2.5">Company</th>
                  <th class="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @for (r of previewRows(); track r.line) {
                  <tr [class]="r.status === 'invalid' ? 'opacity-50' : r.include ? '' : 'opacity-60'">
                    <td class="pl-5 pr-2 py-2.5 w-0">
                      <input type="checkbox" class="accent-brand-500 h-4 w-4 align-middle"
                             [class]="r.status === 'invalid' ? 'cursor-not-allowed' : 'cursor-pointer'"
                             [checked]="r.include" [disabled]="r.status === 'invalid'" (change)="toggleRow(r.line)"
                             [title]="r.status === 'invalid' ? 'No valid email, cannot import' : 'Include this contact'" />
                    </td>
                    <td class="px-4 py-2.5 text-slate-900 dark:text-slate-100 truncate max-w-[180px]">{{ r.name || '—' }}</td>
                    <td class="px-4 py-2.5 text-slate-500 truncate max-w-[200px]">{{ r.email || '—' }}</td>
                    <td class="px-4 py-2.5 text-slate-500 truncate max-w-[140px]">{{ r.company || '—' }}</td>
                    <td class="px-4 py-2.5 whitespace-nowrap">
                      @switch (r.status) {
                        @case ('new') { <span class="text-xs text-emerald-600 dark:text-emerald-400">New</span> }
                        @case ('duplicate') { <span class="text-xs text-amber-600 dark:text-amber-400" title="This email appears earlier in the file">Duplicate</span> }
                        @case ('invalid') { <span class="text-xs text-red-500" [title]="'Line ' + r.line + ' has no valid email address'">Invalid</span> }
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Group + confirm -->
          <div class="p-5 pt-4 space-y-3">
            <div>
              <label class="label">Save to group <span class="text-slate-400 font-normal">(optional)</span></label>
              <input class="input" list="importGroupList" placeholder="New or existing group name…"
                     [ngModel]="importGroup()" (ngModelChange)="importGroup.set($event)" (keyup.enter)="runImport()" />
              <datalist id="importGroupList">@for (g of groups(); track g.name) { <option [value]="g.name"></option> }</datalist>
              <p class="text-xs text-slate-400 mt-1.5">
                @if (importGroup().trim()) { Every imported contact is added to “{{ importGroup().trim() }}”. }
                @else { Leave blank to import without a group. }
              </p>
            </div>
            <div class="flex justify-end gap-2">
              <button class="btn-secondary" (click)="closePreview()" [disabled]="importing()">Cancel</button>
              <button class="btn-primary" (click)="runImport()" [disabled]="importing() || !importableCount()">
                @if (importing()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Importing… }
                @else {
                  <lucide-icon [img]="UploadIcon" [size]="16" />
                  Import {{ importableCount() }} contact{{ importableCount() === 1 ? '' : 's' }}
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px]">
        <lucide-icon [img]="SearchIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input class="input pl-10" placeholder="Search contacts…" [ngModel]="query()" (ngModelChange)="onSearch($event)" />
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
      <div class="relative shrink-0">
        <button type="button" class="input w-auto py-2 pr-2.5 flex items-center gap-2 min-w-[160px] justify-between" (click)="deliveryMenuOpen.set(!deliveryMenuOpen())" title="Filter by send outcome">
          <span class="flex items-center gap-1.5 truncate">
            <lucide-icon [img]="SendIcon" [size]="14" class="text-slate-400 shrink-0" />
            {{ deliveryLabel() }}
          </span>
          <lucide-icon [img]="ChevronDown" [size]="15" class="text-slate-400 shrink-0 transition-transform" [class.rotate-180]="deliveryMenuOpen()" />
        </button>
        @if (deliveryMenuOpen()) {
          <div class="fixed inset-0 z-40" (click)="deliveryMenuOpen.set(false)"></div>
          <div class="absolute right-0 mt-2 w-64 card p-1.5 shadow-pop z-50 animate-scale-in origin-top-right">
            @for (d of DELIVERY_OPTIONS; track d.value) {
              <button [class]="rowClass(delivery() === d.value)" (click)="pickDelivery(d.value)">
                <span class="flex flex-col items-start gap-0.5 truncate">
                  <span class="truncate">{{ d.label }}</span>
                  <span class="text-xs text-slate-400 font-normal truncate">{{ d.hint }}</span>
                </span>
                @if (delivery() === d.value) { <lucide-icon [img]="CheckIcon" [size]="15" class="shrink-0 text-brand-500" /> }
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

    <!-- Selection toolbar (bulk group / bulk delete) -->
    @if (selected().size > 0 || selectAllMatching()) {
      <div class="card p-3 mb-4 flex flex-wrap items-center gap-3 animate-slide-up border-brand-500/40 dark:border-brand-500/40">
        <span class="text-sm font-medium text-slate-700 dark:text-slate-200 px-1 shrink-0">
          @if (selectAllMatching()) {
            <!-- Every contact matching the filters is targeted, not just the loaded rows -->
            All {{ targetCount() }} matching selected
          } @else {
            {{ targetCount() }} selected
          }
        </span>
        <div class="flex items-center gap-2 flex-1 min-w-[220px]">
          <input class="input py-2 flex-1" list="groupList" placeholder="New or existing group name…" [ngModel]="groupName()" (ngModelChange)="groupName.set($event)"
                 (keyup.enter)="applyGroup('add')" />
          <datalist id="groupList">@for (g of groups(); track g.name) { <option [value]="g.name"></option> }</datalist>
          <button class="btn-primary shrink-0" (click)="applyGroup('add')" [disabled]="!groupName().trim() || savingGroup() || deleting()">
            @if (savingGroup()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> } @else { <lucide-icon [img]="FolderPlus" [size]="16" /> }
            Add to group
          </button>
        </div>
        <button class="btn-secondary shrink-0 text-red-500 hover:bg-red-500/10 hover:border-red-500/40" (click)="deleteSelected()" [disabled]="deleting() || savingGroup()">
          @if (deleting()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> } @else { <lucide-icon [img]="TrashIcon" [size]="16" /> }
          Delete {{ targetCount() }}
        </button>
        <button class="btn-secondary shrink-0" (click)="clearSelection()" [disabled]="deleting() || savingGroup()">Clear</button>
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
                  <input type="checkbox" class="accent-brand-500 h-4 w-4 align-middle cursor-pointer" [checked]="headerChecked()" (change)="toggleAll()"
                         [title]="'Select all ' + total() + ' matching'" />
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

  // Send outcome, resolved server-side from email history
  delivery = signal<DeliveryFilter>('all');
  deliveryMenuOpen = signal(false);
  readonly DELIVERY_OPTIONS: { value: DeliveryFilter; label: string; hint: string }[] = [
    { value: 'all', label: 'Any send status', hint: 'No delivery filter' },
    { value: 'failed', label: 'Bounced or failed', hint: 'Never reached the inbox' },
    { value: 'sent', label: 'Delivered', hint: 'Reached the inbox at least once' },
    { value: 'never', label: 'Never emailed', hint: 'No send history yet' },
  ];
  deliveryLabel = computed(() => this.DELIVERY_OPTIONS.find((d) => d.value === this.delivery())!.label);

  // Selection + grouping
  selected = signal<Set<string>>(new Set());
  // True once the user escalates from "the loaded rows" to "everything matching
  // the filters", delete then runs server-side against those filters.
  selectAllMatching = signal(false);
  deleting = signal(false);
  groupName = signal('');
  savingGroup = signal(false);

  // CSV import preview
  importing = signal(false);
  previewOpen = signal(false);
  previewFile = signal('');
  previewRows = signal<(CsvContactRow & { include: boolean })[]>([]);
  importGroup = signal('');

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
  isFiltered = computed(() => !!this.query().trim() || this.favOnly() || this.groupFilter() !== 'all' || this.delivery() !== 'all');

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

  /** The active filters, sent with the list request and with "delete all matching". */
  private activeFilters(): ContactFilters {
    return {
      search: this.query().trim() || undefined,
      favorite: this.favOnly() ? 'true' : undefined,
      group: this.groupFilter() !== 'all' ? this.groupFilter() : undefined,
      delivery: this.delivery() !== 'all' ? this.delivery() : undefined,
    };
  }

  private queryParams() {
    return { page: this.pageNum + 1, limit: this.limit, ...this.activeFilters() };
  }

  // Monotonic request id, responses that aren't the latest are discarded so
  // overlapping reloads (e.g. fast filter/search changes) can't corrupt state.
  private reqSeq = 0;

  // Reset and load the first page (on filter/search change). Keeps existing rows
  // visible until the new page arrives to avoid an empty-skeleton flash.
  reload() {
    // Filters changed, so any "all matching" target is stale, never carry it over.
    this.selected.set(new Set());
    this.selectAllMatching.set(false);
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
  pickDelivery(v: DeliveryFilter) {
    this.deliveryMenuOpen.set(false);
    if (v === this.delivery()) return;
    this.delivery.set(v);
    this.reload();
  }
  rowClass(active: boolean) {
    const base = 'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors';
    return active
      ? `${base} bg-brand-500/10 text-brand-600 dark:text-brand-300 font-medium`
      : `${base} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]`;
  }
  toggleFav() { this.favOnly.set(!this.favOnly()); this.reload(); }
  clearFilters() {
    this.query.set('');
    this.favOnly.set(false);
    this.groupFilter.set('all');
    this.delivery.set('all');
    this.reload();
  }

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
  /**
   * The header checkbox means "all of them", not "the ones that happen to be
   * loaded": with 209 matching but only 30 paged in, it targets all 209 and the
   * bulk actions run server-side against the filters.
   */
  toggleAll() {
    if (this.headerChecked()) { this.clearSelection(); return; }
    this.selected.set(new Set(this.items().map((c) => c.id)));
    // Only an escalation when more match than are loaded; otherwise the ids cover it.
    this.selectAllMatching.set(this.total() > this.items().length);
  }
  clearSelection() { this.selected.set(new Set()); this.groupName.set(''); this.selectAllMatching.set(false); }

  headerChecked = computed(() => this.selectAllMatching() || this.allSelected());
  /** How many contacts the bulk actions will actually touch. */
  targetCount = computed(() => (this.selectAllMatching() ? this.total() : this.selected().size));

  /**
   * Delete the ticked rows, or, after "Select all N matching", every contact
   * matching the current filters, which is resolved server-side so it isn't
   * capped by what has been paged in.
   */
  async deleteSelected() {
    const all = this.selectAllMatching();
    const ids = [...this.selected()];
    const count = this.targetCount();
    if (count === 0) return;

    const scope = all && this.isFiltered() ? ' matching the current filters' : '';
    const ok = await this.confirm.ask({
      title: `Delete ${count} contact${count === 1 ? '' : 's'}?`,
      message: `${count} contact${count === 1 ? '' : 's'}${scope} will be permanently removed. This cannot be undone.`,
      confirmText: `Delete ${count}`,
      danger: true,
    });
    if (!ok) return;

    this.deleting.set(true);
    const body = all ? { all: true, filters: this.activeFilters() } : { contactIds: ids };
    this.api.bulkDeleteContacts(body).subscribe({
      next: (r) => {
        this.deleting.set(false);
        this.clearSelection();
        this.toast.success(`Deleted ${r.deleted} contact${r.deleted === 1 ? '' : 's'}`);
        this.reload();
        this.loadGroups(); // group counts shift when their members go
      },
      error: (e) => {
        this.deleting.set(false);
        this.toast.error('Could not delete contacts', e?.error?.message || 'Try again.');
      },
    });
  }

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
    const all = this.selectAllMatching();
    const ids = [...this.selected()];
    if (!name || (!all && ids.length === 0)) return;
    this.savingGroup.set(true);
    const body = all ? { all: true, filters: this.activeFilters(), group: name, action } : { contactIds: ids, group: name, action };
    this.api.bulkGroupContacts(body).subscribe({
      next: (r) => {
        this.savingGroup.set(false);
        this.toast.success(action === 'remove' ? `Removed from “${name}”` : `Added to “${name}”`, `${r.modified} contact${r.modified === 1 ? '' : 's'} updated.`);
        // Rows beyond the loaded page changed too, so re-fetch rather than patch.
        if (all) { this.clearSelection(); this.reload(); }
        else { this.patchGroups(ids, name, action); this.clearSelection(); }
        this.loadGroups();
      },
      error: (e) => { this.savingGroup.set(false); this.toast.error('Could not update group', e?.error?.message || 'Try again.'); },
    });
  }

  removeFromGroup(id: string, group: string) {
    this.api.bulkGroupContacts({ contactIds: [id], group, action: 'remove' }).subscribe({
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

  // ---- CSV import (preview → pick group → save) ----

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
      const parsed = parseContactsCsvRows(String(reader.result));
      if (parsed.every((r) => r.status === 'invalid')) {
        this.toast.error('No emails found', 'Make sure the file has an Email column.');
        return;
      }
      this.previewRows.set(parsed.map((r) => ({
        ...r,
        // A contact needs a name; fall back to the email's local part so the
        // preview shows exactly what will be saved.
        name: r.status === 'invalid' ? r.name : r.name.trim() || r.email.split('@')[0],
        include: r.status === 'new', // duplicates and invalid rows are opt-in / blocked
      })));
      this.previewFile.set(file.name);
      this.importGroup.set(this.groupFilter() === 'all' ? '' : this.groupFilter());
      this.previewOpen.set(true);
    };
    reader.readAsText(file);
  }

  countOf(status: CsvContactRow['status']) { return this.previewRows().filter((r) => r.status === status).length; }
  checkedCount = computed(() => this.previewRows().filter((r) => r.include).length);
  importableCount = computed(() => this.previewRows().filter((r) => r.include && r.status !== 'invalid').length);
  allRowsChecked = computed(() => {
    const rows = this.previewRows().filter((r) => r.status !== 'invalid');
    return rows.length > 0 && rows.every((r) => r.include);
  });

  toggleRow(line: number) {
    this.previewRows.update((rows) => rows.map((r) =>
      r.line === line && r.status !== 'invalid' ? { ...r, include: !r.include } : r));
  }
  toggleAllRows() {
    const on = !this.allRowsChecked();
    this.previewRows.update((rows) => rows.map((r) => (r.status === 'invalid' ? r : { ...r, include: on })));
  }
  closePreview() {
    if (this.importing()) return;
    this.previewOpen.set(false);
    this.previewRows.set([]);
    this.importGroup.set('');
  }

  runImport() {
    const rows = this.previewRows().filter((r) => r.include && r.status !== 'invalid');
    if (rows.length === 0) return;
    const group = this.importGroup().trim();
    const payload = rows.map((r) => ({ name: r.name, email: r.email, company: r.company, position: r.position }));
    this.importing.set(true);
    this.api.importContacts(payload, group ? [group] : []).subscribe({
      next: (r) => {
        this.importing.set(false);
        this.previewOpen.set(false);
        this.previewRows.set([]);
        this.importGroup.set('');
        const detail = `${r.inserted} added, ${r.updated} updated${group ? ` · saved to “${group}”` : ''}.`;
        this.toast.success('Contacts imported', detail);
        this.reload();
        this.loadGroups();
      },
      error: (e) => { this.importing.set(false); this.toast.error('Import failed', e?.error?.message || 'Could not import contacts.'); },
    });
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
  readonly WarnIcon = AlertTriangle; readonly CopyIcon = Copy; readonly SendIcon = Send;
}
