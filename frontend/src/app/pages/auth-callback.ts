import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, Loader2 } from 'lucide-angular';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
      <lucide-icon [img]="Spinner" [size]="28" class="text-brand-500 animate-spin" />
      <p class="text-sm text-slate-500 dark:text-slate-400">Signing you in…</p>
    </div>
  `,
})
export class AuthCallback implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  readonly Spinner = Loader2;

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.auth.completeGoogleLogin(token);
      this.toast.success('Signed in with Google');
      this.router.navigateByUrl('/home');
    } else {
      this.toast.error('Sign in failed', 'No token returned.');
      this.router.navigateByUrl('/login');
    }
  }
}
