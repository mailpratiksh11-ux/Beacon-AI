import { Component, EventEmitter, Output, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule, LayoutDashboard, PenSquare, Megaphone, History,
  LayoutTemplate, Users, BarChart3, Settings, Crown, Home as HomeIcon, Inbox as InboxIcon,
  Briefcase, ClipboardList,
} from 'lucide-angular';
import { LogoMark } from '../shared/logo-mark';
import { ProfileService } from '../core/profile.service';

interface NavItem { label: string; path: string; icon: any; soon?: boolean; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, LogoMark],
  template: `
    <aside class="flex h-full w-64 flex-col bg-white dark:bg-slate-850 border-r border-slate-200 dark:border-white/[0.04]">
      <!-- Logo -->
      <a routerLink="/home" (click)="navigate.emit()" class="flex items-center gap-2.5 px-5 h-16 shrink-0 hover:opacity-90 transition-opacity" title="Go to Home">
        <app-logo-mark [size]="36" />
        <div class="leading-tight">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-slate-900 dark:text-white tracking-tight">Beacon</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400">AI</span>
          </div>
          <span class="text-[11px] text-slate-400">Intelligent Email Automation</span>
        </div>
      </a>

      <!-- Nav (grouped) -->
      <nav class="flex-1 overflow-y-auto px-3 py-3 space-y-6">
        @for (group of groups(); track group.label) {
          <div class="space-y-1">
            <p class="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400/80 dark:text-slate-500">{{ group.label }}</p>
            @for (item of group.items; track item.path) {
              <a [routerLink]="item.path" routerLinkActive="nav-link-active"
                 [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                 class="nav-link group" (click)="navigate.emit()">
                <lucide-icon [img]="item.icon" [size]="18" [strokeWidth]="1.75" class="shrink-0 transition-transform duration-200 group-hover:scale-110" />
                <span>{{ item.label }}</span>
                @if (item.soon) {
                  <span class="ml-auto shrink-0 rounded-md bg-slate-100 dark:bg-white/[0.07] px-1.5 py-0.5
                               text-[10px] font-semibold uppercase tracking-[0.08em]
                               text-slate-500 dark:text-slate-400">Soon</span>
                }
              </a>
            }
          </div>
        }
      </nav>

      <!-- Upgrade + Settings -->
      <div class="px-3 pb-3 pt-2 space-y-2 border-t border-slate-100 dark:border-white/[0.04]">
        @if (profile.isPaid()) {
          <a routerLink="/upgrade" routerLinkActive="nav-link-active" class="nav-link group" (click)="navigate.emit()">
            <lucide-icon [img]="CrownIcon" [size]="18" [strokeWidth]="1.75" class="shrink-0 text-amber-500 transition-transform duration-200 group-hover:scale-110" />
            <span>Manage plan</span>
          </a>
        } @else {
          <a routerLink="/upgrade" (click)="navigate.emit()"
             class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
             style="background:linear-gradient(120deg,#38bdf8,#0ea5e9 55%,#0369a1)">
            <lucide-icon [img]="CrownIcon" [size]="18" [strokeWidth]="1.9" class="shrink-0" />
            <span>Upgrade to Pro</span>
          </a>
        }
        <a routerLink="/settings" routerLinkActive="nav-link-active" class="nav-link group" (click)="navigate.emit()">
          <lucide-icon [img]="SettingsIcon" [size]="18" [strokeWidth]="1.75" class="shrink-0 transition-transform duration-200 group-hover:rotate-45" />
          <span>Settings</span>
        </a>
      </div>
    </aside>
  `,
})
export class Sidebar {
  @Output() navigate = new EventEmitter<void>();
  profile = inject(ProfileService);
  readonly CrownIcon = Crown;
  readonly SettingsIcon = Settings;

  // Inbox is shown to everyone but marked Soon. Reading mail needs Gmail's
  // restricted gmail.readonly scope, which drags the whole app into a CASA
  // Tier 2 assessment renewed every year — so the scope is not requested and
  // the page is a placeholder until that is worth paying for.
  groups = computed<{ label: string; items: NavItem[] }[]>(() => {
    const outreach: NavItem[] = [
      { label: 'Compose Email', path: '/compose', icon: PenSquare },
      { label: 'Inbox', path: '/inbox', icon: InboxIcon, soon: true },
      { label: 'Campaigns', path: '/campaigns', icon: Megaphone },
      { label: 'Templates', path: '/templates', icon: LayoutTemplate },
    ];
    return [
      { label: 'Overview', items: [
        { label: 'Home', path: '/home', icon: HomeIcon },
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ] },
      { label: 'Outreach', items: outreach },
      // Job Mode (phase 1), temporarily hidden from the nav; code kept. Uncomment to re-enable.
      // { label: 'Job Mode', items: [
      //   { label: 'Job Search', path: '/jobs', icon: Briefcase },
      //   { label: 'Application Tracker', path: '/tracker', icon: ClipboardList },
      // ] },
      { label: 'Audience', items: [
        { label: 'Contacts', path: '/contacts', icon: Users },
        { label: 'Email History', path: '/history', icon: History },
      ] },
      { label: 'Insights', items: [{ label: 'Analytics', path: '/analytics', icon: BarChart3 }] },
    ];
  });
}
