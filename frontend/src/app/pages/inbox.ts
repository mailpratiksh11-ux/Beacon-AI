import { Component, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Inbox as InboxIcon, RefreshCw, Send, Loader2, CornerUpLeft, Mail } from 'lucide-angular';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { AuthService } from '../core/auth.service';
import { InboxItem, InboxThread } from '../core/models';
import { PageHeader } from '../shared/page-header';
import { EmptyState } from '../shared/empty-state';
import { Avatar } from '../shared/avatar';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [LucideAngularModule, FormsModule, SlicePipe, PageHeader, EmptyState, Avatar],
  template: `
    <app-page-header title="Mail" subtitle="Your Gmail — read, reply, and see what you've sent, without leaving Beacon.">
      <div class="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-white/[0.04]">
        @for (f of folders; track f.key) {
          <button class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                  [class]="folder() === f.key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'"
                  (click)="setFolder(f.key)">{{ f.label }}</button>
        }
      </div>
      <button class="btn-secondary" (click)="load()" [disabled]="loading()">
        <lucide-icon [img]="Refresh" [size]="16" [class.animate-spin]="loading()" /> Refresh
      </button>
    </app-page-header>

    @if (authNeeded()) {
      <!-- Needs Google read access -->
      <div class="card p-10 text-center max-w-lg mx-auto mt-6">
        <div class="h-14 w-14 rounded-2xl bg-brand-500/12 flex items-center justify-center mx-auto mb-5">
          <lucide-icon [img]="InboxLucide" [size]="26" class="text-brand-500" />
        </div>
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Connect Google to read your inbox</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
          {{ authMessage() || 'Sign in with Google and grant read access to view and reply to your Gmail here.' }}
        </p>
        <button class="btn-primary mx-auto mt-6" (click)="connectGoogle()">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#fff" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>
          Continue with Google
        </button>
        <p class="text-xs text-slate-400 mt-4">You'll be asked to allow Beacon to read and send Gmail.</p>
      </div>
    } @else {
    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-4">
      <!-- Thread list -->
      <div class="card overflow-hidden lg:h-[calc(100vh-220px)] flex flex-col" [class.hidden]="selected() && isMobile()">
        <div class="overflow-y-auto flex-1">
          @if (loading() && !items().length) {
            <div class="p-4 space-y-3">@for (i of [1,2,3,4,5]; track i) { <div class="skeleton h-14 w-full"></div> }</div>
          } @else if (items().length === 0) {
            <app-empty-state [title]="folder() === 'sent' ? 'No sent mail' : folder() === 'unread' ? 'No unread mail' : 'Inbox empty'" subtitle="Nothing to show here right now." [icon]="MailIcon" />
          } @else {
            @for (m of items(); track m.id) {
              <button class="w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 transition-colors flex gap-3"
                      [class]="selected()?.threadId === m.threadId ? 'bg-brand-500/[0.07]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'"
                      (click)="open(m)">
                <app-avatar [name]="displayName(m)" [size]="36" [rounded]="0.5" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-slate-900 dark:text-slate-100 truncate flex-1" [class.font-bold]="m.unread">
                      @if (folder() === 'sent') { <span class="text-slate-400 font-normal">To </span> }{{ displayName(m) }}
                    </p>
                    @if (m.unread) { <span class="h-2 w-2 rounded-full bg-brand-500 shrink-0"></span> }
                  </div>
                  <p class="text-sm text-slate-600 dark:text-slate-300 truncate" [class.font-semibold]="m.unread">{{ m.subject }}</p>
                  <p class="text-xs text-slate-400 truncate">{{ m.snippet }}</p>
                </div>
              </button>
            }
          }
        </div>
      </div>

      <!-- Thread detail -->
      <div class="card overflow-hidden lg:h-[calc(100vh-220px)] flex flex-col" [class.hidden]="!selected() && isMobile()">
        @if (!selected()) {
          <div class="flex-1 flex items-center justify-center">
            <app-empty-state title="Select a conversation" subtitle="Pick a message on the left to read and reply." [icon]="InboxLucide" />
          </div>
        } @else if (threadLoading()) {
          <div class="p-5 space-y-3">@for (i of [1,2,3]; track i) { <div class="skeleton h-24 w-full"></div> }</div>
        } @else if (thread(); as t) {
          <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <button class="btn-icon h-8 w-8 lg:hidden" (click)="selected.set(null)"><lucide-icon [img]="Back" [size]="16" /></button>
            <h2 class="font-semibold text-slate-900 dark:text-white truncate">{{ t.subject }}</h2>
          </div>
          <div class="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            @for (msg of t.messages; track msg.id) {
              <div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div class="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40">
                  <app-avatar [name]="msg.from || msg.fromEmail" [size]="30" [rounded]="0.5" />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{{ msg.from || msg.fromEmail }}</p>
                    <p class="text-xs text-slate-400 truncate">{{ msg.fromEmail }}</p>
                  </div>
                  <span class="text-xs text-slate-400 shrink-0">{{ msg.date | slice:0:16 }}</span>
                </div>
                <div class="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 prose-inbox" [innerHTML]="msg.html"></div>
              </div>
            }
          </div>
          <!-- Reply -->
          <div class="border-t border-slate-100 dark:border-slate-800 p-3">
            <textarea class="input min-h-[76px] resize-y" placeholder="Write a reply…" [(ngModel)]="replyText" [disabled]="sending()"></textarea>
            <div class="flex items-center justify-between mt-2">
              <span class="text-xs text-slate-400">Replies to {{ lastFrom() }}</span>
              <button class="btn-primary" (click)="sendReply()" [disabled]="!replyText.trim() || sending()">
                @if (sending()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> } @else { <lucide-icon [img]="SendIcon" [size]="16" /> }
                Send reply
              </button>
            </div>
          </div>
        }
      </div>
    </div>
    }
  `,
  styles: [`
    :host ::ng-deep .prose-inbox img { max-width: 100%; height: auto; }
    :host ::ng-deep .prose-inbox a { color: #0284c7; }
    :host ::ng-deep .prose-inbox table { max-width: 100%; }
  `],
})
export class Inbox {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  items = signal<InboxItem[]>([]);
  loading = signal(false);
  authNeeded = signal(false);
  authMessage = signal('');
  selected = signal<InboxItem | null>(null);
  thread = signal<InboxThread | null>(null);
  threadLoading = signal(false);
  replyText = '';
  sending = signal(false);

  folder = signal<'inbox' | 'sent' | 'unread'>('inbox');
  readonly folders = [
    { key: 'inbox' as const, label: 'Inbox' },
    { key: 'sent' as const, label: 'Sent' },
    { key: 'unread' as const, label: 'Unread' },
  ];

  constructor() { this.load(); }

  setFolder(f: 'inbox' | 'sent' | 'unread') {
    if (this.folder() === f) return;
    this.folder.set(f);
    this.selected.set(null);
    this.thread.set(null);
    this.items.set([]);
    this.load();
  }

  // For Sent mail show the recipient; elsewhere show the sender.
  displayName(m: InboxItem) { return this.folder() === 'sent' ? (m.to || m.toEmail) : (m.from || m.fromEmail); }

  isMobile() { return window.innerWidth < 1024; }
  lastFrom() { const m = this.thread()?.messages; return m?.length ? (m[m.length - 1].from || m[m.length - 1].fromEmail) : ''; }

  load() {
    this.loading.set(true);
    this.authNeeded.set(false);
    this.api.getInbox(this.folder()).subscribe({
      next: (list) => { this.items.set(list); this.loading.set(false); },
      error: (e) => {
        this.loading.set(false);
        const msg = e?.error?.message || '';
        // Any auth/permission problem → show the "connect Google" prompt instead of a toast.
        if ([400, 401, 403].includes(e?.status) || /google|permission|scope|reconnect|expired/i.test(msg)) {
          this.authMessage.set(msg);
          this.authNeeded.set(true);
        } else {
          this.toast.error('Could not load inbox', msg || 'Try again.');
        }
      },
    });
  }

  connectGoogle() { this.auth.startGoogleLogin(); }

  open(m: InboxItem) {
    this.selected.set(m);
    this.thread.set(null);
    this.replyText = '';
    this.threadLoading.set(true);
    this.api.getThread(m.threadId).subscribe({
      next: (t) => { this.thread.set(t); this.threadLoading.set(false); if (m.unread) { m.unread = false; } },
      error: (e) => { this.threadLoading.set(false); this.toast.error('Could not open conversation', e?.error?.message || 'Try again.'); },
    });
  }

  sendReply() {
    const t = this.thread();
    const text = this.replyText.trim();
    if (!t || !text) return;
    const html = `<div>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>`;
    this.sending.set(true);
    this.api.replyThread(t.threadId, html).subscribe({
      next: (r) => { this.sending.set(false); this.replyText = ''; this.toast.success('Reply sent', `To ${r.to}`); this.open(this.selected()!); },
      error: (e) => { this.sending.set(false); this.toast.error('Reply failed', e?.error?.message || 'Could not send reply.'); },
    });
  }

  readonly Refresh = RefreshCw; readonly SendIcon = Send; readonly Spinner = Loader2;
  readonly Back = CornerUpLeft; readonly MailIcon = Mail; readonly InboxLucide = InboxIcon;
}
