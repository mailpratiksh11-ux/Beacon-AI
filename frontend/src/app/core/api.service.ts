import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  Campaign, EmailRecord, EmailTemplate, Contact, Profile, Resume,
  DashboardStats, AnalyticsData, ApiEnvelope, PaginatedEnvelope,
  InboxItem, InboxThread, AiStatus,
} from './models';

type Query = Record<string, string | number | undefined>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = API_BASE_URL;

  private params(q?: Query): HttpParams {
    let p = new HttpParams();
    if (q) for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') p = p.set(k, String(v));
    return p;
  }
  private data<T>() { return map((res: ApiEnvelope<T>) => res.data); }

  // ---- Resumes ----
  listResumes(): Observable<Resume[]> {
    return this.http.get<ApiEnvelope<any[]>>(`${this.base}/resumes`).pipe(map((r) => r.data.map(mapResume)));
  }
  uploadResume(file: File): Observable<Resume> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiEnvelope<any>>(`${this.base}/resumes`, form).pipe(map((r) => mapResume(r.data)));
  }
  deleteResume(id: string) { return this.http.delete(`${this.base}/resumes/${id}`); }
  resumeDownloadUrl(id: string) {
    // Downloads open in a new tab (no auth header), so pass the token as a query param.
    let token = '';
    try { token = localStorage.getItem('cm-token') || ''; } catch {}
    return `${this.base}/resumes/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  }

  // ---- Sending ----
  getSendStatus(): Observable<{ configured: boolean; realDelivery: boolean; mode: string; account: string | null; queue: boolean }> {
    return this.http.get<ApiEnvelope<{ configured: boolean; realDelivery: boolean; mode: string; account: string | null; queue: boolean }>>(`${this.base}/send/status`).pipe(this.data());
  }

  // ---- Background bulk send (BullMQ) ----
  sendBulk(payload: {
    subject: string; html: string; campaign?: string; campaignId?: string; attachmentIds?: string[];
    delaySeconds?: number;
    recipients: { email: string; name?: string; firstName?: string; lastName?: string; company?: string; position?: string }[];
  }): Observable<{ batchId: string; total: number; status: string }> {
    return this.http.post<ApiEnvelope<{ batchId: string; total: number; status: string }>>(`${this.base}/send/bulk`, payload).pipe(this.data());
  }
  getSendBatch(id: string): Observable<{ batchId: string; total: number; sent: number; failed: number; status: string; campaign: string }> {
    return this.http.get<ApiEnvelope<any>>(`${this.base}/send/batch/${id}`).pipe(this.data());
  }
  controlSendBatch(id: string, action: 'pause' | 'resume' | 'cancel'): Observable<any> {
    return this.http.post<ApiEnvelope<any>>(`${this.base}/send/batch/${id}/${action}`, {}).pipe(this.data());
  }
  sendEmail(payload: { to: string; name?: string; subject: string; html: string; campaign?: string; campaignId?: string; attachmentIds?: string[] }):
    Observable<{ to: string; status: string; messageId?: string; previewUrl?: string | null; error?: string }> {
    return this.http.post<ApiEnvelope<{ to: string; status: string; messageId?: string; previewUrl?: string | null; error?: string }>>(`${this.base}/send`, payload).pipe(this.data());
  }

  // ---- Attachments (ad-hoc, uploaded from Compose) ----
  uploadAttachments(files: File[]): Observable<{ id: string; filename: string; mimeType: string; size: number }[]> {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return this.http.post<ApiEnvelope<{ id: string; filename: string; mimeType: string; size: number }[]>>(`${this.base}/attachments`, form).pipe(this.data());
  }
  deleteAttachment(id: string) { return this.http.delete(`${this.base}/attachments/${id}`); }

  // ---- AI writing assistant ----
  aiStatus(): Observable<AiStatus> {
    return this.http.get<ApiEnvelope<AiStatus>>(`${this.base}/ai/status`).pipe(this.data());
  }
  aiGenerate(payload: { kind: 'email' | 'subject' | 'improve'; prompt: string; tone?: string }):
    Observable<{ kind: string; subject?: string; body?: string; subjects?: string[] }> {
    return this.http.post<ApiEnvelope<any>>(`${this.base}/ai/generate`, payload).pipe(this.data());
  }

  // ---- Inbox (Gmail, Google-connected users) ----
  getInbox(folder: 'inbox' | 'sent' | 'unread' = 'inbox'): Observable<InboxItem[]> {
    return this.http.get<ApiEnvelope<InboxItem[]>>(`${this.base}/inbox`, { params: this.params({ folder }) }).pipe(this.data());
  }
  getThread(id: string): Observable<InboxThread> {
    return this.http.get<ApiEnvelope<InboxThread>>(`${this.base}/inbox/${id}`).pipe(this.data());
  }
  replyThread(id: string, html: string): Observable<{ id: string; to: string; subject: string }> {
    return this.http.post<ApiEnvelope<{ id: string; to: string; subject: string }>>(`${this.base}/inbox/${id}/reply`, { html }).pipe(this.data());
  }

  // ---- Auth ---- (Google OAuth is a full-page redirect handled in AuthService)
  login(email: string, password: string): Observable<{ token: string; user: Profile }> {
    return this.http.post<ApiEnvelope<{ token: string; user: Profile }>>(`${this.base}/auth/login`, { email, password }).pipe(this.data());
  }
  register(email: string, password: string, name?: string): Observable<{ token: string; user: Profile }> {
    return this.http.post<ApiEnvelope<{ token: string; user: Profile }>>(`${this.base}/auth/register`, { email, password, name }).pipe(this.data());
  }
  forgotPassword(email: string): Observable<{ previewUrl: string | null }> {
    return this.http.post<ApiEnvelope<{ previewUrl: string | null }>>(`${this.base}/auth/forgot-password`, { email }).pipe(this.data());
  }
  resetPassword(token: string, password: string): Observable<{ token: string; user: Profile }> {
    return this.http.post<ApiEnvelope<{ token: string; user: Profile }>>(`${this.base}/auth/reset-password`, { token, password }).pipe(this.data());
  }

  // ---- Profile ----
  getProfile(): Observable<Profile> {
    return this.http.get<ApiEnvelope<Profile>>(`${this.base}/profile`).pipe(this.data());
  }
  updateProfile(body: Partial<Profile>): Observable<Profile> {
    return this.http.patch<ApiEnvelope<Profile>>(`${this.base}/profile`, body).pipe(this.data());
  }

  // ---- Dashboard ----
  getStats(): Observable<DashboardStats> {
    return this.http.get<ApiEnvelope<DashboardStats>>(`${this.base}/dashboard/stats`).pipe(this.data());
  }
  getAnalytics(): Observable<AnalyticsData> {
    return this.http.get<ApiEnvelope<AnalyticsData>>(`${this.base}/dashboard/analytics`).pipe(this.data());
  }

  // ---- Campaigns ----
  listCampaigns(q?: Query): Observable<Campaign[]> {
    return this.http.get<PaginatedEnvelope<any>>(`${this.base}/campaigns`, { params: this.params(q) })
      .pipe(map((r) => r.data.map(mapCampaign)));
  }
  deleteCampaign(id: string) { return this.http.delete(`${this.base}/campaigns/${id}`); }
  createCampaign(body: any) { return this.http.post<ApiEnvelope<any>>(`${this.base}/campaigns`, body).pipe(this.data()); }
  getCampaignPending(id: string): Observable<{ campaign: any; pending: { email: string; name: string; company: string; position: string }[]; sentCount: number; total: number }> {
    return this.http.get<ApiEnvelope<any>>(`${this.base}/campaigns/${id}/pending`).pipe(this.data());
  }

  // ---- Emails (history) ----
  listEmails(q?: Query): Observable<EmailRecord[]> {
    return this.http.get<PaginatedEnvelope<any>>(`${this.base}/emails`, { params: this.params(q) })
      .pipe(map((r) => r.data.map(mapEmail)));
  }
  resendEmail(id: string): Observable<{ to: string; status: string }> {
    return this.http.post<ApiEnvelope<{ to: string; status: string }>>(`${this.base}/emails/${id}/resend`, {}).pipe(this.data());
  }
  syncBounces(): Observable<{ checked: number; updated: number }> {
    return this.http.post<ApiEnvelope<{ checked: number; updated: number }>>(`${this.base}/emails/sync-bounces`, {}).pipe(this.data());
  }
  recipientStatuses(): Observable<{ sent: string[]; failed: string[] }> {
    return this.http.get<ApiEnvelope<{ sent: string[]; failed: string[] }>>(`${this.base}/emails/recipient-statuses`).pipe(this.data());
  }

  // ---- Templates ----
  listTemplates(q?: Query): Observable<EmailTemplate[]> {
    return this.http.get<ApiEnvelope<any[]>>(`${this.base}/templates`, { params: this.params(q) })
      .pipe(map((r) => r.data.map(mapTemplate)));
  }
  deleteTemplate(id: string) { return this.http.delete(`${this.base}/templates/${id}`); }
  duplicateTemplate(id: string) { return this.http.post(`${this.base}/templates/${id}/duplicate`, {}); }

  // ---- Contacts ----
  listContacts(q?: Query): Observable<Contact[]> {
    return this.http.get<PaginatedEnvelope<any>>(`${this.base}/contacts`, { params: this.params(q) })
      .pipe(map((r) => r.data.map(mapContact)));
  }
  // Server-side paginated fetch — returns the page of items plus the total count.
  listContactsPaged(q?: Query): Observable<{ items: Contact[]; total: number }> {
    return this.http.get<PaginatedEnvelope<any>>(`${this.base}/contacts`, { params: this.params(q) })
      .pipe(map((r) => ({ items: r.data.map(mapContact), total: r.pagination.total })));
  }
  createContact(body: { name: string; email: string; company?: string; position?: string }) {
    return this.http.post(`${this.base}/contacts`, body);
  }
  updateContact(id: string, patch: { favorite?: boolean; name?: string; company?: string; position?: string }) {
    return this.http.patch(`${this.base}/contacts/${id}`, patch);
  }
  listContactGroups(): Observable<{ name: string; count: number }[]> {
    return this.http.get<ApiEnvelope<{ name: string; count: number }[]>>(`${this.base}/contacts/groups`).pipe(this.data());
  }
  bulkGroupContacts(contactIds: string[], group: string, action: 'add' | 'remove' = 'add'):
    Observable<{ matched: number; modified: number; group: string }> {
    return this.http.post<ApiEnvelope<{ matched: number; modified: number; group: string }>>(`${this.base}/contacts/group`, { contactIds, group, action }).pipe(this.data());
  }
  importContacts(contacts: { name: string; email: string; company?: string; position?: string }[]):
    Observable<{ inserted: number; updated: number }> {
    return this.http.post<ApiEnvelope<{ inserted: number; updated: number }>>(`${this.base}/contacts/import`, { contacts }).pipe(this.data());
  }
  deleteContact(id: string) { return this.http.delete(`${this.base}/contacts/${id}`); }
}

// ---- mappers: normalize Mongo documents → frontend view models ----
const day = (iso?: string) => (iso ? iso.slice(0, 10) : '');
const dateTime = (iso?: string) => (iso ? iso.slice(0, 10) + ' ' + iso.slice(11, 16) : '');

function mapCampaign(d: any): Campaign {
  return { id: d.id ?? d._id, name: d.name, sent: d.sent, total: d.total, status: d.status, openRate: d.openRate, createdAt: day(d.createdAt) };
}
function mapEmail(d: any): EmailRecord {
  return { id: d.id ?? d._id, recipient: d.recipient, name: d.name || d.recipient, subject: d.subject, status: d.status, date: dateTime(d.sentAt || d.createdAt), campaign: d.campaign || '' };
}
function mapTemplate(d: any): EmailTemplate {
  return { id: d.id ?? d._id, name: d.name, category: d.category, subject: d.subject, body: d.body, updatedAt: day(d.updatedAt), uses: d.uses, accent: d.accent };
}
function mapContact(d: any): Contact {
  return { id: d.id ?? d._id, name: d.name, email: d.email, company: d.company, position: d.position, status: d.status, favorite: !!d.favorite, groups: d.groups ?? [], addedAt: day(d.createdAt) };
}
function mapResume(d: any): Resume {
  return { id: d.id ?? d._id, filename: d.filename, mimeType: d.mimeType, size: d.size, createdAt: day(d.createdAt) };
}
