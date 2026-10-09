import { Component, Input, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoMark } from './logo-mark';

type Role = 'mkt' | 'hr' | 'rec' | 'job' | 'sales' | 'found';
interface Persona { emoji: string; name: string; role: Role; }
interface Col { reverse: boolean; dur: number; items: Persona[]; }

/**
 * Shared frame for every auth screen (login, register, forgot, reset).
 *
 * Holds the whole treatment — drifting role columns, scrim, card — so all four
 * screens look identical and cannot drift apart again. Previously this lived as
 * 89 lines of component CSS inside login.ts alone, which is why register looked
 * like a different product.
 *
 * Encapsulation is disabled so the styles below reach the form each page
 * projects in. Safe because every selector is auth- prefixed.
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink, LogoMark],
  template: `
    <div class="auth-stage">
      <div class="auth-people" aria-hidden="true">
        @for (col of columns; track $index) {
          <div class="auth-col" [class.rev]="col.reverse">
            <div class="auth-track" [style.--dur]="col.dur + 's'">
              @for (p of col.items; track $index) {
                <div class="auth-persona">
                  <span class="auth-face" [style.background]="tint(p.role)">{{ p.emoji }}</span>
                  <span class="auth-who">
                    <b>{{ p.name }}</b>
                    <span class="auth-role" [class]="'auth-role r-' + p.role">{{ label(p.role) }}</span>
                  </span>
                </div>
              }
            </div>
          </div>
        }
      </div>
      <div class="auth-scrim" aria-hidden="true"></div>

      <div class="auth-scroll">
        <div class="auth-card">
        @if (backLink) {
          <a class="auth-back" [routerLink]="backLink">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
            {{ backLabel }}
          </a>
        }

        @if (pill) {
          <div class="auth-pill"><span class="dot"></span> {{ pill }}</div>
        }

        <div class="auth-logo">
          <app-logo-mark [size]="36" />
          <b>Beacon</b><span class="ai">AI</span>
        </div>

        <h1>{{ title }}</h1>
        @if (subtitle) { <p class="auth-sub">{{ subtitle }}</p> }

        <ng-content></ng-content>

          <p class="auth-foot"><ng-content select="[footer]"></ng-content></p>
        </div>
      </div>
    </div>
  `,
  /**
   * Encapsulation is disabled so these styles reach the form each page projects
   * in — Angular's emulated scoping would not. Safe because every selector is
   * `auth-` prefixed, so nothing collides with .card / .btn / .input. Kept on
   * the component (rather than in global styles.scss) so it ships in the lazy
   * auth chunk instead of the initial bundle.
   */
  encapsulation: ViewEncapsulation.None,
  styles: [`

  /* Auth screens: login / register / forgot / reset.
     Every selector is auth- prefixed so disabling encapsulation is safe. */
  .auth-stage {
    position: fixed; inset: 0; overflow: hidden;
    background: linear-gradient(155deg, #7dd3fc 0%, #0ea5e9 48%, #0369a1 100%);
  }
  /* Separate scroll layer: the stage must stay clipped (it holds the rotated,
     scaled columns), but a tall card — register has three fields plus OAuth —
     needs the page to scroll rather than the card itself. */
  .auth-scroll {
    position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden;
    display: grid; place-items: center; padding: 28px 16px;
  }

  /* Drifting columns of the roles Beacon is for. Decorative only. */
  .auth-people {
    position: absolute; inset: 0; display: flex; gap: 22px; justify-content: center;
    padding: 0 8px; transform: rotate(-6deg) scale(1.25); transform-origin: center;
  }
  .auth-col {
    width: 210px; flex: none; overflow: hidden;
    -webkit-mask-image: linear-gradient(transparent, #000 12%, #000 88%, transparent);
    mask-image: linear-gradient(transparent, #000 12%, #000 88%, transparent);
  }
  @media (max-width: 900px) { .auth-col:nth-child(4), .auth-col:nth-child(5) { display: none; } }
  @media (max-width: 620px) {
    .auth-col:nth-child(3) { display: none; }
    .auth-people { gap: 16px; transform: rotate(-8deg) scale(1.5); }
  }
  .auth-track {
    display: flex; flex-direction: column; gap: 18px;
    animation: authUp var(--dur, 40s) linear infinite; will-change: transform;
  }
  .auth-col.rev .auth-track { animation-name: authDown; }
  @keyframes authUp   { from { transform: translateY(0); }    to { transform: translateY(-50%); } }
  @keyframes authDown { from { transform: translateY(-50%); } to { transform: translateY(0); } }
  @media (prefers-reduced-motion: reduce) { .auth-track { animation: none; } }

  .auth-persona {
    background: rgba(255,255,255,.96); border: 1px solid rgba(255,255,255,.7);
    border-radius: 18px; padding: 14px 16px; display: flex; align-items: center; gap: 13px;
    box-shadow: 0 14px 34px -18px rgba(2,23,54,.6);
  }
  .auth-face { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; font-size: 26px; flex: none; line-height: 1; }
  .auth-who { min-width: 0; }
  .auth-who b { display: block; font-size: 13.5px; color: #0b1220; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .auth-role { font-size: 11.5px; font-weight: 600; margin-top: 2px; display: inline-block; padding: 1px 8px; border-radius: 999px; }
  .r-mkt   { background: #ede9fe; color: #6d28d9; }
  .r-hr    { background: #dcfce7; color: #15803d; }
  .r-rec   { background: #dbeafe; color: #1d4ed8; }
  .r-job   { background: #ffedd5; color: #c2410c; }
  .r-sales { background: #cffafe; color: #0e7490; }
  .r-found { background: #fce7f3; color: #be185d; }

  .auth-scrim {
    position: absolute; inset: 0;
    background:
      radial-gradient(78% 68% at 50% 48%, rgba(224,242,254,.35), rgba(3,105,161,.42) 78%),
      linear-gradient(180deg, rgba(56,189,248,.12), rgba(3,105,161,.30));
  }

  .auth-card {
    position: relative; width: min(400px, 92vw);
    background: #fff; border: 1px solid rgba(255,255,255,.7); border-radius: 26px;
    padding: 34px 32px; color: #0f172a;
    box-shadow: 0 44px 90px -34px rgba(2,23,54,.55), inset 0 2px 0 rgba(255,255,255,.6);
    animation: authRise .6s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes authRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .auth-card { animation: none; } }

  .auth-pill {
    display: inline-flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 600;
    color: #0369a1; background: #e0f2fe; border: 1px solid #bae6fd;
    padding: 5px 12px; border-radius: 999px; margin-bottom: 18px;
  }
  .auth-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 9px #10b981; }

  .auth-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .auth-logo b { font-size: 16px; letter-spacing: -.01em; color: #0f172a; }
  .auth-logo .ai { font-size: 10px; font-weight: 800; color: #0369a1; background: #e0f2fe; padding: 2px 6px; border-radius: 5px; }

  .auth-card h1 { font-size: 25px; margin: 6px 0; letter-spacing: -.02em; color: #0f172a; }
  .auth-sub { font-size: 14px; color: #475569; margin: 0 0 24px; line-height: 1.5; }
  .auth-back { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: #0284c7; text-decoration: none; margin-bottom: 14px; }
  .auth-back:hover { text-decoration: underline; }

  .auth-field { margin-bottom: 14px; }
  .auth-field label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 7px; color: #0f172a; }
  .auth-opt { font-weight: 500; font-size: 11px; color: #94a3b8; letter-spacing: .01em; }
  .auth-hint { margin: 6px 0 0; font-size: 11.5px; line-height: 1.45; color: #94a3b8; }
  .auth-rowlab { display: flex; justify-content: space-between; align-items: center; }
  .auth-rowlab a { font-size: 12px; color: #0284c7; text-decoration: none; font-weight: 600; }
  .auth-rowlab a:hover { text-decoration: underline; }

  .auth-inp {
    position: relative; background: #f0f9ff; border: 1px solid #e2e8f0; border-radius: 12px;
    height: 47px; transition: border-color .15s, box-shadow .15s, background .15s;
  }
  .auth-inp:focus-within { border-color: #0ea5e9; background: #fff; box-shadow: 0 0 0 3px rgba(14,165,233,.18); }
  .auth-inp > svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; pointer-events: none; }
  .auth-inp input {
    width: 100%; height: 100%; border: 0; outline: 0; background: transparent;
    font: inherit; font-size: 14px; color: #0f172a; padding: 0 14px 0 39px; border-radius: 12px;
  }
  .auth-inp:has(.auth-eye) input { padding-right: 44px; }
  .auth-inp input::placeholder { color: #94a3b8; }
  .auth-inp input:focus, .auth-inp input:focus-visible { outline: none; box-shadow: none; }
  .auth-inp.bad { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.18); }
  /* hide the native password reveal control so only our toggle shows */
  .auth-inp input::-ms-reveal, .auth-inp input::-ms-clear { display: none; }
  /* kill the yellow autofill box */
  .auth-inp input:-webkit-autofill,
  .auth-inp input:-webkit-autofill:hover,
  .auth-inp input:-webkit-autofill:focus {
    -webkit-text-fill-color: #0f172a; caret-color: #0f172a;
    -webkit-box-shadow: 0 0 0 1000px #f0f9ff inset; border-radius: 12px;
    transition: background-color 9999s ease-in-out 0s;
  }
  .auth-eye {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
    display: grid; place-items: center; background: none; border: 0; cursor: pointer; padding: 4px; color: #94a3b8;
  }
  .auth-eye:hover { color: #0284c7; }
  .auth-eye svg { width: 17px; height: 17px; }

  .auth-btn {
    width: 100%; height: 48px; border: 0; border-radius: 14px;
    background: linear-gradient(180deg,#38bdf8,#0284c7); color: #fff;
    font: inherit; font-size: 14.5px; font-weight: 700; cursor: pointer; margin-top: 8px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: box-shadow .2s, transform .12s; box-shadow: 0 10px 24px -10px rgba(2,132,199,.7);
  }
  .auth-btn:hover { transform: translateY(-1px); box-shadow: 0 16px 32px -10px rgba(2,132,199,.8); }
  .auth-btn:active { transform: scale(.99); }

  .auth-divider { display: flex; align-items: center; gap: 12px; margin: 18px 0; color: #94a3b8; font-size: 12px; }
  .auth-divider::before, .auth-divider::after { content: ""; height: 1px; flex: 1; background: #e2e8f0; }

  .auth-gbtn {
    width: 100%; height: 47px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;
    color: #0f172a; font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 9px;
    transition: background .15s, border-color .15s;
  }
  .auth-gbtn:hover { background: #f0f9ff; border-color: #bae6fd; }
  .auth-gbtn svg { width: 17px; height: 17px; }
  .auth-gbtn + .auth-gbtn { margin-top: 10px; }

  .auth-foot { text-align: center; font-size: 13px; color: #475569; margin: 22px 0 0; }
  .auth-foot a { color: #0284c7; text-decoration: none; font-weight: 700; }
  .auth-foot a:hover { text-decoration: underline; }

  .auth-err {
    display: flex; align-items: flex-start; gap: 7px; margin-top: 10px; font-size: 12.5px;
    color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; padding: 8px 11px; border-radius: 10px;
  }
  .auth-err svg { width: 15px; height: 15px; flex: none; margin-top: 1px; }

  .auth-note {
    margin-top: 12px; font-size: 12.5px; border-radius: 10px; padding: 9px 11px;
    background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1;
  }
  .auth-note a { font-weight: 700; text-decoration: underline; word-break: break-all; }

  .auth-ok {
    display: flex; align-items: flex-start; gap: 9px; font-size: 13.5px; color: #0f172a;
    background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 13px; border-radius: 12px;
  }
  .auth-ok svg { width: 18px; height: 18px; flex: none; color: #059669; margin-top: 1px; }

  .auth-stage button:disabled { opacity: .7; pointer-events: none; }
  .auth-btn:focus-visible, .auth-gbtn:focus-visible, .auth-stage a:focus-visible { outline: 2px solid #0ea5e9; outline-offset: 2px; }

  .auth-spin { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; animation: authSpin .7s linear infinite; }
  .auth-spin.dark { border-color: rgba(11,18,32,.25); border-top-color: #0b1220; }
  @keyframes authSpin { to { transform: rotate(360deg); } }
  `],
})
export class AuthShell {
  @Input() title = '';
  @Input() subtitle = '';
  /** Optional badge above the logo. Empty on the password screens. */
  @Input() pill = '';
  @Input() backLink = '';
  @Input() backLabel = 'Back';

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
      return { dur, reverse: reverse[i], items: [...shuffled, ...shuffled] }; // duplicated for a seamless loop
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
}
