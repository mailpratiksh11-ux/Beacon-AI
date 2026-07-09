import { Injectable, inject, signal } from '@angular/core';
import { forkJoin, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Campaign, EmailRecord, EmailTemplate, TemplateInput, Contact } from './models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private api = inject(ApiService);

  readonly campaigns = signal<Campaign[]>([]);
  readonly history = signal<EmailRecord[]>([]);
  readonly templates = signal<EmailTemplate[]>([]);
  readonly contacts = signal<Contact[]>([]);

  readonly loaded = signal(false);
  readonly loadError = signal<string | null>(null);

  loadAll() {
    this.loaded.set(false);
    this.loadError.set(null);
    forkJoin({
      campaigns: this.api.listCampaigns({ limit: 100 }),
      history: this.api.listEmails({ limit: 200 }),
      templates: this.api.listTemplates(),
      contacts: this.api.listContacts({ limit: 5000 }),
    }).subscribe({
      next: (res) => {
        this.campaigns.set(res.campaigns);
        this.history.set(res.history);
        this.templates.set(res.templates);
        this.contacts.set(res.contacts);
        this.loaded.set(true);
      },
      error: (err) => {
        this.loadError.set(err?.message || 'Failed to reach the API');
        this.loaded.set(true);
      },
    });
  }

  // ---- mutations (optimistic UI + API call) ----
  deleteCampaign(id: string) {
    this.campaigns.update((list) => list.filter((c) => c.id !== id));
    this.api.deleteCampaign(id).subscribe({ error: () => this.reloadCampaigns() });
  }

  createTemplate(body: TemplateInput): Observable<EmailTemplate> {
    return this.api.createTemplate(body).pipe(tap((t) => this.templates.update((list) => [t, ...list])));
  }

  updateTemplate(id: string, body: TemplateInput): Observable<EmailTemplate> {
    return this.api.updateTemplate(id, body).pipe(tap((t) => this.templates.update((list) => list.map((x) => (x.id === id ? t : x)))));
  }

  deleteTemplate(id: string) {
    this.templates.update((list) => list.filter((t) => t.id !== id));
    this.api.deleteTemplate(id).subscribe({ error: () => this.reloadTemplates() });
  }

  duplicateTemplate(id: string) {
    this.api.duplicateTemplate(id).subscribe({ next: () => this.reloadTemplates() });
  }

  deleteContact(id: string) {
    this.contacts.update((list) => list.filter((c) => c.id !== id));
    this.api.deleteContact(id).subscribe({ error: () => this.reloadContacts() });
  }

  toggleContactFavorite(id: string) {
    let next = false;
    this.contacts.update((list) => list.map((c) => (c.id === id ? ((next = !c.favorite), { ...c, favorite: next }) : c)));
    this.api.updateContact(id, { favorite: next }).subscribe({ error: () => this.reloadContacts() });
  }

  refreshContacts() { this.api.listContacts({ limit: 5000 }).subscribe((c) => this.contacts.set(c)); }
  refreshCampaigns() { this.api.listCampaigns({ limit: 100 }).subscribe((c) => this.campaigns.set(c)); }
  refreshHistory() { this.api.listEmails({ limit: 200 }).subscribe((h) => this.history.set(h)); }

  private reloadCampaigns() { this.refreshCampaigns(); }
  private reloadTemplates() { this.api.listTemplates().subscribe((t) => this.templates.set(t)); }
  private reloadContacts() { this.refreshContacts(); }
}
