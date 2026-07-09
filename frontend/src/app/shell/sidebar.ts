import { Component, EventEmitter, Output, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule, LayoutDashboard, PenSquare, Megaphone, History,
  LayoutTemplate, Users, BarChart3, Settings, Sparkles, Home as HomeIcon, Inbox as InboxIcon,
} from 'lucide-angular';
import { LogoMark } from '../shared/logo-mark';
import { ProfileService } from '../core/profile.service';

interface NavItem { label: string; path: string; icon: any; }

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
              </a>
            }
          </div>
        }
      </nav>

      <!-- Settings + Upgrade -->
      <div class="px-3 pb-3 pt-2 space-y-2 border-t border-slate-100 dark:border-white/[0.04]">
        <a routerLink="/settings" routerLinkActive="nav-link-active" class="nav-link group" (click)="navigate.emit()">
          <lucide-icon [img]="SettingsIcon" [size]="18" [strokeWidth]="1.75" class="shrink-0 transition-transform duration-200 group-hover:rotate-45" />
          <span>Settings</span>
        </a>
        @if (!profile.isPaid()) {
          <div class="relative overflow-hidden rounded-2xl p-4 text-white"
               style="background:linear-gradient(150deg,#7c7fff,#6366f1 55%,#4f46e5)">
            <div class="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15 blur-2xl"></div>
            <lucide-icon [img]="Sparkles" [size]="18" class="mb-2 opacity-90 relative" />
            <p class="text-sm font-semibold relative">Upgrade to Pro</p>
            <p class="text-xs text-white/75 mt-0.5 relative">Unlimited sends &amp; AI copywriting.</p>
            <a routerLink="/upgrade" (click)="navigate.emit()" class="mt-3 block text-center rounded-xl bg-white text-brand-600 text-xs font-semibold py-2 transition-transform hover:-translate-y-0.5 relative">
              Upgrade now
            </a>
          </div>
        }
      </div>
    </aside>
  `,
})
export class Sidebar {
  @Output() navigate = new EventEmitter<void>();
  profile = inject(ProfileService);
  readonly Sparkles = Sparkles;
  readonly SettingsIcon = Settings;

  // Inbox appears only for users who signed in with Google (Gmail API available).
  groups = computed<{ label: string; items: NavItem[] }[]>(() => {
    const outreach: NavItem[] = [
      { label: 'Compose Email', path: '/compose', icon: PenSquare },
      { label: 'Campaigns', path: '/campaigns', icon: Megaphone },
      { label: 'Templates', path: '/templates', icon: LayoutTemplate },
    ];
    if (this.profile.googleConnected()) {
      outreach.splice(1, 0, { label: 'Inbox', path: '/inbox', icon: InboxIcon });
    }
    return [
      { label: 'Overview', items: [
        { label: 'Home', path: '/home', icon: HomeIcon },
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      ] },
      { label: 'Outreach', items: outreach },
      { label: 'Audience', items: [
        { label: 'Contacts', path: '/contacts', icon: Users },
        { label: 'Email History', path: '/history', icon: History },
      ] },
      { label: 'Insights', items: [{ label: 'Analytics', path: '/analytics', icon: BarChart3 }] },
    ];
  });
}
