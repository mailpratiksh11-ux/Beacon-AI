import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-angular';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { AuthShell } from '../shared/auth-shell';
import { OauthButtons } from '../shared/oauth-buttons';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, RouterLink, AuthShell, OauthButtons],
  template: `
    <app-auth-shell title="Create your account" subtitle="Start sending personalized cold emails." [error]="error()">
      <form (ngSubmit)="submit()" class="space-y-4">
        <div>
          <label class="label" for="reg-name">Full name</label>
          <div class="relative">
            <lucide-icon [img]="UserIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="reg-name" type="text" name="name" class="input pl-10" placeholder="Your name"
                   [(ngModel)]="name" (input)="error.set('')" [disabled]="!!busy()" autocomplete="name" />
          </div>
        </div>

        <div>
          <label class="label" for="reg-email">Email address</label>
          <div class="relative">
            <lucide-icon [img]="MailIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="reg-email" type="email" name="email" class="input pl-10" placeholder="you@company.com"
                   [(ngModel)]="email" (input)="error.set('')" [disabled]="!!busy()" autocomplete="email" required />
          </div>
        </div>

        <div>
          <label class="label" for="reg-password">Password</label>
          <div class="relative">
            <lucide-icon [img]="LockIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="reg-password" [type]="showPw() ? 'text' : 'password'" name="password" class="input pl-10 pr-10"
                   placeholder="At least 6 characters" [(ngModel)]="password" (input)="error.set('')" [disabled]="!!busy()" autocomplete="new-password" required />
            <button type="button" (click)="showPw.set(!showPw())"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
              <lucide-icon [img]="showPw() ? EyeOffIcon : EyeIcon" [size]="16" />
            </button>
          </div>
        </div>

        <button type="submit" class="btn-primary w-full py-3" [disabled]="!!busy()">
          @if (busy() === 'email') { <lucide-icon [img]="Spinner" [size]="18" class="animate-spin" /> }
          @else { Create account <lucide-icon [img]="Arrow" [size]="16" /> }
        </button>
      </form>

      <app-oauth-buttons [busy]="busy()" verb="Sign up" (google)="google()" (microsoft)="microsoft()" />

      <ng-container footer>
        Already have an account? <a routerLink="/login" class="font-medium text-brand-600 dark:text-brand-400 hover:underline">Log in</a>
      </ng-container>
    </app-auth-shell>
  `,
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  name = '';
  email = '';
  password = '';
  busy = signal<'' | 'email' | 'google' | 'microsoft'>('');
  showPw = signal(false);
  error = signal('');

  submit() {
    const email = this.email.trim();
    this.error.set('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.error.set('Please enter a valid email address.'); return; }
    if (this.password.length < 6) { this.error.set('Password must be at least 6 characters.'); return; }
    this.busy.set('email');
    this.auth.register(email, this.password, this.name.trim()).subscribe({
      next: () => { this.toast.success('Account created', 'Welcome to Beacon AI.'); this.router.navigateByUrl('/home'); },
      error: (e) => { this.busy.set(''); this.error.set(e?.error?.message || 'Could not create account.'); },
    });
  }

  // Both providers create the account on first consent, so signing up with them works.
  google() { this.busy.set('google'); this.auth.startGoogleLogin(); }
  microsoft() { this.busy.set('microsoft'); this.auth.startMicrosoftLogin(); }

  readonly MailIcon = Mail; readonly LockIcon = Lock; readonly UserIcon = User;
  readonly Arrow = ArrowRight; readonly Spinner = Loader2; readonly EyeIcon = Eye; readonly EyeOffIcon = EyeOff;
}
