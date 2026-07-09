import { Component, inject, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, CheckCircle2, Plug, FileText, Sun, Moon, Monitor, Bell, Upload, Loader2, Trash2, Sparkles, Lock } from 'lucide-angular';
import { ProfileService } from '../core/profile.service';
import { ApiService } from '../core/api.service';
import { ThemeService } from '../core/theme.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { PageHeader } from '../shared/page-header';
import { Resume, AiStatus } from '../core/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [LucideAngularModule, FormsModule, RouterLink, PageHeader],
  template: `
    <app-page-header title="Settings" subtitle="Manage your account, Gmail connection, and preferences." />

    <div class="space-y-6 max-w-3xl">
      <!-- Profile -->
      <section class="card p-5">
        <h2 class="font-semibold text-slate-900 dark:text-white mb-1">Profile</h2>
        <p class="text-sm text-slate-400 mb-4">Your name and avatar shown across the app.</p>
        <div class="flex items-center gap-4 mb-4">
          <div class="h-12 w-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-semibold shrink-0">{{ profile.initials() || '—' }}</div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-900 dark:text-white truncate">{{ profile.name() || 'No name set' }}</p>
            <p class="text-xs text-slate-400 truncate">{{ profile.email() }}</p>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Full name</label>
            <input class="input" type="text" placeholder="Your name" [ngModel]="accountName()" (ngModelChange)="accountName.set($event)" />
          </div>
          <div>
            <label class="label">Email <span class="text-slate-400 font-normal">(from sign-in)</span></label>
            <input class="input opacity-70" type="email" [value]="profile.email()" disabled />
          </div>
        </div>
        <div class="flex justify-end mt-3">
          <button class="btn-primary" (click)="saveName()" [disabled]="savingName()">
            @if (savingName()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Saving… }
            @else { Save name }
          </button>
        </div>
      </section>

      <!-- Sending email -->
      <section class="card p-5">
        <div class="flex items-center justify-between mb-1">
          <h2 class="font-semibold text-slate-900 dark:text-white">Sending Email</h2>
          @if (profile.canSend()) {
            <span class="badge-success"><lucide-icon [img]="Check" [size]="12" /> Connected</span>
          } @else {
            <span class="badge-warn">Not connected</span>
          }
        </div>

        @if (profile.googleConnected()) {
          <!-- Signed in with Google → sending handled via Gmail API automatically. -->
          <div class="flex items-center gap-3 rounded-xl border border-success-500/30 bg-success-500/[0.06] px-4 py-3.5 mt-3">
            <div class="h-9 w-9 rounded-lg bg-success-500/15 flex items-center justify-center shrink-0">
              <lucide-icon [img]="Check" [size]="18" class="text-success-500" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-800 dark:text-slate-100">Sending via your Google account</p>
              <p class="text-xs text-slate-400 truncate">Campaigns send from <span class="font-medium">{{ profile.gmailAccount() }}</span> through Gmail — no App Password needed.</p>
            </div>
          </div>
          <p class="text-xs text-slate-400 mt-3">An App Password / SMTP setup isn't required while you're connected with Google.</p>
        } @else {
          <p class="text-sm text-slate-400 mb-4">
            Connect your own email so campaigns send from <span class="font-medium">your</span> address.
            For Gmail, create an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener" class="text-brand-600 dark:text-brand-400 underline">App Password</a> (needs 2-Step Verification),
            or <span class="font-medium">sign in with Google</span> to skip this entirely.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Email address</label>
              <input class="input" type="email" placeholder="you@gmail.com" [(ngModel)]="mail.mailUser" />
            </div>
            <div>
              <label class="label">App password {{ profile.mailConfigured() ? '(leave blank to keep)' : '' }}</label>
              <input class="input" type="password" placeholder="16-char app password" [(ngModel)]="mail.mailPassword" autocomplete="off" />
            </div>
            <div>
              <label class="label">From name <span class="text-slate-400 font-normal">(optional)</span></label>
              <input class="input" type="text" placeholder="Your Name" [(ngModel)]="mail.mailFromName" />
            </div>
            <div>
              <label class="label">SMTP host <span class="text-slate-400 font-normal">(optional — blank = Gmail)</span></label>
              <input class="input" type="text" placeholder="smtp-relay.brevo.com" [(ngModel)]="mail.mailHost" />
            </div>
          </div>

          <div class="flex items-center justify-between mt-4">
            <p class="text-xs text-slate-400">
              @if (profile.mailConfigured()) { Sending as <span class="font-medium">{{ profile.mailUser() }}</span> }
              @else { Until connected, sends run in test mode (preview links, not delivered). }
            </p>
            <button class="btn-primary" (click)="saveMail()" [disabled]="savingMail()">
              @if (savingMail()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Saving… }
              @else { <lucide-icon [img]="PlugIcon" [size]="16" /> {{ profile.mailConfigured() ? 'Update' : 'Connect' }} }
            </button>
          </div>
        }
      </section>

      <!-- AI Integration (gated by plan) -->
      <section class="card p-5">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <lucide-icon [img]="Spark" [size]="18" class="text-brand-500" />
            <h2 class="font-semibold text-slate-900 dark:text-white">AI Integration</h2>
          </div>
          @if (profile.isPaid()) {
            <span class="badge-success"><lucide-icon [img]="Check" [size]="12" /> Available</span>
          } @else {
            <span class="badge-neutral"><lucide-icon [img]="LockIcon" [size]="12" /> Pro</span>
          }
        </div>
        <p class="text-sm text-slate-400 mb-4">
          AI writing assistant — generate cold emails, subject lines and follow-ups from a prompt.
        </p>

        @if (profile.isPaid()) {
          <label class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 cursor-pointer">
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-800 dark:text-slate-100">Enable AI writing assistant</p>
              <p class="text-xs text-slate-400">Show AI suggestions while composing.</p>
            </div>
            <button type="button" role="switch" [attr.aria-checked]="profile.aiEnabled()" (click)="toggleAi()"
                    class="relative h-6 w-11 rounded-full transition-colors shrink-0"
                    [class]="profile.aiEnabled() ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'">
              <span class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform" [class.translate-x-5]="profile.aiEnabled()"></span>
            </button>
          </label>

          @if (profile.aiEnabled()) {
            <div class="mt-4 space-y-3">
              <div>
                <label class="label">Chat model</label>
                <select class="input" [ngModel]="profile.aiUseCustom() ? 'custom' : 'default'" (ngModelChange)="onModelChoice($event)">
                  <option value="default">Qwen3 32B (default · free · Groq)</option>
                  <option value="custom">Custom model — bring your own…</option>
                </select>
              </div>

              @if (profile.aiUseCustom()) {
                <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-3">
                  <p class="text-xs text-slate-400">Use any OpenAI-compatible provider (OpenAI, Groq, Together, OpenRouter, or your own endpoint).</p>
                  <div>
                    <label class="label">API base URL</label>
                    <input class="input" placeholder="https://api.openai.com/v1" [(ngModel)]="customAi.baseUrl" />
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="label">Model name</label>
                      <input class="input" placeholder="gpt-4o-mini" [(ngModel)]="customAi.model" />
                    </div>
                    <div>
                      <label class="label">API key {{ profile.aiCustomConfigured() ? '(leave blank to keep)' : '' }}</label>
                      <input class="input" type="password" placeholder="sk-…" [(ngModel)]="customAi.apiKey" autocomplete="off" />
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs inline-flex items-center gap-1" [class]="aiInfo()?.configured ? 'text-success-500' : 'text-amber-500'">
                      <lucide-icon [img]="aiInfo()?.configured ? Check : LockIcon" [size]="12" />
                      {{ aiInfo()?.configured ? 'Connected' : 'Not connected yet' }}
                    </span>
                    <button class="btn-primary" (click)="saveCustomAi()" [disabled]="savingAi()">
                      @if (savingAi()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Saving… }
                      @else { <lucide-icon [img]="Check" [size]="16" /> Save model }
                    </button>
                  </div>
                </div>
              } @else {
                <div class="flex items-center gap-2 text-xs">
                  @if (aiInfo()?.configured) {
                    <span class="text-success-500 inline-flex items-center gap-1"><lucide-icon [img]="Check" [size]="12" /> Qwen3 32B ready (free · Groq)</span>
                  } @else {
                    <span class="text-amber-500 inline-flex items-center gap-1"><lucide-icon [img]="LockIcon" [size]="12" /> Provider API key not set — add it to the ai_integration collection, or switch to a custom model.</span>
                  }
                </div>
              }
            </div>
          }
        } @else {
          <!-- Locked on Free -->
          <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-5 text-center">
            <div class="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
              <lucide-icon [img]="LockIcon" [size]="18" class="text-slate-400" />
            </div>
            <p class="text-sm font-medium text-slate-700 dark:text-slate-200">AI is a Pro feature</p>
            <p class="text-xs text-slate-400 mt-1 mb-4">Upgrade to unlock the AI writing assistant.</p>
            <a routerLink="/upgrade" class="btn-primary mx-auto"><lucide-icon [img]="Spark" [size]="15" /> Upgrade to Pro</a>
          </div>
        }
      </section>

      <!-- Signature -->
      <section class="card p-5">
        <h2 class="font-semibold text-slate-900 dark:text-white mb-1">Default Signature</h2>
        <p class="text-sm text-slate-400 mb-4">Appended to the bottom of every email.</p>
        <textarea class="input font-mono text-sm min-h-[110px]" rows="4" [ngModel]="signature()" (ngModelChange)="onSignatureInput($event)"></textarea>
        <div class="flex justify-end mt-3"><button class="btn-primary" (click)="save()">Save signature</button></div>
      </section>

      <!-- Default resume -->
      <section class="card p-5">
        <h2 class="font-semibold text-slate-900 dark:text-white mb-1">Default Resume</h2>
        <p class="text-sm text-slate-400 mb-4">Upload a PDF or Word doc to attach to job-application campaigns.</p>

        <input #fileInput type="file" accept=".pdf,.doc,.docx,application/pdf" class="hidden" (change)="onResumeSelected($event)" />

        @if (!resumesLoaded()) {
          <div class="skeleton h-14 w-full"></div>
        } @else if (resumes().length === 0) {
          <button type="button" (click)="fileInput.click()" [disabled]="uploading()"
                  class="w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/40 dark:hover:bg-brand-500/5 transition-colors py-7 flex flex-col items-center gap-2 disabled:opacity-60">
            @if (uploading()) {
              <lucide-icon [img]="Spinner" [size]="20" class="text-brand-500 animate-spin" />
              <span class="text-sm text-slate-500">Uploading…</span>
            } @else {
              <div class="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center"><lucide-icon [img]="UploadIcon" [size]="18" class="text-brand-500" /></div>
              <span class="text-sm font-medium text-slate-700 dark:text-slate-200">Click to upload your resume</span>
              <span class="text-xs text-slate-400">PDF or Word · up to 10 MB</span>
            }
          </button>
        } @else {
          <div class="space-y-2">
            @for (r of resumes(); track r.id) {
              <div class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 animate-scale-in">
                <div class="h-9 w-9 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0"><lucide-icon [img]="FileIcon" [size]="16" class="text-red-500" /></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{{ r.filename }}</p>
                  <p class="text-xs text-slate-400">{{ formatSize(r.size) }} · uploaded {{ r.createdAt }}</p>
                </div>
                <a [href]="downloadUrl(r.id)" target="_blank" rel="noopener" class="btn-secondary h-8 px-3 text-xs">Download</a>
                <button class="btn-icon h-8 w-8 hover:text-red-500" (click)="removeResume(r.id, r.filename)"><lucide-icon [img]="TrashIcon" [size]="15" /></button>
              </div>
            }
            <button type="button" (click)="fileInput.click()" [disabled]="uploading()" class="btn-secondary w-full mt-1">
              @if (uploading()) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> Uploading… }
              @else { <lucide-icon [img]="UploadIcon" [size]="16" /> Upload another }
            </button>
          </div>
        }
      </section>

      <!-- Theme -->
      <section class="card p-5">
        <h2 class="font-semibold text-slate-900 dark:text-white mb-1">Appearance</h2>
        <p class="text-sm text-slate-400 mb-4">Choose how Beacon AI looks to you.</p>
        <div class="grid grid-cols-3 gap-3">
          @for (opt of themeOptions; track opt.value) {
            <button class="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors"
                    [class]="theme.theme() === opt.value ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/5' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'"
                    (click)="setTheme(opt.value)">
              <lucide-icon [img]="opt.icon" [size]="20" [class]="theme.theme() === opt.value ? 'text-brand-500' : 'text-slate-400'" />
              <span class="text-sm font-medium" [class]="theme.theme() === opt.value ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-300'">{{ opt.label }}</span>
            </button>
          }
        </div>
      </section>

      <!-- Notifications -->
      <section class="card p-5">
        <h2 class="font-semibold text-slate-900 dark:text-white mb-1">Notifications</h2>
        <p class="text-sm text-slate-400 mb-4">Choose what you want to be notified about.</p>
        <div class="divide-y divide-slate-100 dark:divide-slate-800">
          @for (n of notifSettings; track n.label) {
            <div class="flex items-center justify-between py-3.5">
              <div><p class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ n.label }}</p><p class="text-xs text-slate-400">{{ n.desc }}</p></div>
              <button class="relative h-6 w-11 rounded-full transition-colors shrink-0"
                      [class]="n.on ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'" (click)="n.on = !n.on">
                <span class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" [class]="n.on ? 'left-[22px]' : 'left-0.5'"></span>
              </button>
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class Settings {
  profile = inject(ProfileService);
  private api = inject(ApiService);
  theme = inject(ThemeService);
  private confirm = inject(ConfirmService);
  toast = inject(ToastService);

  signature = signal('');
  private dirty = false;

  accountName = signal('');
  savingName = signal(false);

  mail = { mailUser: '', mailPassword: '', mailHost: '', mailFromName: '', mailPort: 587 };
  private mailSeeded = false;
  savingMail = signal(false);

  resumes = signal<Resume[]>([]);
  resumesLoaded = signal(false);
  uploading = signal(false);

  constructor() {
    effect(() => {
      // Seed the editable signature from the loaded profile until the user edits it.
      const s = this.profile.signature();
      if (!this.dirty) this.signature.set(s);

      // Seed the sending-email form + name once, when the profile first loads (password stays blank).
      const p = this.profile.profile();
      if (p && !this.mailSeeded) {
        this.accountName.set(p.name || '');
        this.mail.mailUser = p.mailUser || '';
        this.mail.mailHost = p.mailHost || '';
        this.mail.mailFromName = p.mailFromName || '';
        this.mail.mailPort = p.mailPort || 587;
        this.mailSeeded = true;
      }
    });
    this.loadResumes();
    this.loadAi();
  }

  saveName() {
    const name = this.accountName().trim();
    if (!name) { this.toast.error('Name required', 'Enter your name.'); return; }
    this.savingName.set(true);
    this.profile.updateName(name).subscribe({
      next: () => { this.savingName.set(false); this.toast.success('Name updated', name); },
      error: (e) => { this.savingName.set(false); this.toast.error('Save failed', e?.error?.message || 'Could not update name.'); },
    });
  }

  saveMail() {
    if (!this.mail.mailUser) { this.toast.error('Email required', 'Enter your sending email address.'); return; }
    if (!this.profile.mailConfigured() && !this.mail.mailPassword) {
      this.toast.error('App password required', 'Enter your app password to connect.');
      return;
    }
    this.savingMail.set(true);
    const payload: any = { mailUser: this.mail.mailUser, mailHost: this.mail.mailHost, mailFromName: this.mail.mailFromName, mailPort: this.mail.mailPort };
    if (this.mail.mailPassword) payload.mailPassword = this.mail.mailPassword;
    this.profile.updateMailCredentials(payload).subscribe({
      next: () => { this.savingMail.set(false); this.mail.mailPassword = ''; this.toast.success('Sending email connected', this.mail.mailUser); },
      error: (e) => { this.savingMail.set(false); this.toast.error('Save failed', e?.error?.message || 'Could not save credentials.'); },
    });
  }

  private loadResumes() {
    this.api.listResumes().subscribe({
      next: (r) => { this.resumes.set(r); this.resumesLoaded.set(true); },
      error: () => this.resumesLoaded.set(true),
    });
  }

  onResumeSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.api.uploadResume(file).subscribe({
      next: () => { this.uploading.set(false); this.loadResumes(); this.toast.success('Resume uploaded', file.name); input.value = ''; },
      error: (e) => { this.uploading.set(false); input.value = ''; this.toast.error('Upload failed', e?.error?.message || 'Could not upload the file.'); },
    });
  }

  async removeResume(id: string, name: string) {
    const ok = await this.confirm.ask({ title: 'Remove resume?', message: `“${name}” will be deleted.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    this.resumes.update((l) => l.filter((r) => r.id !== id));
    this.api.deleteResume(id).subscribe({ error: () => this.loadResumes() });
    this.toast.success('Resume removed');
  }

  downloadUrl(id: string) { return this.api.resumeDownloadUrl(id); }

  formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onSignatureInput(v: string) { this.dirty = true; this.signature.set(v); }

  themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'light' as const, label: 'System', icon: Monitor },
  ];

  notifSettings = [
    { label: 'Campaign completed', desc: 'When a campaign finishes sending.', on: true },
    { label: 'Email bounced', desc: 'When a recipient address bounces.', on: true },
    { label: 'Daily summary', desc: 'A recap of your sending activity.', on: false },
    { label: 'Product updates', desc: 'New features and improvements.', on: true },
  ];

  setTheme(t: 'light' | 'dark') { this.theme.theme.set(t); }

  async disconnect() {
    const ok = await this.confirm.ask({ title: 'Disconnect Gmail?', message: 'You won’t be able to send campaigns until you reconnect.', confirmText: 'Disconnect', danger: true });
    if (!ok) return;
    this.profile.setGmailConnected(false).subscribe();
    this.toast.warning('Gmail disconnected');
  }
  reconnect() {
    this.profile.setGmailConnected(true).subscribe();
    this.toast.success('Gmail connected', this.profile.gmailAccount());
  }
  save() {
    this.dirty = false;
    this.profile.updateSignature(this.signature()).subscribe();
    this.toast.success('Signature saved');
  }

  readonly Check = CheckCircle2; readonly PlugIcon = Plug; readonly FileIcon = FileText; readonly BellIcon = Bell;
  readonly UploadIcon = Upload; readonly Spinner = Loader2; readonly TrashIcon = Trash2;
  readonly Spark = Sparkles; readonly LockIcon = Lock;

  aiInfo = signal<AiStatus | null>(null);
  savingAi = signal(false);
  customAi = { baseUrl: '', model: '', apiKey: '' };
  private customAiSeeded = false;

  loadAi() {
    this.api.aiStatus().subscribe({
      next: (s) => {
        this.aiInfo.set(s);
        if (!this.customAiSeeded) { this.customAi.baseUrl = s.customBaseUrl || ''; this.customAi.model = s.customModel || ''; this.customAiSeeded = true; }
      },
      error: () => {},
    });
  }

  toggleAi() {
    const next = !this.profile.aiEnabled();
    this.profile.setAiEnabled(next).subscribe({
      next: () => { this.toast.success(next ? 'AI enabled' : 'AI disabled', next ? 'AI writing assistant is on.' : 'AI writing assistant is off.'); if (next) this.loadAi(); },
      error: () => this.toast.error('Could not update AI setting'),
    });
  }

  onModelChoice(choice: string) {
    const useCustom = choice === 'custom';
    this.profile.saveAiConfig({ aiUseCustom: useCustom }).subscribe({
      next: () => { this.loadAi(); this.toast.success(useCustom ? 'Custom model' : 'Default model', useCustom ? 'Enter your provider details below.' : 'Using Qwen3 (free).'); },
      error: () => this.toast.error('Could not switch model'),
    });
  }

  saveCustomAi() {
    if (!this.customAi.baseUrl.trim() || !this.customAi.model.trim()) { this.toast.error('Missing details', 'Enter the API base URL and model name.'); return; }
    if (!this.profile.aiCustomConfigured() && !this.customAi.apiKey.trim()) { this.toast.error('API key required', 'Enter your provider API key.'); return; }
    this.savingAi.set(true);
    const payload: any = { aiUseCustom: true, aiCustomBaseUrl: this.customAi.baseUrl.trim(), aiCustomModel: this.customAi.model.trim() };
    if (this.customAi.apiKey.trim()) payload.aiCustomApiKey = this.customAi.apiKey.trim();
    this.profile.saveAiConfig(payload).subscribe({
      next: () => { this.savingAi.set(false); this.customAi.apiKey = ''; this.loadAi(); this.toast.success('AI model saved', 'Your custom model is set.'); },
      error: (e) => { this.savingAi.set(false); this.toast.error('Could not save', e?.error?.message || 'Try again.'); },
    });
  }
}
