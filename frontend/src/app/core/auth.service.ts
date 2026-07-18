import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ProfileService } from './profile.service';
import { API_BASE_URL } from './api.config';
import { Profile } from './models';

const TOKEN_KEY = 'cm-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private profile = inject(ProfileService);
  private router = inject(Router);

  readonly token = signal<string | null>(this.read());
  readonly isAuthenticated = computed(() => !!this.token());

  private read(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  private persist(token: string, user?: Profile) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
    this.token.set(token);
    if (user) this.profile.profile.set(user); // instant name/avatar
    // Re-fetch the canonical profile (adds computed fields like mailConfigured that the
    // login/register response doesn't include).
    this.profile.load();
  }

  login(email: string, password: string): Observable<{ token: string; user: Profile }> {
    return this.api.login(email, password).pipe(tap((r) => this.persist(r.token, r.user)));
  }
  register(email: string, password: string, name?: string): Observable<{ token: string; user: Profile }> {
    return this.api.register(email, password, name).pipe(tap((r) => this.persist(r.token, r.user)));
  }
  forgotPassword(email: string) {
    return this.api.forgotPassword(email);
  }
  resetPassword(token: string, password: string): Observable<{ token: string; user: Profile }> {
    return this.api.resetPassword(token, password).pipe(tap((r) => this.persist(r.token, r.user)));
  }

  // Real Google OAuth — full-page redirect to the backend, which bounces to Google.
  startGoogleLogin() {
    const url = `${API_BASE_URL}/auth/google?return=${encodeURIComponent(location.origin)}`;
    window.location.href = url;
  }

  startMicrosoftLogin() {
    const url = `${API_BASE_URL}/auth/microsoft?return=${encodeURIComponent(location.origin)}`;
    window.location.href = url;
  }

  // Called by the /auth/callback route after Google redirects back with a token.
  completeGoogleLogin(token: string) {
    this.persist(token);
  }

  clearSession() {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    this.token.set(null);
  }

  logout() {
    this.clearSession();
    this.router.navigateByUrl('/login');
  }
}
