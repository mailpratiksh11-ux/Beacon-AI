import { Injectable, inject, signal, computed } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { Profile } from './models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private api = inject(ApiService);

  readonly profile = signal<Profile | null>(null);

  readonly name = computed(() => this.profile()?.name ?? '');
  readonly email = computed(() => this.profile()?.email ?? '');
  readonly gmailAccount = computed(() => this.profile()?.gmailAccount || this.profile()?.email || '');
  readonly gmailConnected = computed(() => this.profile()?.gmailConnected ?? false);
  readonly signature = computed(() => this.profile()?.signature ?? '');
  readonly initials = computed(() => this.profile()?.initials ?? '');
  readonly firstName = computed(() => this.name().split(' ')[0] ?? '');
  readonly mailConfigured = computed(() => this.profile()?.mailConfigured ?? false);
  readonly mailUser = computed(() => this.profile()?.mailUser ?? '');
  readonly googleConnected = computed(() => this.profile()?.googleConnected ?? false);
  // Can this user actually send? Google OAuth users send via Gmail API, no App Password needed.
  readonly canSend = computed(() => this.googleConnected() || this.mailConfigured());

  readonly plan = computed(() => this.profile()?.plan ?? 'free');
  readonly isPaid = computed(() => this.plan() !== 'free');
  readonly aiEnabled = computed(() => this.profile()?.aiEnabled ?? false);
  readonly aiModel = computed(() => this.profile()?.aiModel ?? '');
  readonly aiUseCustom = computed(() => this.profile()?.aiUseCustom ?? false);
  readonly aiCustomBaseUrl = computed(() => this.profile()?.aiCustomBaseUrl ?? '');
  readonly aiCustomModel = computed(() => this.profile()?.aiCustomModel ?? '');
  readonly aiCustomConfigured = computed(() => this.profile()?.aiCustomConfigured ?? false);

  load() {
    this.api.getProfile().subscribe({ next: (p) => this.profile.set(p) });
  }

  /** Optimistically patch the local profile then persist. */
  private patch(changes: Partial<Profile>) {
    const current = this.profile();
    if (current) this.profile.set({ ...current, ...changes });
    return this.api.updateProfile(changes);
  }

  setGmailConnected(connected: boolean) {
    return this.patch({ gmailConnected: connected });
  }

  // Simulated upgrade (billing not wired) + AI toggle.
  setPlan(plan: 'free' | 'pro' | 'business') {
    return this.patch({ plan });
  }
  setAiEnabled(aiEnabled: boolean) {
    return this.patch({ aiEnabled });
  }
  setAiModel(aiModel: string) {
    return this.patch({ aiModel });
  }
  // Switch default/custom or save custom provider details (returns canonical profile).
  saveAiConfig(payload: Partial<Profile> & { aiCustomApiKey?: string }) {
    return this.api.updateProfile(payload as any).pipe(tap((u) => this.profile.set(u)));
  }

  toggleGmail() {
    return this.setGmailConnected(!this.gmailConnected());
  }

  updateSignature(signature: string) {
    return this.patch({ signature });
  }

  updateName(name: string) {
    return this.api.updateProfile({ name } as any).pipe(tap((u) => this.profile.set(u)));
  }

  updateMailCredentials(payload: { mailUser: string; mailPassword?: string; mailHost?: string; mailPort?: number; mailFromName?: string }) {
    return this.api.updateProfile(payload as any).pipe(tap((u) => this.profile.set(u)));
  }
}
