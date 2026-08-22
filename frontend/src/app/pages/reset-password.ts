import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule, Lock, Loader2 } from 'lucide-angular';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center px-5 py-10 bg-slate-50 dark:bg-slate-950">
      <div class="w-full max-w-sm animate-slide-up">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Set a new password</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1.5">Choose a new password for your account.</p>

        @if (!token) {
          <div class="mt-6 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            This reset link is missing its token. Request a new one from
            <a routerLink="/forgot-password" class="underline font-medium">Forgot password</a>.
          </div>
        } @else {
          <form (ngSubmit)="submit()" class="mt-7 space-y-4">
            <div>
              <label class="label">New password</label>
              <div class="relative">
                <lucide-icon [img]="LockIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" class="input pl-10" placeholder="At least 6 characters" [(ngModel)]="password" name="password" autocomplete="new-password" [disabled]="busy()" required />
              </div>
            </div>
            <div>
              <label class="label">Confirm password</label>
              <div class="relative">
                <lucide-icon [img]="LockIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" class="input pl-10" placeholder="Re-enter password" [(ngModel)]="confirm" name="confirm" autocomplete="new-password" [disabled]="busy()" required />
              </div>
            </div>
            <button type="submit" class="btn-primary w-full py-3" [disabled]="busy()">
              @if (busy()) { <lucide-icon [img]="Spinner" [size]="18" class="animate-spin" /> }
              @else { Update password }
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class ResetPassword implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  token = '';
  password = '';
  confirm = '';
  busy = signal(false);

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  submit() {
    if (this.password.length < 6) { this.toast.error('Weak password', 'Password must be at least 6 characters.'); return; }
    if (this.password !== this.confirm) { this.toast.error('Passwords don’t match', 'Please re-enter the same password.'); return; }
    this.busy.set(true);
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => { this.toast.success('Password updated', 'You’re now signed in.'); this.router.navigateByUrl('/home'); },
      error: (e) => { this.busy.set(false); this.toast.error('Reset failed', e?.error?.message || 'This link may have expired.'); },
    });
  }

  readonly LockIcon = Lock; readonly Spinner = Loader2;
}
