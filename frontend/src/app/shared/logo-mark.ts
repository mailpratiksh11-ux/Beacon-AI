import { Component, Input } from '@angular/core';

/** Beacon logo mark — a blue-gradient "B" lettermark with a white lighthouse + beam on a navy tile. */
@Component({
  selector: 'app-logo-mark',
  standalone: true,
  template: `
    <span class="mark" [style.width.px]="size" [style.height.px]="size" [style.borderRadius.px]="round">
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="bcnBg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="48">
            <stop offset="0" stop-color="#16295a" />
            <stop offset="1" stop-color="#0a1330" />
          </linearGradient>
          <linearGradient id="bcnB" gradientUnits="userSpaceOnUse" x1="10" y1="6" x2="42" y2="44">
            <stop offset="0" stop-color="#3ea8f5" />
            <stop offset="0.5" stop-color="#3b6fe0" />
            <stop offset="1" stop-color="#7c3aed" />
          </linearGradient>
        </defs>

        <rect width="48" height="48" rx="13" fill="url(#bcnBg)" />

        <!-- B lettermark -->
        <path d="M13 8 H27 C34.5 8 39.5 12 39.5 18 C39.5 22.2 36.8 25 32.8 25.8 C37.6 26.6 41 30 41 35.2 C41 41.2 35.6 44 27.5 44 H13 Z" fill="url(#bcnB)" />
        <!-- B counters (carved with the tile background) -->
        <ellipse cx="27" cy="17.6" rx="6.6" ry="4.5" fill="url(#bcnBg)" />
        <ellipse cx="27.6" cy="34.8" rx="7.2" ry="5.2" fill="url(#bcnBg)" />

        <!-- light beam -->
        <path d="M25.5 17 L46 10.5 L46 19.5 Z" fill="#ffe08a" opacity="0.75" />
        <path d="M25.5 17 L45 12.8 L45 17.6 Z" fill="#fff4c6" opacity="0.9" />

        <!-- lighthouse -->
        <path d="M17.5 15.8 L28.5 15.8 L23 9.8 Z" fill="#fff" />
        <circle cx="23" cy="8.7" r="1.2" fill="#fff" />
        <rect x="19" y="15.6" width="8" height="5" rx="1" fill="#fff" />
        <rect x="20.6" y="16.6" width="4.8" height="3.2" rx="0.4" fill="#ffcf3f" />
        <rect x="16.5" y="20.9" width="13" height="2.2" rx="0.6" fill="#fff" />
        <path d="M19 23 L26.5 23 L29.5 40 L15.5 40 Z" fill="#fff" />
        <rect x="16.8" y="30.4" width="12.4" height="3" fill="#bcd4ff" />
        <path d="M21 40 V35.6 A2 2 0 0 1 25 35.6 V40 Z" fill="#2b52d8" />
        <!-- wave base -->
        <path d="M11 38.5 C17 42.5 30 42.5 36 38.5 L36 43 C30 47 17 47 11 43 Z" fill="#6d28d9" opacity="0.95" />
      </svg>
    </span>
  `,
  styles: [`
    .mark {
      display: inline-grid;
      place-items: center;
      overflow: hidden;
      flex: none;
      box-shadow: 0 6px 18px -6px rgba(37, 99, 235, .5);
    }
    svg { width: 100%; height: 100%; display: block; }
  `],
})
export class LogoMark {
  @Input() size = 36;
  get round() { return Math.round(this.size * 0.28); }
}
