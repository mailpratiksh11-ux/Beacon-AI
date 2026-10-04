import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Inbox as InboxIcon, Send, BarChart3, ArrowRight } from 'lucide-angular';
import { PageHeader } from '../shared/page-header';

/**
 * Inbox — placeholder.
 *
 * Reading mail requires Gmail's gmail.readonly scope, which Google classes as
 * RESTRICTED: using it obliges the whole app to pass a CASA Tier 2 security
 * assessment by an approved assessor, renewed annually, before it can leave
 * Testing status. Sending only needs gmail.send, which is merely "sensitive"
 * and clears standard verification.
 *
 * So the scope is not requested (google.service.js SCOPES) and this page says
 * so plainly rather than offering a feature that cannot work. The previous
 * implementation is in git history if the assessment ever becomes worthwhile.
 */
@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, PageHeader],
  template: `
    <app-page-header title="Inbox" subtitle="Replies to your campaigns, in one place." />

    <div class="mx-auto max-w-xl py-10 text-center">
      <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl
                  bg-brand-50 dark:bg-brand-500/[0.12] text-brand-600 dark:text-brand-400">
        <lucide-icon [img]="InboxIcon" [size]="26" [strokeWidth]="1.6" />
      </div>

      <span class="inline-block mb-3 rounded-md bg-slate-100 dark:bg-white/[0.07] px-2 py-0.5
                   text-[10px] font-semibold uppercase tracking-[0.08em]
                   text-slate-500 dark:text-slate-400">Coming soon</span>

      <h2 class="text-xl font-semibold text-slate-900 dark:text-white">Reading replies is on the way</h2>

      <p class="mt-2.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        Beacon sends from your own mailbox, so every reply already lands in Gmail or Outlook
        as normal. Pulling those replies in here needs a higher level of Google access than
        sending does, and we are working through that review.
      </p>

      <p class="mt-2.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        Nothing is lost in the meantime &mdash; delivery status for every email is tracked in
        Campaigns and Analytics.
      </p>

      <div class="mt-7 flex flex-wrap items-center justify-center gap-2.5">
        <a routerLink="/campaigns" class="btn-secondary">
          <lucide-icon [img]="Send" [size]="16" /> View campaigns
        </a>
        <a routerLink="/analytics" class="btn-secondary">
          <lucide-icon [img]="BarChart3" [size]="16" /> Open analytics
          <lucide-icon [img]="ArrowRight" [size]="15" />
        </a>
      </div>
    </div>
  `,
})
export class Inbox {
  readonly InboxIcon = InboxIcon;
  readonly Send = Send;
  readonly BarChart3 = BarChart3;
  readonly ArrowRight = ArrowRight;
}
