import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, UserPlus, Trash2, Copy, Check, Users, Loader2 } from 'lucide-angular';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { ProfileService } from '../core/profile.service';
import { Organization, AddMemberResult } from '../core/models';
import { PageHeader } from '../shared/page-header';
import { Avatar } from '../shared/avatar';

/**
 * The workspace admin board.
 *
 * Owners and admins add people here; everyone else sees the roster read-only.
 * Permission is enforced on the server from the Membership row — this only
 * decides what is worth rendering.
 */
@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, PageHeader, Avatar],
  template: `
    <app-page-header title="Workspace" subtitle="Who can send from this account, and under whose name." />

    @if (loading()) {
      <div class="card p-8 text-center text-sm text-slate-500">Loading…</div>
    } @else if (org(); as o) {

      <!-- Identity -->
      <div class="card p-5 mb-4">
        <div class="flex flex-wrap items-end gap-4">
          <div class="flex-1 min-w-[220px]">
            <label class="label" for="org-name">Workspace name</label>
            <input id="org-name" class="input" [(ngModel)]="name" [disabled]="!canManage()" />
          </div>
          <div class="min-w-[180px]">
            <label class="label" for="org-slug">Sign-in name</label>
            <input id="org-slug" class="input font-mono text-sm" [value]="o.slug" readonly />
          </div>
          @if (canManage()) {
            <button class="btn-primary" (click)="saveName()" [disabled]="saving() || name.trim() === o.name">
              @if (saving()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> } @else { Save }
            </button>
          }
        </div>
        <p class="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
          Members type <span class="font-mono text-slate-700 dark:text-slate-300">{{ o.slug }}</span> in the Organization
          field when they sign in. Leaving it blank also works if they only belong to this one.
        </p>
      </div>

      <!-- Seats -->
      <div class="card p-5 mb-4">
        <div class="flex items-center gap-3">
          <lucide-icon [img]="UsersIcon" [size]="18" class="text-slate-400" />
          <div class="flex-1">
            <p class="text-sm font-medium text-slate-900 dark:text-white">{{ o.seatsUsed }} of {{ o.seatLimit }} seats used</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Everyone here sends through this workspace's mail settings.</p>
          </div>
          <div class="h-1.5 w-32 rounded-full bg-slate-100 dark:bg-white/[0.07] overflow-hidden">
            <div class="h-full rounded-full bg-brand-500 transition-all" [style.width.%]="seatPct()"></div>
          </div>
        </div>
      </div>

      <!-- Add -->
      @if (canManage()) {
        <div class="card p-5 mb-4">
          <p class="text-sm font-medium text-slate-900 dark:text-white mb-3">Add someone</p>
          <div class="flex flex-wrap gap-2.5">
            <input class="input flex-1 min-w-[220px]" type="email" placeholder="name@agency.com"
                   [(ngModel)]="email" (keyup.enter)="add()" [disabled]="adding()" />
            <select class="input w-36" [(ngModel)]="role" [disabled]="adding()">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button class="btn-primary" (click)="add()" [disabled]="adding() || !email.trim() || o.seatsUsed >= o.seatLimit">
              @if (adding()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> }
              @else { <lucide-icon [img]="UserPlusIcon" [size]="16" /> Add }
            </button>
          </div>

          @if (invite(); as inv) {
            <div class="mt-4 rounded-xl border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/[0.08] p-4">
              <p class="text-sm font-medium text-amber-900 dark:text-amber-200">
                {{ inv.emailed ? 'Invitation emailed.' : 'Member added — send them this link.' }}
              </p>
              <p class="mt-1 text-xs text-amber-800/80 dark:text-amber-200/70">
                {{ inv.emailed
                    ? 'They can also use this link directly. It works for 7 days.'
                    : 'Email is not configured on this server, so nothing was sent. The link works for 7 days.' }}
              </p>
              <div class="mt-2.5 flex gap-2">
                <input class="input flex-1 font-mono text-xs" [value]="inv.link" readonly />
                <button class="btn-secondary shrink-0" (click)="copy(inv.link)">
                  <lucide-icon [img]="copied() ? CheckIcon : CopyIcon" [size]="15" />
                  {{ copied() ? 'Copied' : 'Copy' }}
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Roster -->
      <div class="card overflow-hidden">
        <div class="px-5 py-3.5 border-b border-slate-100 dark:border-white/[0.06]">
          <p class="text-sm font-medium text-slate-900 dark:text-white">Members</p>
        </div>
        @for (m of o.members; track m.userId) {
          <div class="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 dark:border-white/[0.04] last:border-0">
            <app-avatar [name]="m.name || m.email" [size]="34" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-slate-900 dark:text-white truncate">
                {{ m.name || m.email }}
                @if (m.userId === meId()) { <span class="text-slate-400 font-normal">(you)</span> }
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ m.email }}</p>
            </div>
            @if (m.pending) { <span class="badge badge-warn">Invite pending</span> }
            <span class="badge" [class]="m.isOwner ? 'badge-info' : 'badge-neutral'">{{ m.isOwner ? 'Owner' : m.role }}</span>
            @if (canManage() && !m.isOwner && m.userId !== meId()) {
              <button class="btn-icon text-slate-400 hover:text-rose-500" (click)="remove(m.userId, m.email)" title="Remove">
                <lucide-icon [img]="TrashIcon" [size]="16" />
              </button>
            }
          </div>
        }
      </div>

      @if (!canManage()) {
        <p class="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Only the workspace owner or an admin can add or remove people.
        </p>
      }
    }
  `,
})
export class OrganizationPage {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private profile = inject(ProfileService);

  readonly UserPlusIcon = UserPlus;
  readonly TrashIcon = Trash2;
  readonly CopyIcon = Copy;
  readonly CheckIcon = Check;
  readonly UsersIcon = Users;
  readonly Spinner = Loader2;

  org = signal<Organization | null>(null);
  loading = signal(true);
  saving = signal(false);
  adding = signal(false);
  copied = signal(false);
  invite = signal<AddMemberResult | null>(null);

  name = '';
  email = '';
  role: 'admin' | 'member' = 'member';

  /** Who "you" are in the roster — used to hide the remove button on yourself. */
  meId = computed(() => this.profile.profile()?.id || '');
  canManage = computed(() => {
    const r = this.org()?.yourRole;
    return r === 'owner' || r === 'admin';
  });
  seatPct = computed(() => {
    const o = this.org();
    return o ? Math.min(100, Math.round((o.seatsUsed / Math.max(1, o.seatLimit)) * 100)) : 0;
  });

  constructor() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.api.getOrg().subscribe({
      next: (o) => {
        this.org.set(o);
        this.name = o.name;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  saveName() {
    const next = this.name.trim();
    if (!next || next === this.org()?.name) return;
    this.saving.set(true);
    this.api.updateOrg({ name: next }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Workspace renamed');
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e?.error?.message || 'Could not rename the workspace');
      },
    });
  }

  add() {
    const addr = this.email.trim();
    if (!addr) return;
    this.adding.set(true);
    this.invite.set(null);
    this.api.addMember(addr, this.role).subscribe({
      next: (res) => {
        this.adding.set(false);
        this.email = '';
        this.invite.set(res);
        this.copied.set(false);
        this.load();
      },
      error: (e) => {
        this.adding.set(false);
        this.toast.error(e?.error?.message || 'Could not add that person');
      },
    });
  }

  remove(userId: string, email: string) {
    if (!confirm(`Remove ${email} from this workspace? They lose access immediately.`)) return;
    this.api.removeMember(userId).subscribe({
      next: () => {
        this.toast.success('Member removed');
        this.load();
      },
      error: (e) => this.toast.error(e?.error?.message || 'Could not remove that person'),
    });
  }

  copy(link: string) {
    navigator.clipboard?.writeText(link).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      },
      () => this.toast.error('Could not copy — select the link and copy it manually'),
    );
  }
}
