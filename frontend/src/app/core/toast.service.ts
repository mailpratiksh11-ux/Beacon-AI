import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  show(type: ToastType, title: string, message?: string, duration = 4000) {
    const id = ++this.counter;
    this.toasts.update((list) => [...list, { id, type, title, message }]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  success(title: string, message?: string) { return this.show('success', title, message); }
  error(title: string, message?: string) { return this.show('error', title, message); }
  info(title: string, message?: string) { return this.show('info', title, message); }
  warning(title: string, message?: string) { return this.show('warning', title, message); }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
