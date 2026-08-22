import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-angular';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { LogoMark } from '../shared/logo-mark';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, RouterLink, LogoMark],
  template: `
    <div class="min-h-screen flex items-center justify-center px-5 py-10 bg-slate-50 dark:bg-slate-950">
      <div class="w-full max-w-sm animate-slide-up">
        <div class="flex items-center gap-2.5 mb-8">
          <app-logo-mark [size]="40" />
          <span class="font-bold text-slate-900 dark:text-white text-lg">Beacon <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 align-middle">AI</span></span>
        </div>

        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create your account</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1.5">Start sending personalized cold emails.</p>

        <form (ngSubmit)="submit()" class="mt-7 space-y-4">
          <div>
            <label class="label">Full name</label>
            <div class="relative">
              <lucide-icon [img]="UserIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" class="input pl-10" placeholder="Your name" [(ngModel)]="name" name="name" [disabled]="busy()" />
            </div>
          </div>
          <div>
            <label class="label">Email address</label>
            <div class="relative">
              <lucide-icon [img]="MailIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" class="input pl-10" placeholder="you@company.com" [(ngModel)]="email" name="email" autocomplete="email" [disabled]="busy()" required />
            </div>
          </div>
          <div>
            <label class="label">Password</label>
            <div class="relative">
              <lucide-icon [img]="LockIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input [type]="showPw() ? 'text' : 'password'" class="input pl-10 pr-10" placeholder="At least 6 characters" [(ngModel)]="password" name="password" autocomplete="new-password" [disabled]="busy()" required />
              <button type="button" (click)="showPw.set(!showPw())" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
                <lucide-icon [img]="showPw() ? EyeOffIcon : EyeIcon" [size]="16" />
              </button>
            </div>
          </div>
          <button type="submit" class="btn-primary w-full py-3" [disabled]="busy()">
            @if (busy()) { <lucide-icon [img]="Spinner" [size]="18" class="animate-spin" /> }
            @else { <span>Create account</span> <lucide-icon [img]="Arrow" [size]="16" /> }
          </button>
        </form>

        <p class="text-sm text-slate-500 dark:text-slate-400 mt-6 text-center">
          Already have an account?
          <a routerLink="/login" class="font-medium text-brand-600 dark:text-brand-400 hover:underline">Log in</a>
        </p>
      </div>
    </div>
  `,
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  name = '';
  email = '';
  password = '';
  busy = signal(false);
  showPw = signal(false);

  submit() {
    const email = this.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.toast.error('Invalid email', 'Enter a valid email address.'); return; }
    if (this.password.length < 6) { this.toast.error('Weak password', 'Password must be at least 6 characters.'); return; }
    this.busy.set(true);
    this.auth.register(email, this.password, this.name.trim()).subscribe({
      next: () => { this.toast.success('Account created', 'Welcome to Beacon AI.'); this.router.navigateByUrl('/home'); },
      error: (e) => { this.busy.set(false); this.toast.error('Sign up failed', e?.error?.message || 'Could not create account.'); },
    });
  }

  readonly MailIcon = Mail; readonly LockIcon = Lock; readonly UserIcon = User; readonly Arrow = ArrowRight; readonly Spinner = Loader2;
  readonly EyeIcon = Eye; readonly EyeOffIcon = EyeOff;
}
