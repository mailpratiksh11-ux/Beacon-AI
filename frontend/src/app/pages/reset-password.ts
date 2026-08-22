import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule, Lock, Loader2, Eye, EyeOff } from 'lucide-angular';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { AuthShell } from '../shared/auth-shell';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, RouterLink, AuthShell],
  template: `
    <app-auth-shell title="Set a new password" subtitle="Choose a new password for your account." [error]="error()">
      @if (!token) {
        <div class="rounded-xl border border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 px-4 py-3.5 text-sm text-red-700 dark:text-red-400">
          This reset link is missing its token. Request a new one from
          <a routerLink="/forgot-password" class="underline font-medium">Forgot password</a>.
        </div>
      } @else {
        <form (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="label" for="rp-password">New password</label>
            <div class="relative">
              <lucide-icon [img]="LockIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="rp-password" [type]="showPw() ? 'text' : 'password'" name="password" class="input pl-10 pr-10"
                     placeholder="At least 6 characters" [(ngModel)]="password" (input)="error.set('')" [disabled]="busy()" autocomplete="new-password" required />
              <button type="button" (click)="showPw.set(!showPw())"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
                <lucide-icon [img]="showPw() ? EyeOffIcon : EyeIcon" [size]="16" />
              </button>
            </div>
          </div>
          <div>
            <label class="label" for="rp-confirm">Confirm password</label>
            <div class="relative">
              <lucide-icon [img]="LockIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="rp-confirm" [type]="showPw() ? 'text' : 'password'" name="confirm" class="input pl-10"
                     placeholder="Re-enter password" [(ngModel)]="confirm" (input)="error.set('')" [disabled]="busy()" autocomplete="new-password" required />
            </div>
          </div>
          <button type="submit" class="btn-primary w-full py-3" [disabled]="busy()">
            @if (busy()) { <lucide-icon [img]="Spinner" [size]="18" class="animate-spin" /> }
            @else { Update password }
          </button>
        </form>
      }

      <ng-container footer>
        <a routerLink="/login" class="font-medium text-brand-600 dark:text-brand-400 hover:underline">Back to login</a>
      </ng-container>
    </app-auth-shell>
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
  showPw = signal(false);
  error = signal('');

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  submit() {
    this.error.set('');
    if (this.password.length < 6) { this.error.set('Password must be at least 6 characters.'); return; }
    if (this.password !== this.confirm) { this.error.set('Those passwords don’t match.'); return; }
    this.busy.set(true);
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => { this.toast.success('Password updated', 'You’re now signed in.'); this.router.navigateByUrl('/home'); },
      error: (e) => { this.busy.set(false); this.error.set(e?.error?.message || 'This link may have expired.'); },
    });
  }

  readonly LockIcon = Lock; readonly Spinner = Loader2; readonly EyeIcon = Eye; readonly EyeOffIcon = EyeOff;
}
