import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { SendProgressWidget } from '../shared/send-progress-widget';
import { ProfileService } from '../core/profile.service';
import { DataService } from '../core/data.service';
import { RealtimeService } from '../core/realtime.service';
import { SendService } from '../core/send.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, Topbar, SendProgressWidget],
  template: `
    <div class="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <!-- Desktop sidebar (collapsible; the topbar keeps a way to bring it back) -->
      @if (sidebarOpen()) {
        <div class="hidden lg:block shrink-0">
          <app-sidebar />
        </div>
      }

      <!-- Mobile sidebar drawer -->
      @if (mobileOpen()) {
        <div class="fixed inset-0 z-40 lg:hidden">
          <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" (click)="mobileOpen.set(false)"></div>
          <div class="absolute left-0 top-0 h-full animate-slide-in-right">
            <app-sidebar (navigate)="mobileOpen.set(false)" />
          </div>
        </div>
      }

      <!-- Main -->
      <div class="flex-1 flex flex-col min-w-0">
        <app-topbar (menu)="mobileOpen.set(true)" [sidebarOpen]="sidebarOpen()" (toggleSidebar)="toggleSidebar()" />
        <main class="flex-1 overflow-y-auto">
          <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in"
               [style.padding-bottom.px]="send.active() ? 210 : null">
            <router-outlet />
          </div>
        </main>
      </div>

      <!-- Global background-send progress (persists across navigation) -->
      <app-send-progress-widget />
    </div>
  `,
})
export class Layout implements OnInit, OnDestroy {
  private profile = inject(ProfileService);
  private data = inject(DataService);
  private realtime = inject(RealtimeService);
  send = inject(SendService);
  private sub?: Subscription;
  mobileOpen = signal(false);

  // Desktop sidebar visibility. Remembered per browser so it survives a refresh.
  private static readonly SIDEBAR_KEY = 'cm-sidebar-open';
  sidebarOpen = signal(Layout.readSidebarPref());

  private static readSidebarPref(): boolean {
    try {
      const v = localStorage.getItem(Layout.SIDEBAR_KEY);
      return v === null ? true : v === '1'; // default open
    } catch {
      return true;
    }
  }

  toggleSidebar() {
    this.sidebarOpen.update((v) => !v);
    try { localStorage.setItem(Layout.SIDEBAR_KEY, this.sidebarOpen() ? '1' : '0'); } catch { /* private mode */ }
  }

  // The shell only mounts once the user is authenticated (authGuard), so the JWT is
  // guaranteed present here, load the profile + workspace data on every app start / refresh.
  ngOnInit() {
    this.profile.load();
    this.data.loadAll();

    // Open the real-time channel and keep dashboards/history fresh as sends happen live.
    this.realtime.connect();
    this.send.restore(); // re-attach to an in-flight campaign after a refresh
    this.sub = this.realtime.emailSent.pipe(debounceTime(1000)).subscribe(() => {
      this.data.refreshHistory();
      this.data.refreshCampaigns();
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.realtime.disconnect();
  }
}
