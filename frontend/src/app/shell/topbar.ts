import { Component, EventEmitter, Output, ViewChild, ElementRef, HostListener, inject, signal, computed } from '@angular/core';
import {
  LucideAngularModule, Menu, Bell, Sun, Moon, Search, ChevronDown,
  CheckCircle2, Plug, LogOut, User, Settings as SettingsIcon, Crown, Megaphone,
} from 'lucide-angular';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../core/theme.service';
import { ProfileService } from '../core/profile.service';
import { NotificationService } from '../core/notification.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { DataService } from '../core/data.service';
import { Avatar } from '../shared/avatar';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, FormsModule, Avatar],
  template: `
    <header class="relative z-30 mx-3 mt-3 sm:mx-4 sm:mt-4 flex h-14 items-center gap-3 px-3 sm:px-4
                   rounded-2xl glass shadow-card">
      <button class="btn-icon lg:hidden" (click)="menu.emit()" aria-label="Open menu">
        <lucide-icon [img]="Menu" [size]="20" />
      </button>

      <!-- Search -->
      <div class="relative hidden md:block w-72">
        <lucide-icon [img]="Search" [size]="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input #searchBox type="text" placeholder="Search campaigns, contacts…" autocomplete="off"
               class="input pl-11 pr-14 py-2 rounded-full bg-slate-100/70 dark:bg-white/[0.04] border-transparent dark:border-white/5"
               [ngModel]="q()" (ngModelChange)="q.set($event)" (focus)="searchOpen.set(true)"
               (keydown.escape)="closeSearch(searchBox)" (keydown.enter)="onEnter()" />
        <kbd class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-md px-1.5 py-0.5">⌘K</kbd>

        @if (searchOpen() && q().trim()) {
          <div class="fixed inset-0 z-40" (click)="searchOpen.set(false)"></div>
          <div class="absolute left-0 mt-2 w-[22rem] card p-1.5 shadow-pop z-50 animate-scale-in origin-top-left max-h-[70vh] overflow-y-auto">
            @if (results().contacts.length === 0 && results().campaigns.length === 0) {
              <div class="px-3 py-6 text-center text-sm text-slate-400">No matches for “{{ q().trim() }}”.</div>
            }
            @if (results().contacts.length) {
              <p class="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Contacts</p>
              @for (c of results().contacts; track c.id) {
                <button class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors" (click)="goContacts(c.name || c.email)">
                  <app-avatar [name]="c.name || c.email" [size]="28" [rounded]="0.5" />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{{ c.name || c.email }}</p>
                    <p class="text-xs text-slate-400 truncate">{{ c.email }}{{ c.company ? ' · ' + c.company : '' }}</p>
                  </div>
                </button>
              }
            }
            @if (results().campaigns.length) {
              <p class="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Campaigns</p>
              @for (c of results().campaigns; track c.id) {
                <button class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors" (click)="goCampaigns()">
                  <span class="h-7 w-7 rounded-lg bg-brand-500/12 flex items-center justify-center shrink-0"><lucide-icon [img]="MegaphoneIcon" [size]="15" class="text-brand-500" /></span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{{ c.name }}</p>
                    <p class="text-xs text-slate-400 truncate">{{ c.sent }} of {{ c.total }} sent · {{ c.status }}</p>
                  </div>
                </button>
              }
            }
          </div>
        }
      </div>

      <div class="flex-1"></div>

      <!-- Sending-email connection status (Google OAuth or App Password/SMTP) -->
      @if (profile.canSend()) {
        <a routerLink="/settings" title="Manage sending email"
           class="hidden sm:flex items-center gap-2 rounded-full border border-success-200 dark:border-success-500/30 bg-success-50 dark:bg-success-500/10 px-2.5 py-1 hover:bg-success-100 dark:hover:bg-success-500/15 transition-colors">
          <lucide-icon [img]="Check" [size]="15" class="text-success-600 dark:text-success-400" />
          <span class="text-xs font-medium text-success-700 dark:text-success-400">Email Connected</span>
        </a>
      } @else {
        <a routerLink="/settings" title="Connect your sending email"
           class="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 pl-2.5 pr-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <lucide-icon [img]="Plug" [size]="15" class="text-slate-400" />
          <span class="text-xs font-medium text-slate-600 dark:text-slate-300">Connect Email</span>
        </a>
      }

      <!-- Theme toggle -->
      <button class="btn-icon" (click)="theme.toggle()" [attr.aria-label]="theme.theme() === 'dark' ? 'Light mode' : 'Dark mode'">
        @if (theme.theme() === 'dark') { <lucide-icon [img]="Sun" [size]="19" /> }
        @else { <lucide-icon [img]="Moon" [size]="19" /> }
      </button>

      <!-- Notifications -->
      <div class="relative">
        <button class="btn-icon relative" (click)="toggleNotif()" aria-label="Notifications">
          <lucide-icon [img]="Bell" [size]="19" />
          @if (notif.unread() > 0) {
            <span class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900"></span>
          }
        </button>
        @if (notifOpen()) {
          <div class="absolute right-0 mt-2 w-80 card p-0 shadow-pop animate-scale-in origin-top-right z-50">
            <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span class="text-sm font-semibold">Notifications</span>
              @if (notif.unread() > 0) { <span class="badge-info">{{ notif.unread() }} new</span> }
            </div>
            <div class="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              @for (n of notif.items(); track n.id) {
                <div class="flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" [class.opacity-60]="n.read">
                  <div class="h-2 w-2 rounded-full mt-1.5 shrink-0" [class]="notif.dotClass(n.kind)"></div>
                  <div class="min-w-0">
                    <p class="text-sm text-slate-700 dark:text-slate-200">{{ n.title }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">{{ notif.ago(n.ts) }}</p>
                  </div>
                </div>
              } @empty {
                <div class="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</div>
              }
            </div>
            @if (notif.items().length) {
              <button class="w-full text-center text-xs font-medium text-brand-600 dark:text-brand-400 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" (click)="notif.markAllRead()">
                Mark all as read
              </button>
            }
          </div>
        }
      </div>

      <!-- Avatar -->
      <div class="relative">
        <button class="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                (click)="toggleMenu()">
          <span class="relative">
            @if (profile.name() || profile.email()) {
              <app-avatar [name]="profile.name() || profile.email()" [size]="32" [rounded]="0.5" />
            } @else {
              <span class="skeleton block h-8 w-8 rounded-lg"></span>
            }
            @if (profile.isPaid()) {
              <span class="absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900"
                    style="background:linear-gradient(120deg,#a855f7,#6366f1)" [title]="planLabel()">
                <lucide-icon [img]="CrownIcon" [size]="9" class="text-white" />
              </span>
            }
          </span>
          @if (profile.isPaid()) {
            <span class="hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white tracking-wide"
                  style="background:linear-gradient(120deg,#a855f7,#6366f1)">{{ planLabel() }}</span>
          }
          <lucide-icon [img]="ChevronDown" [size]="15" class="text-slate-400 hidden sm:block" />
        </button>
        @if (menuOpen()) {
          <div class="absolute right-0 mt-2 w-56 card p-1.5 shadow-pop animate-scale-in origin-top-right z-50">
            <div class="px-3 py-2.5">
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ profile.name() || profile.email() || 'Your account' }}</p>
                @if (profile.isPaid()) {
                  <span class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0" style="background:linear-gradient(120deg,#a855f7,#6366f1)">
                    <lucide-icon [img]="CrownIcon" [size]="9" /> {{ planLabel() }}
                  </span>
                } @else {
                  <a routerLink="/upgrade" (click)="menuOpen.set(false)" class="text-[10px] font-semibold text-brand-600 dark:text-brand-400 shrink-0 hover:underline">Upgrade</a>
                }
              </div>
              <p class="text-xs text-slate-400 truncate">{{ profile.email() }}</p>
            </div>
            <div class="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
            <a routerLink="/settings" (click)="menuOpen.set(false)" class="nav-link"><lucide-icon [img]="User" [size]="16" /> Profile</a>
            <a routerLink="/settings" (click)="menuOpen.set(false)" class="nav-link"><lucide-icon [img]="Cog" [size]="16" /> Settings</a>
            <div class="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
            <button class="nav-link w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10" (click)="signOut()">
              <lucide-icon [img]="LogOutIcon" [size]="16" /> Sign out
            </button>
          </div>
        }
      </div>
    </header>
  `,
})
export class Topbar {
  @Output() menu = new EventEmitter<void>();
  theme = inject(ThemeService);
  profile = inject(ProfileService);
  notif = inject(NotificationService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private data = inject(DataService);
  private router = inject(Router);

  @ViewChild('searchBox') searchBox?: ElementRef<HTMLInputElement>;

  readonly Menu = Menu; readonly Bell = Bell; readonly Sun = Sun; readonly Moon = Moon;
  readonly Search = Search; readonly ChevronDown = ChevronDown; readonly Check = CheckCircle2;
  readonly Plug = Plug; readonly LogOutIcon = LogOut; readonly User = User; readonly Cog = SettingsIcon;
  readonly CrownIcon = Crown; readonly MegaphoneIcon = Megaphone;

  planLabel() { return this.profile.plan() === 'business' ? 'Business' : 'Pro'; }

  notifOpen = signal(false);
  menuOpen = signal(false);

  // ---- Global quick search (contacts + campaigns already loaded in memory) ----
  q = signal('');
  searchOpen = signal(false);

  results = computed(() => {
    const term = this.q().trim().toLowerCase();
    if (!term) return { contacts: [] as any[], campaigns: [] as any[] };
    const contacts = this.data.contacts().filter((c) =>
      c.name?.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term) || c.company?.toLowerCase().includes(term)).slice(0, 5);
    const campaigns = this.data.campaigns().filter((c) =>
      c.name?.toLowerCase().includes(term)).slice(0, 4);
    return { contacts, campaigns };
  });

  closeSearch(el?: HTMLInputElement) { this.searchOpen.set(false); this.q.set(''); el?.blur(); }
  goContacts(name: string) { this.searchOpen.set(false); this.q.set(''); this.router.navigate(['/contacts'], { queryParams: { q: name } }); }
  goCampaigns() { this.searchOpen.set(false); this.q.set(''); this.router.navigate(['/campaigns']); }
  onEnter() {
    const r = this.results();
    if (r.contacts.length) return this.goContacts(r.contacts[0].name || r.contacts[0].email);
    if (r.campaigns.length) return this.goCampaigns();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.searchOpen.set(true);
      this.searchBox?.nativeElement.focus();
    }
  }

  toggleNotif() { this.notifOpen.update((v) => !v); this.menuOpen.set(false); }
  toggleMenu() { this.menuOpen.update((v) => !v); this.notifOpen.set(false); }

  signOut() {
    this.menuOpen.set(false);
    this.auth.logout();
    this.toast.success('Signed out');
  }
}
