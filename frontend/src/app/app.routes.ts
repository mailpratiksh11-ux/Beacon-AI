import { Routes } from '@angular/router';
import { Layout } from './shell/layout';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login').then((m) => m.Login),
    canActivate: [guestGuard],
    title: 'Sign in · Beacon AI',
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register').then((m) => m.Register),
    canActivate: [guestGuard],
    title: 'Create account · Beacon AI',
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password').then((m) => m.ForgotPassword),
    canActivate: [guestGuard],
    title: 'Forgot password · Beacon AI',
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password').then((m) => m.ResetPassword),
    title: 'Reset password · Beacon AI',
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./pages/auth-callback').then((m) => m.AuthCallback),
    title: 'Signing in… · Beacon AI',
  },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/dashboard').then((m) => m.Dashboard), title: 'Dashboard · Beacon AI' },
      { path: 'home', loadComponent: () => import('./pages/home').then((m) => m.Home), title: 'Home · Beacon AI' },
      { path: 'compose', loadComponent: () => import('./pages/compose').then((m) => m.Compose), title: 'Compose · Beacon AI' },
      { path: 'inbox', loadComponent: () => import('./pages/inbox').then((m) => m.Inbox), title: 'Inbox · Beacon AI' },
      { path: 'upgrade', loadComponent: () => import('./pages/upgrade').then((m) => m.Upgrade), title: 'Upgrade · Beacon AI' },
      { path: 'campaigns', loadComponent: () => import('./pages/campaigns').then((m) => m.Campaigns), title: 'Campaigns · Beacon AI' },
      { path: 'history', loadComponent: () => import('./pages/history').then((m) => m.EmailHistory), title: 'Email History · Beacon AI' },
      { path: 'templates', loadComponent: () => import('./pages/templates').then((m) => m.Templates), title: 'Templates · Beacon AI' },
      { path: 'contacts', loadComponent: () => import('./pages/contacts').then((m) => m.Contacts), title: 'Contacts · Beacon AI' },
      { path: 'jobs', loadComponent: () => import('./pages/jobs').then((m) => m.Jobs), title: 'Job Search · Beacon AI' },
      { path: 'tracker', loadComponent: () => import('./pages/tracker').then((m) => m.Tracker), title: 'Application Tracker · Beacon AI' },
      { path: 'analytics', loadComponent: () => import('./pages/analytics').then((m) => m.Analytics), title: 'Analytics · Beacon AI' },
      { path: 'settings', loadComponent: () => import('./pages/settings').then((m) => m.Settings), title: 'Settings · Beacon AI' },
    ],
  },
  { path: '**', redirectTo: '' },
];
