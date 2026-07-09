import { Component, inject, HostListener } from '@angular/core';
import { LucideAngularModule, AlertTriangle } from 'lucide-angular';
import { ConfirmService } from '../core/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (confirm.pending(); as p) {
      <div class="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" (click)="confirm.respond(false)"></div>
        <div class="card relative w-full max-w-md p-6 animate-scale-in">
          <div class="flex items-start gap-4">
            <div class="h-11 w-11 shrink-0 rounded-full flex items-center justify-center"
                 [class]="p.danger ? 'bg-red-50 dark:bg-red-500/10' : 'bg-brand-50 dark:bg-brand-500/10'">
              <lucide-icon [img]="Warn" [size]="22" [class]="p.danger ? 'text-red-500' : 'text-brand-500'" />
            </div>
            <div class="flex-1">
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">{{ p.title }}</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ p.message }}</p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 mt-6">
            <button class="btn-secondary" (click)="confirm.respond(false)">{{ p.cancelText || 'Cancel' }}</button>
            <button [class]="p.danger ? 'btn-danger' : 'btn-primary'" (click)="confirm.respond(true)">
              {{ p.confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  confirm = inject(ConfirmService);
  readonly Warn = AlertTriangle;

  @HostListener('document:keydown.escape')
  onEsc() { if (this.confirm.pending()) this.confirm.respond(false); }
}
