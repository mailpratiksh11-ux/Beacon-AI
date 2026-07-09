import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { LogoMark } from '../shared/logo-mark';

type Role = 'mkt' | 'hr' | 'rec' | 'job' | 'sales' | 'found';
interface Persona { emoji: string; name: string; role: Role; }
interface Col { reverse: boolean; dur: number; items: Persona[]; }

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, LogoMark],
  template: `
    <div class="stage">
      <!-- Animated people background: the professions that use Beacon -->
      <div class="people" aria-hidden="true">
        @for (col of columns; track $index) {
          <div class="col" [class.rev]="col.reverse">
            <div class="track" [style.--dur]="col.dur + 's'">
              @for (p of col.items; track $index) {
                <div class="persona">
                  <span class="face" [style.background]="tint(p.role)">{{ p.emoji }}</span>
                  <span class="who">
                    <b>{{ p.name }}</b>
                    <span class="role" [class]="'r-' + p.role">{{ label(p.role) }}</span>
                  </span>
                </div>
              }
            </div>
          </div>
        }
      </div>
      <div class="scrim"></div>

      <!-- Login card -->
      <div class="card">
        <div class="pill"><span class="dot"></span> Trusted by marketers, recruiters &amp; job seekers</div>
        <div class="logo">
          <app-logo-mark [size]="36" />
          <b>Beacon</b><span class="ai">AI</span>
        </div>
        <h1>Welcome back</h1>
        <p class="sub">Sign in to reach the right people.</p>

        <form (ngSubmit)="submit()">
          <div class="field">
            <label>Email address</label>
            <div class="inp" [class.bad]="error()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></svg>
              <input type="email" name="email" placeholder="you@company.com" [(ngModel)]="email" (input)="error.set('')" [disabled]="!!busy()" autocomplete="email" />
            </div>
          </div>
          <div class="field">
            <div class="rowlab"><label>Password</label><a routerLink="/forgot-password">Forgot password?</a></div>
            <div class="inp" [class.bad]="error()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input [type]="showPw() ? 'text' : 'password'" name="password" placeholder="••••••••" [(ngModel)]="password" (input)="error.set('')" [disabled]="!!busy()" autocomplete="current-password" />
              <button type="button" class="eye" (click)="showPw.set(!showPw())" [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
                @if (showPw()) {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.1 6.1A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.1 9.1 0 0 0 5.9-2.1"/><path d="m2 2 20 20"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>
          @if (error()) {
            <div class="err" role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              {{ error() }}
            </div>
          }
          <button type="submit" class="btn" [disabled]="!!busy()">
            @if (busy() === 'email') { <span class="spin"></span> }
            @else {
              Log in
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            }
          </button>
          <div class="divider">or</div>
          <button type="button" class="gbtn" [disabled]="!!busy()" (click)="google()">
            @if (busy() === 'google') { <span class="spin dark"></span> }
            @else {
              <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>
              Continue with Google
            }
          </button>
          <p class="foot">New to Beacon? <a routerLink="/register">Create an account</a></p>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .stage { position: fixed; inset: 0; display: grid; place-items: center; background: #090b14; overflow: hidden; }

    .people { position: absolute; inset: 0; display: flex; gap: 22px; justify-content: center; padding: 0 8px; transform: rotate(-6deg) scale(1.25); transform-origin: center; }
    .col { width: 210px; flex: none; overflow: hidden; -webkit-mask-image: linear-gradient(transparent, #000 12%, #000 88%, transparent); mask-image: linear-gradient(transparent, #000 12%, #000 88%, transparent); }
    @media (max-width: 900px) { .col:nth-child(4), .col:nth-child(5) { display: none; } }
    @media (max-width: 620px) { .col:nth-child(3) { display: none; } .people { gap: 16px; transform: rotate(-8deg) scale(1.5); } }
    .track { display: flex; flex-direction: column; gap: 18px; animation: up var(--dur, 40s) linear infinite; will-change: transform; }
    .col.rev .track { animation-name: down; }
    @keyframes up   { from { transform: translateY(0); } to { transform: translateY(-50%); } }
    @keyframes down { from { transform: translateY(-50%); } to { transform: translateY(0); } }
    @media (prefers-reduced-motion: reduce) { .track { animation: none; } }

    .persona { background: rgba(255,255,255,.9); border: 1px solid rgba(255,255,255,.6); border-radius: 18px; padding: 14px 16px; display: flex; align-items: center; gap: 13px; box-shadow: 0 10px 30px -14px rgba(0,0,0,.5); }
    .face { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; font-size: 26px; flex: none; line-height: 1; }
    .who { min-width: 0; }
    .who b { display: block; font-size: 13.5px; color: #0b1220; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .role { font-size: 11.5px; font-weight: 600; margin-top: 2px; display: inline-block; padding: 1px 8px; border-radius: 999px; }
    .r-mkt { background: #ede9fe; color: #6d28d9; } .r-hr { background: #dcfce7; color: #15803d; }
    .r-rec { background: #dbeafe; color: #1d4ed8; } .r-job { background: #ffedd5; color: #c2410c; }
    .r-sales { background: #cffafe; color: #0e7490; } .r-found { background: #fce7f3; color: #be185d; }

    .scrim { position: absolute; inset: 0; background:
      radial-gradient(80% 70% at 50% 48%, rgba(9,11,20,.55), rgba(9,11,20,.9) 78%),
      linear-gradient(180deg, rgba(99,102,241,.22), rgba(9,11,20,.5)); }

    .card { position: relative; width: min(392px, 90vw); background: rgba(14,19,40,.62); backdrop-filter: blur(22px) saturate(1.25); -webkit-backdrop-filter: blur(22px) saturate(1.25); border: 1px solid rgba(255,255,255,.14); border-radius: 24px; padding: 34px 32px; box-shadow: 0 40px 90px -34px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.08); color: #fff; animation: rise .6s cubic-bezier(.16,1,.3,1) both; }
    @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .card { animation: none; } }

    .pill { display: inline-flex; align-items: center; gap: 8px; font-size: 11.5px; color: #cdd7ec; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); padding: 5px 12px; border-radius: 999px; margin-bottom: 18px; }
    .pill .dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 9px #10b981; }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .logo .m { width: 36px; height: 36px; border-radius: 11px; background: linear-gradient(140deg,#3b82f6,#1d4ed8); display: grid; place-items: center; }
    .logo .m svg { width: 18px; height: 18px; color: #fff; }
    .logo b { font-size: 16px; letter-spacing: -.01em; }
    .logo .ai { font-size: 10px; font-weight: 700; color: #a5b4fc; background: rgba(99,102,241,.20); padding: 2px 6px; border-radius: 5px; }
    h1 { font-size: 25px; margin: 6px 0 6px; letter-spacing: -.02em; }
    .sub { font-size: 14px; color: #a9b4cc; margin: 0 0 24px; line-height: 1.5; }

    .field { margin-bottom: 14px; }
    .field label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 7px; color: #d7deee; }
    .rowlab { display: flex; justify-content: space-between; align-items: center; }
    .rowlab a { font-size: 12px; color: #a5b4fc; text-decoration: none; font-weight: 600; }
    .rowlab a:hover { text-decoration: underline; }
    .inp { position: relative; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; height: 46px; transition: border-color .15s, box-shadow .15s, background .15s; }
    .inp:focus-within { border-color: #7c7fff; background: rgba(255,255,255,.07); box-shadow: 0 0 0 3px rgba(99,102,241,.28); }
    .inp > svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #93a1bd; pointer-events: none; }
    .inp input { width: 100%; height: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; color: #fff; padding: 0 14px 0 39px; border-radius: 12px; }
    .inp:has(.eye) input { padding-right: 44px; }
    .inp input::placeholder { color: #7c88a3; }
    .eye { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); display: grid; place-items: center; background: none; border: 0; cursor: pointer; padding: 4px; color: #7c88a3; }
    .eye:hover { color: #fff; }
    .eye svg { width: 17px; height: 17px; }
    /* hide the browser's native password reveal control (Edge/Chrome) so only our toggle shows */
    .inp input::-ms-reveal, .inp input::-ms-clear { display: none; }
    /* kill the ugly browser autofill box + keep dark theme */
    .inp input:-webkit-autofill,
    .inp input:-webkit-autofill:hover,
    .inp input:-webkit-autofill:focus {
      -webkit-text-fill-color: #fff;
      caret-color: #fff;
      -webkit-box-shadow: 0 0 0 1000px #181c2e inset;
      border-radius: 12px;
      transition: background-color 9999s ease-in-out 0s;
    }
    .btn { width: 100%; height: 48px; border: 0; border-radius: 14px; background: linear-gradient(180deg,#7c7fff,#6366f1); color: #fff; font: inherit; font-size: 14.5px; font-weight: 600; cursor: pointer; margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: box-shadow .2s, transform .12s; box-shadow: 0 8px 22px -8px rgba(99,102,241,.6); }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 14px 32px -8px rgba(124,127,255,.65); } .btn:active { transform: scale(.99); }
    .divider { display: flex; align-items: center; gap: 12px; margin: 18px 0; color: #8b93a7; font-size: 12px; }
    .divider::before, .divider::after { content: ""; height: 1px; flex: 1; background: rgba(255,255,255,.14); }
    .gbtn { width: 100%; height: 46px; border: 0; border-radius: 12px; background: rgba(255,255,255,.94); color: #0b1220; font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; transition: background .15s; }
    .gbtn:hover { background: #fff; } .gbtn svg { width: 17px; height: 17px; }
    .foot { text-align: center; font-size: 13px; color: #a9b4cc; margin: 22px 0 0; }
    .foot a { color: #a5b4fc; text-decoration: none; font-weight: 600; }
    .foot a:hover { text-decoration: underline; }
    button:disabled { opacity: .7; pointer-events: none; }
    .btn:focus-visible, .gbtn:focus-visible, a:focus-visible { outline: 2px solid #818cf8; outline-offset: 2px; }
    /* the field shows focus via the .inp container ring — never draw an inner box on the input itself */
    .inp input:focus, .inp input:focus-visible { outline: none; box-shadow: none; }
    /* invalid state + inline error */
    .inp.bad { border-color: #f87171; box-shadow: 0 0 0 3px rgba(248,113,113,.22); }
    .err { display: flex; align-items: center; gap: 7px; margin-top: 10px; font-size: 12.5px; color: #fca5a5; background: rgba(248,113,113,.10); border: 1px solid rgba(248,113,113,.28); padding: 8px 11px; border-radius: 10px; }
    .err svg { width: 15px; height: 15px; flex: none; }

    .spin { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; animation: spin .7s linear infinite; }
    .spin.dark { border-color: rgba(11,18,32,.25); border-top-color: #0b1220; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class Login implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  email = '';
  password = '';
  busy = signal<'' | 'email' | 'google'>('');
  showPw = signal(false);
  error = signal('');

  private roleLabel: Record<Role, string> = { mkt: 'Marketing', hr: 'HR', rec: 'Recruiter', job: 'Job Seeker', sales: 'Sales', found: 'Founder' };
  private roleTint: Record<Role, string> = { mkt: '#f5f3ff', hr: '#f0fdf4', rec: '#eff6ff', job: '#fff7ed', sales: '#ecfeff', found: '#fdf2f8' };
  private people: Persona[] = [
    { emoji: '👩🏽‍💼', name: 'Priya Menon', role: 'mkt' },
    { emoji: '🧑🏾‍💼', name: 'Amara Okoye', role: 'hr' },
    { emoji: '👨🏽‍💼', name: 'Raj Malhotra', role: 'rec' },
    { emoji: '👩🏻‍🎓', name: 'Mia Chen', role: 'job' },
    { emoji: '👨🏼‍💼', name: 'Leo Alvarez', role: 'sales' },
    { emoji: '🧑🏻‍💼', name: 'Kai Nowak', role: 'found' },
    { emoji: '👨🏻‍💻', name: 'Noah Park', role: 'job' },
    { emoji: '👩🏾‍💼', name: 'Zara Hussain', role: 'mkt' },
    { emoji: '🧑🏼‍💼', name: 'Sam Rivera', role: 'rec' },
    { emoji: '👩🏼‍💼', name: 'Elena Costa', role: 'hr' },
    { emoji: '👨🏾‍🎓', name: 'Marcus Dube', role: 'job' },
    { emoji: '👩🏽‍💻', name: 'Nina Kapoor', role: 'found' },
    { emoji: '🧑🏻‍💻', name: 'Dev Sharma', role: 'sales' },
    { emoji: '👩🏿‍💼', name: 'Aisha Bello', role: 'mkt' },
    { emoji: '👨🏻‍💼', name: 'Tom Becker', role: 'rec' },
    { emoji: '🧑🏽‍🎓', name: 'Ana Duarte', role: 'job' },
    { emoji: '👩🏻‍💼', name: 'Grace Lin', role: 'hr' },
    { emoji: '👨🏽‍💻', name: 'Omar Haddad', role: 'found' },
  ];

  columns: Col[] = this.buildColumns();

  label(r: Role) { return this.roleLabel[r]; }
  tint(r: Role) { return this.roleTint[r]; }

  private buildColumns(): Col[] {
    const durations = [46, 38, 52, 42, 48];
    const reverse = [false, true, false, true, false];
    return durations.map((dur, i) => {
      const shuffled = this.shuffle(this.people);
      return { dur, reverse: reverse[i], items: [...shuffled, ...shuffled] }; // duplicate for seamless loop
    });
  }
  private shuffle(arr: Persona[]): Persona[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  ngOnInit() {
    const err = this.route.snapshot.queryParamMap.get('error');
    if (!err) return;
    const messages: Record<string, string> = {
      google_not_configured: 'Google sign-in isn’t set up on the server yet. Use email, or add Google OAuth credentials.',
      google_denied: 'Google sign-in was cancelled.',
      google_failed: 'Google sign-in failed. Please try again.',
    };
    this.toast.error('Google sign-in', messages[err] || 'Could not sign in with Google.');
  }

  submit() {
    const email = this.email.trim();
    this.error.set('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.error.set('Please enter a valid email address.'); return; }
    if (!this.password) { this.error.set('Please enter your password.'); return; }
    this.busy.set('email');
    this.auth.login(email, this.password).subscribe({
      next: () => { this.toast.success('Signed in', 'Welcome back to Beacon AI.'); this.router.navigateByUrl('/home'); },
      error: (e) => { this.busy.set(''); this.error.set(e?.error?.message || 'Incorrect email or password.'); },
    });
  }

  google() {
    this.busy.set('google');
    this.auth.startGoogleLogin();
  }
}
