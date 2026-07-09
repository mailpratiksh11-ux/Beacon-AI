import { Component, Input } from '@angular/core';

/** Deterministic colorful gradient avatar from a name. */
@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    <span class="av" [style.width.px]="size" [style.height.px]="size"
          [style.borderRadius.px]="round" [style.background]="gradient" [style.fontSize.px]="fontSize">
      {{ initials }}
    </span>
  `,
  styles: [`
    .av { display: inline-grid; place-items: center; color: #fff; font-weight: 600; letter-spacing: -0.02em; flex: none; box-shadow: inset 0 1px 0 rgba(255,255,255,0.18); }
  `],
})
export class Avatar {
  @Input() name = '';
  @Input() size = 36;
  @Input() rounded = 0.32; // radius ratio (0.5 = circle)

  private grads = [
    'linear-gradient(140deg,#a78bfa,#7c3aed)', // purple
    'linear-gradient(140deg,#4ade80,#16a34a)', // green
    'linear-gradient(140deg,#fbbf24,#ea580c)', // orange
    'linear-gradient(140deg,#f472b6,#be185d)', // pink
    'linear-gradient(140deg,#38bdf8,#0e7490)', // cyan
    'linear-gradient(140deg,#818cf8,#4338ca)', // indigo
    'linear-gradient(140deg,#fb7185,#be123c)', // rose
    'linear-gradient(140deg,#2dd4bf,#0f766e)', // teal
  ];

  get round() { return Math.round(this.size * this.rounded); }
  get fontSize() { return Math.round(this.size * 0.4); }
  get initials() {
    return (this.name || '?').split(/\s+/).filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  }
  get gradient() {
    const s = this.name || '?';
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return this.grads[h % this.grads.length];
  }
}
