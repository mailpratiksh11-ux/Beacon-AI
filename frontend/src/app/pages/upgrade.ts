import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Check, Zap, Crown, Rocket, Loader2, ArrowLeft, Sparkles } from 'lucide-angular';
import { ProfileService } from '../core/profile.service';
import { ToastService } from '../core/toast.service';

type PlanKey = 'free' | 'pro' | 'business';

@Component({
  selector: 'app-upgrade',
  standalone: true,
  imports: [LucideAngularModule, RouterLink],
  template: `
    <a routerLink="/home" class="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-500 mb-5">
      <lucide-icon [img]="Back" [size]="15" /> Back
    </a>

    <div class="text-center mb-8">
      <span class="badge-info mb-3"><lucide-icon [img]="Spark" [size]="13" /> Plans</span>
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Upgrade your plan</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">You're on the <span class="font-semibold text-slate-700 dark:text-slate-200 capitalize">{{ profile.plan() }}</span> plan. Upgrade when you're ready to scale.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
      @for (p of plans; track p.key) {
        <div class="card p-6 relative flex flex-col"
             [class]="p.featured ? 'border-brand-500/50 dark:border-brand-500/50' : ''"
             [style.box-shadow]="p.featured ? '0 0 0 1px rgba(14,165,233,.4), 0 24px 60px -24px rgba(14,165,233,.4)' : ''">
          @if (p.featured) { <span class="badge-info absolute top-5 right-5">Most popular</span> }
          @if (profile.plan() === p.key) { <span class="badge-success absolute top-5 right-5"><lucide-icon [img]="CheckIcon" [size]="12" /> Current</span> }
          <div class="h-10 w-10 rounded-xl flex items-center justify-center" [class]="p.tint">
            <lucide-icon [img]="p.icon" [size]="20" [strokeWidth]="1.75" [class]="p.color" />
          </div>
          <h3 class="font-semibold text-slate-900 dark:text-white mt-4">{{ p.name }}</h3>
          <div class="flex items-baseline gap-1 mt-2">
            <span class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{{ p.price }}</span>
            <span class="text-sm text-slate-400">{{ p.period }}</span>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{{ p.tagline }}</p>
          <ul class="mt-5 space-y-2.5 flex-1">
            @for (feat of p.perks; track feat) {
              <li class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                <span class="mt-0.5 h-4 w-4 rounded-full bg-success-500/15 flex items-center justify-center shrink-0">
                  <lucide-icon [img]="CheckIcon" [size]="11" class="text-success-500" />
                </span>
                {{ feat }}
              </li>
            }
          </ul>

          @if (profile.plan() === p.key) {
            <button class="btn-secondary w-full mt-6 justify-center" disabled>Current plan</button>
          } @else {
            <button class="w-full mt-6 justify-center" [class]="p.featured ? 'btn-primary' : 'btn-secondary'"
                    (click)="choose(p.key)" [disabled]="busy() !== ''">
              @if (busy() === p.key) { <lucide-icon [img]="Spinner" [size]="16" class="animate-spin" /> }
              {{ p.key === 'free' ? 'Downgrade to Free' : 'Upgrade to ' + p.name }}
            </button>
          }
        </div>
      }
    </div>
    <p class="text-xs text-slate-400 text-center mt-5">Billing isn't wired up yet, upgrades are simulated so you can try the paid features.</p>
  `,
})
export class Upgrade {
  profile = inject(ProfileService);
  private toast = inject(ToastService);
  busy = signal<'' | PlanKey>('');

  choose(plan: PlanKey) {
    if (this.profile.plan() === plan) return;
    this.busy.set(plan);
    this.profile.setPlan(plan).subscribe({
      next: () => {
        this.busy.set('');
        if (plan === 'free') this.toast.info('Switched to Free', 'Paid features are now disabled.');
        else this.toast.success(`You're on ${plan === 'pro' ? 'Pro' : 'Business'} 🎉`, 'Paid features are unlocked, including AI.');
      },
      error: (e) => { this.busy.set(''); this.toast.error('Could not update plan', e?.error?.message || 'Try again.'); },
    });
  }

  readonly CheckIcon = Check; readonly Spinner = Loader2; readonly Back = ArrowLeft; readonly Spark = Sparkles;

  plans = [
    {
      key: 'free' as PlanKey, name: 'Free', price: '$0', period: '/mo', tagline: 'Everything to get started.', featured: false,
      icon: Zap, tint: 'bg-slate-500/12', color: 'text-slate-400',
      perks: ['Up to 50 emails/day', '1 sending account', 'Contacts & templates', 'Basic analytics'],
    },
    {
      key: 'pro' as PlanKey, name: 'Pro', price: '$29', period: '/mo', tagline: 'For serious outreach.', featured: true,
      icon: Crown, tint: 'bg-brand-500/15', color: 'text-brand-500',
      perks: ['Up to 500 emails/day', 'AI email writer', 'A/B testing', 'Auto follow-ups', 'Full analytics & tracking'],
    },
    {
      key: 'business' as PlanKey, name: 'Business', price: '$99', period: '/mo', tagline: 'For teams that scale.', featured: false,
      icon: Rocket, tint: 'bg-violet-500/12', color: 'text-violet-500',
      perks: ['High-volume sending', 'Team workspaces', 'Inbox warmup', 'Integrations (HubSpot, Zapier…)', 'Priority support'],
    },
  ];
}
