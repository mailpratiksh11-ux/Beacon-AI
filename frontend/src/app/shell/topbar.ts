import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, HostListener, inject, signal, computed } from '@angular/core';
import {
  LucideAngularModule, Menu, Bell, Sun, Moon, Search, ChevronDown,
  CheckCircle2, Plug, LogOut, User, Settings as SettingsIcon, Crown, Megaphone,
  Home as HomeIcon, LayoutDashboard, PenSquare, Users, BarChart3,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-angular';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../core/theme.service';
import { ProfileService } from '../core/profile.service';
import { NotificationService } from '../core/notification.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { DataService } from '../core/data.service';
import { Avatar } from '../shared/avatar';

interface NavTab { label: string; path: string; icon: any; exact?: boolean; }

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, RouterLinkActive, FormsModule, Avatar],
  template: `
    <header class="relative z-30 mx-3 mt-3 sm:mx-4 sm:mt-4 flex h-16 items-center gap-3">
      <!-- Mobile menu (opens the sidebar drawer) -->
      <button class="lg:hidden h-11 w-11 rounded-2xl glass shadow-card flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0" (click)="menu.emit()" aria-label="Open menu">
        <lucide-icon [img]="Menu" [size]="20" />
      </button>

      <!-- Desktop: collapse / restore the sidebar -->
      <button class="hidden lg:flex h-11 w-11 rounded-2xl glass shadow-card items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 hover:text-brand-500 transition-colors"
              (click)="toggleSidebar.emit()"
              [attr.aria-expanded]="sidebarOpen"
              [attr.aria-label]="sidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
              [title]="sidebarOpen ? 'Hide sidebar' : 'Show sidebar'">
        <lucide-icon [img]="sidebarOpen ? PanelClose : PanelOpen" [size]="20" />
      </button>

      <div class="flex-1"></div>

      <!-- Center: primary nav tabs (icon over label, active pill highlight) -->
      <nav class="hidden lg:flex items-center gap-1 rounded-2xl glass shadow-card p-1.5">
        @for (t of tabs; track t.path) {
          <a [routerLink]="t.path" routerLinkActive="tab-active" [routerLinkActiveOptions]="{ exact: !!t.exact }"
             class="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">
            <lucide-icon [img]="t.icon" [size]="19" [strokeWidth]="1.9" />
            <span>{{ t.label }}</span>
          </a>
        }
      </nav>

      <div class="flex-1"></div>

      <!-- Right: one pill, search field + circular icon buttons -->
      <div class="relative flex items-center gap-1 rounded-full glass shadow-card p-1.5 z-40">
        <!-- Search field, collapsed to nothing until the icon is clicked, then slides open -->
        <div class="hidden sm:block overflow-hidden transition-[width] duration-300 ease-out" [style.width.px]="searchBoxOpen() ? 260 : 0">
          <input #searchBox type="text" placeholder="Search campaigns, contacts…" autocomplete="off"
                 class="h-10 w-[260px] rounded-full bg-slate-100/70 dark:bg-white/[0.05] border border-transparent focus:border-brand-400/50 focus:bg-white dark:focus:bg-white/[0.08] px-4 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
                 [ngModel]="q()" (ngModelChange)="q.set($event)" (focus)="searchBoxOpen.set(true)" (blur)="scheduleCollapse()"
                 (keydown.enter)="onEnter()" (keydown.escape)="closeSearch(searchBox)" />
        </div>

        <!-- Search icon (always visible; toggles the field open/closed) -->
        <button class="h-10 w-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors" (click)="toggleSearch()" aria-label="Search">
          <lucide-icon [img]="Search" [size]="18" />
        </button>

        <!-- Email connection status -->
        <a routerLink="/settings" class="hidden sm:flex h-10 w-10 rounded-full items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors" [title]="profile.canSend() ? 'Email connected' : 'Connect your sending email'">
          @if (profile.canSend()) { <lucide-icon [img]="Check" [size]="18" class="text-success-500" /> }
          @else { <lucide-icon [img]="Plug" [size]="18" class="text-slate-400" /> }
        </a>

        <!-- Theme -->
        <button class="hidden sm:flex h-10 w-10 rounded-full items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors" (click)="theme.toggle()" [attr.aria-label]="theme.theme() === 'dark' ? 'Light mode' : 'Dark mode'">
          @if (theme.theme() === 'dark') { <lucide-icon [img]="Sun" [size]="18" /> }
          @else { <lucide-icon [img]="Moon" [size]="18" /> }
        </button>

        <!-- Notifications -->
        <div class="relative">
          <button class="h-10 w-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors relative" (click)="toggleNotif()" aria-label="Notifications">
            <lucide-icon [img]="Bell" [size]="18" />
            @if (notif.unread() > 0) {
              <span class="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900"></span>
            }
          </button>
          @if (notifOpen()) {
            <div class="fixed inset-0 z-40" (click)="notifOpen.set(false)"></div>
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
                <div class="flex items-stretch border-t border-slate-100 dark:border-slate-800">
                  <button class="flex-1 text-center text-xs font-medium text-brand-600 dark:text-brand-400 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                          [disabled]="notif.unread() === 0" (click)="notif.markAllRead()">
                    Mark all as read
                  </button>
                  <div class="w-px bg-slate-100 dark:bg-slate-800"></div>
                  <button class="flex-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-red-500 dark:hover:text-red-400 transition-colors" (click)="notif.clear()">
                    Clear all
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Avatar -->
        <div class="relative">
          <button class="flex items-center gap-1 rounded-full pl-0.5 pr-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors" (click)="toggleMenu()">
            <span class="relative">
              @if (profile.name() || profile.email()) {
                <app-avatar [name]="profile.name() || profile.email()" [size]="32" [rounded]="0.5" />
              } @else {
                <span class="skeleton block h-8 w-8 rounded-lg"></span>
              }
              @if (profile.isPaid()) {
                <span class="absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900"
                      style="background:linear-gradient(120deg,#38bdf8,#0284c7)" [title]="planLabel()">
                  <lucide-icon [img]="CrownIcon" [size]="9" class="text-white" />
                </span>
              }
            </span>
            <lucide-icon [img]="ChevronDown" [size]="15" class="text-slate-400 hidden sm:block" />
          </button>
          @if (menuOpen()) {
            <div class="fixed inset-0 z-40" (click)="menuOpen.set(false)"></div>
            <div class="absolute right-0 mt-2 w-56 card p-1.5 shadow-pop animate-scale-in origin-top-right z-50">
              <div class="px-3 py-2.5">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ profile.name() || profile.email() || 'Your account' }}</p>
                  @if (profile.isPaid()) {
                    <span class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0" style="background:linear-gradient(120deg,#38bdf8,#0284c7)">
                      <lucide-icon [img]="CrownIcon" [size]="9" /> {{ planLabel() }}
                    </span>
                  } @else {
                    <a routerLink="/upgrade" (click)="menuOpen.set(false)" class="text-[10px] font-semibold text-brand-600 dark:text-brand-400 shrink-0 hover:underline">Upgrade</a>
                  }
                </div>
                <p class="text-xs text-slate-400 truncate">{{ profile.email() }}</p>
              </div>
              <div class="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
              <!-- Theme + email are hidden on mobile in the pill; expose them here on small screens -->
              <button class="nav-link w-full sm:hidden" (click)="theme.toggle(); menuOpen.set(false)">
                <lucide-icon [img]="theme.theme() === 'dark' ? Sun : Moon" [size]="16" /> {{ theme.theme() === 'dark' ? 'Light mode' : 'Dark mode' }}
              </button>
              <a routerLink="/settings" (click)="menuOpen.set(false)" class="nav-link"><lucide-icon [img]="User" [size]="16" /> Profile</a>
              <a routerLink="/settings" (click)="menuOpen.set(false)" class="nav-link"><lucide-icon [img]="Cog" [size]="16" /> Settings</a>
              <div class="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
              <button class="nav-link w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10" (click)="signOut()">
                <lucide-icon [img]="LogOutIcon" [size]="16" /> Sign out
              </button>
            </div>
          }
        </div>

        <!-- Search results, anchored under the search field -->
        @if (searchBoxOpen() && q().trim()) {
          <div class="absolute left-0 top-full mt-2 w-80 max-w-[86vw] card p-1.5 shadow-pop z-50 animate-scale-in origin-top-left max-h-[70vh] overflow-y-auto">
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
    </header>
  `,
  styles: [`
    /* active nav tab, highlighted pill inside the glass nav bar */
    .tab-active {
      background: rgba(255, 255, 255, 0.9);
      color: #0284c7;
      box-shadow: 0 2px 6px -2px rgba(2, 23, 54, 0.15);
    }
    :host-context(.dark) .tab-active {
      background: rgba(255, 255, 255, 0.1);
      color: #7dd3fc;
    }
  `],
})
export class Topbar {
  @Output() menu = new EventEmitter<void>();
  /** Desktop sidebar visibility, owned by Layout so the choice can be persisted. */
  @Input() sidebarOpen = true;
  @Output() toggleSidebar = new EventEmitter<void>();
  theme = inject(ThemeService);
  profile = inject(ProfileService);
  notif = inject(NotificationService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private data = inject(DataService);
  private router = inject(Router);

  @ViewChild('searchBox') searchBox?: ElementRef<HTMLInputElement>;

  // Primary sections shown as center nav tabs (a quick-access subset of the sidebar).
  readonly tabs: NavTab[] = [
    { label: 'Home', path: '/home', icon: HomeIcon },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Compose', path: '/compose', icon: PenSquare },
    { label: 'Contacts', path: '/contacts', icon: Users },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  readonly Menu = Menu; readonly Bell = Bell; readonly Sun = Sun; readonly Moon = Moon;
  readonly PanelClose = PanelLeftClose; readonly PanelOpen = PanelLeftOpen;
  readonly Search = Search; readonly ChevronDown = ChevronDown; readonly Check = CheckCircle2;
  readonly Plug = Plug; readonly LogOutIcon = LogOut; readonly User = User; readonly Cog = SettingsIcon;
  readonly CrownIcon = Crown; readonly MegaphoneIcon = Megaphone;

  planLabel() { return this.profile.plan() === 'business' ? 'Business' : 'Pro'; }

  notifOpen = signal(false);
  menuOpen = signal(false);

  // ---- Global quick search (contacts + campaigns already loaded in memory) ----
  q = signal('');
  searchBoxOpen = signal(false); // controls the results dropdown

  results = computed(() => {
    const term = this.q().trim().toLowerCase();
    if (!term) return { contacts: [] as any[], campaigns: [] as any[] };
    const contacts = this.data.contacts().filter((c) =>
      c.name?.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term) || c.company?.toLowerCase().includes(term)).slice(0, 5);
    const campaigns = this.data.campaigns().filter((c) =>
      c.name?.toLowerCase().includes(term)).slice(0, 4);
    return { contacts, campaigns };
  });

  focusSearch() { this.searchBoxOpen.set(true); this.notifOpen.set(false); this.menuOpen.set(false); setTimeout(() => this.searchBox?.nativeElement.focus(), 0); }
  // Search icon toggles the field open/closed.
  toggleSearch() { if (this.searchBoxOpen()) this.closeSearch(this.searchBox?.nativeElement); else this.focusSearch(); }
  // Collapse shortly after blur, the delay lets a click on a result register first.
  // Skip if the field regained focus in the meantime.
  scheduleCollapse() {
    setTimeout(() => {
      if (document.activeElement !== this.searchBox?.nativeElement) {
        this.searchBoxOpen.set(false);
        this.q.set('');
      }
    }, 200);
  }
  closeSearch(el?: HTMLInputElement) { this.searchBoxOpen.set(false); this.q.set(''); el?.blur(); }
  goContacts(name: string) { this.searchBoxOpen.set(false); this.q.set(''); this.router.navigate(['/contacts'], { queryParams: { q: name } }); }
  goCampaigns() { this.searchBoxOpen.set(false); this.q.set(''); this.router.navigate(['/campaigns']); }
  onEnter() {
    const r = this.results();
    if (r.contacts.length) return this.goContacts(r.contacts[0].name || r.contacts[0].email);
    if (r.campaigns.length) return this.goCampaigns();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.focusSearch();
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
