import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { AuthShell } from '../shared/auth-shell';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthShell],
  template: `
    <app-auth-shell
      pill="Free to start &mdash; no card required"
      title="Create your account"
      subtitle="Start sending personalized cold emails.">

      <form (ngSubmit)="submit()">
        <div class="auth-field">
          <label for="reg-name">Full name</label>
          <div class="auth-inp">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <input id="reg-name" type="text" name="name" placeholder="Your name"
                   [(ngModel)]="name" (input)="error.set('')" [disabled]="!!busy()" autocomplete="name" />
          </div>
        </div>

        <div class="auth-field">
          <label for="reg-email">Email address</label>
          <div class="auth-inp" [class.bad]="error()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></svg>
            <input id="reg-email" type="email" name="email" placeholder="you@company.com"
                   [(ngModel)]="email" (input)="error.set('')" [disabled]="!!busy()" autocomplete="email" />
          </div>
        </div>

        <div class="auth-field">
          <label for="reg-password">Password</label>
          <div class="auth-inp" [class.bad]="error()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input id="reg-password" [type]="showPw() ? 'text' : 'password'" name="password" placeholder="At least 6 characters"
                   [(ngModel)]="password" (input)="error.set('')" [disabled]="!!busy()" autocomplete="new-password" />
            <button type="button" class="auth-eye" (click)="showPw.set(!showPw())" [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
              @if (showPw()) {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.1 6.1A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.1 9.1 0 0 0 5.9-2.1"/><path d="m2 2 20 20"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
        </div>

        @if (error()) {
          <div class="auth-err" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            {{ error() }}
          </div>
        }

        <button type="submit" class="auth-btn" [disabled]="!!busy()">
          @if (busy() === 'email') { <span class="auth-spin"></span> }
          @else {
            Create account
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          }
        </button>
      </form>

      <ng-container footer>
        Already have an account? <a routerLink="/login">Log in</a>
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
  busy = signal<'' | 'email'>('');
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
}
