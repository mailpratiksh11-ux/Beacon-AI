import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  Campaign, EmailRecord, EmailTemplate, TemplateInput, Contact, Profile, Resume,
  DashboardStats, AnalyticsData, ApiEnvelope, PaginatedEnvelope,
  InboxItem, InboxThread, AiStatus,
  Job, JobSourceMeta, Application, ApplicationStatus,
} from './models';

type Query = Record<string, string | number | undefined>;

/** How a contact send outcome is derived from email history. */
export type DeliveryFilter = 'all' | 'failed' | 'sent' | 'never';

/** The filters a contact list can be narrowed by, also what "delete all matching" targets. */
export interface ContactFilters {
  search?: string;
  favorite?: string;
  group?: string;
  delivery?: DeliveryFilter;
}

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
    /** ISO datetime, hold the whole batch until this time (max 30 days out). */
    scheduleAt?: string;
    recipients: { email: string; name?: string; firstName?: string; lastName?: string; company?: string; position?: string }[];
  }): Observable<{ batchId: string; total: number; status: string; scheduledFor?: string }> {
    return this.http.post<ApiEnvelope<{ batchId: string; total: number; status: string; scheduledFor?: string }>>(`${this.base}/send/bulk`, payload).pipe(this.data());
  }
  getSendBatch(id: string): Observable<{ batchId: string; total: number; sent: number; failed: number; status: string; campaign: string; scheduledFor?: string }> {
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
  /** One page of mail. Pass the previous `nextCursor` to fetch the next page; it is '' on the last. */
  getInbox(folder: 'inbox' | 'sent' | 'unread' = 'inbox', cursor = ''): Observable<{ items: InboxItem[]; nextCursor: string }> {
    return this.http.get<ApiEnvelope<{ items: InboxItem[]; nextCursor: string }>>(`${this.base}/inbox`, { params: this.params({ folder, cursor }) }).pipe(this.data());
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
  // Server-side count + page of history. Mirrors listContactsPaged: the plain
  // listEmails() drops r.pagination, so the true total was unavailable.
  listEmailsPaged(q?: Query): Observable<{ items: EmailRecord[]; total: number }> {
    return this.http.get<PaginatedEnvelope<any>>(`${this.base}/emails`, { params: this.params(q) })
      .pipe(map((r) => ({ items: r.data.map(mapEmail), total: r.pagination.total })));
  }
  resendEmail(id: string): Observable<{ to: string; status: string }> {
    return this.http.post<ApiEnvelope<{ to: string; status: string }>>(`${this.base}/emails/${id}/resend`, {}).pipe(this.data());
  }
  // Full record (includes the stored html body), used to reuse a sent email in Compose.
  getEmail(id: string): Observable<{ id: string; subject: string; html: string; recipient: string }> {
    return this.http.get<ApiEnvelope<any>>(`${this.base}/emails/${id}`).pipe(
      map((r) => ({ id: r.data.id ?? r.data._id, subject: r.data.subject || '', html: r.data.html || '', recipient: r.data.recipient || '' }))
    );
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
  createTemplate(body: TemplateInput): Observable<EmailTemplate> {
    return this.http.post<ApiEnvelope<any>>(`${this.base}/templates`, body).pipe(map((r) => mapTemplate(r.data)));
  }
  updateTemplate(id: string, body: Partial<TemplateInput>): Observable<EmailTemplate> {
    return this.http.patch<ApiEnvelope<any>>(`${this.base}/templates/${id}`, body).pipe(map((r) => mapTemplate(r.data)));
  }
  deleteTemplate(id: string) { return this.http.delete(`${this.base}/templates/${id}`); }
  duplicateTemplate(id: string) { return this.http.post(`${this.base}/templates/${id}/duplicate`, {}); }

  // ---- Contacts ----
  listContacts(q?: Query): Observable<Contact[]> {
    return this.http.get<PaginatedEnvelope<any>>(`${this.base}/contacts`, { params: this.params(q) })
      .pipe(map((r) => r.data.map(mapContact)));
  }
  // Server-side paginated fetch, returns the page of items plus the total count.
  listContactsPaged(q?: Query): Observable<{ items: Contact[]; total: number }> {
    return this.http.get<PaginatedEnvelope<any>>(`${this.base}/contacts`, { params: this.params(q) })
      .pipe(map((r) => ({ items: r.data.map(mapContact), total: r.pagination.total })));
  }
  createContact(body: { name: string; email: string; company?: string; position?: string }) {
    return this.http.post(`${this.base}/contacts`, body);
  }
  updateContact(id: string, patch: { favorite?: boolean; name?: string; email?: string; company?: string; position?: string }) {
    return this.http.patch(`${this.base}/contacts/${id}`, patch);
  }
  /**
   * CSV download of every contact matching `filters`. A download opens without
   * our auth interceptor, so the token rides along as a query param — the same
   * approach resumeDownloadUrl uses.
   */
  contactsExportUrl(filters: ContactFilters = {}): string {
    let token = '';
    try { token = localStorage.getItem('cm-token') || ''; } catch {}
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, String(v));
    if (token) qs.set('token', token);
    const q = qs.toString();
    return `${this.base}/contacts/export${q ? `?${q}` : ''}`;
  }
  listContactGroups(): Observable<{ name: string; count: number }[]> {
    return this.http.get<ApiEnvelope<{ name: string; count: number }[]>>(`${this.base}/contacts/groups`).pipe(this.data());
  }
  /**
   * Add or remove a group tag on many contacts, either an explicit `contactIds`
   * list, or every contact matching `filters` when `all` is true.
   */
  bulkGroupContacts(body: { contactIds?: string[]; all?: boolean; filters?: ContactFilters; group: string; action?: 'add' | 'remove' }):
    Observable<{ matched: number; modified: number; group: string }> {
    return this.http.post<ApiEnvelope<{ matched: number; modified: number; group: string }>>(`${this.base}/contacts/group`, { action: 'add', ...body }).pipe(this.data());
  }
  /** Import contacts, optionally tagging every imported contact with `groups`. */
  importContacts(contacts: { name: string; email: string; company?: string; position?: string }[], groups: string[] = []):
    Observable<{ inserted: number; updated: number; groups: string[] }> {
    return this.http.post<ApiEnvelope<{ inserted: number; updated: number; groups: string[] }>>(`${this.base}/contacts/import`, { contacts, groups }).pipe(this.data());
  }
  deleteContact(id: string) { return this.http.delete(`${this.base}/contacts/${id}`); }
  /**
   * Delete many contacts at once, either an explicit `contactIds` list, or
   * every contact matching `filters` when `all` is true.
   */
  bulkDeleteContacts(body: { contactIds?: string[]; all?: boolean; filters?: ContactFilters }):
    Observable<{ deleted: number }> {
    return this.http.post<ApiEnvelope<{ deleted: number }>>(`${this.base}/contacts/bulk-delete`, body).pipe(this.data());
  }

  // ---- Job Mode: search & sources ----
  getJobSources(): Observable<JobSourceMeta[]> {
    return this.http.get<ApiEnvelope<JobSourceMeta[]>>(`${this.base}/jobs/sources`).pipe(this.data());
  }
  searchJobs(q?: Query): Observable<{ items: Job[]; total: number }> {
    return this.http.get<PaginatedEnvelope<any>>(`${this.base}/jobs/search`, { params: this.params(q) })
      .pipe(map((r) => ({ items: r.data.map(mapJob), total: r.pagination.total })));
  }
  syncJobs(body: { source?: string; search?: string; limit?: number }):
    Observable<{ imported: number; sources: string[]; errors: { source: string; error: string }[] }> {
    return this.http.post<ApiEnvelope<any>>(`${this.base}/jobs/sync`, body).pipe(this.data());
  }
  importJob(body: { title: string; company?: string; location?: string; description?: string; applicationUrl?: string; salary?: string }): Observable<Job> {
    return this.http.post<ApiEnvelope<any>>(`${this.base}/jobs/import`, body).pipe(map((r) => mapJob(r.data)));
  }

  // ---- Job Mode: saved jobs ----
  saveJob(id: string, patch: { favorite?: boolean; archived?: boolean; priority?: string; notes?: string }) {
    return this.http.post<ApiEnvelope<any>>(`${this.base}/jobs/${id}/save`, patch).pipe(this.data());
  }
  unsaveJob(id: string) { return this.http.delete(`${this.base}/jobs/${id}/save`); }

  // ---- Job Mode: application tracker ----
  applyJob(body: { jobId: string; status?: ApplicationStatus; resumeId?: string; notes?: string }): Observable<Application> {
    return this.http.post<ApiEnvelope<any>>(`${this.base}/jobs/apply`, body).pipe(map((r) => mapApplication(r.data)));
  }
  listApplications(status?: string): Observable<{ items: Application[]; byStatus: Record<string, Application[]>; counts: Record<string, number>; total: number }> {
    return this.http.get<ApiEnvelope<any>>(`${this.base}/applications`, { params: this.params({ status }) }).pipe(this.data());
  }
  updateApplication(id: string, patch: { status?: ApplicationStatus; note?: string; notes?: string; resumeId?: string }): Observable<Application> {
    return this.http.patch<ApiEnvelope<any>>(`${this.base}/applications/${id}`, patch).pipe(map((r) => mapApplication(r.data)));
  }
  deleteApplication(id: string) { return this.http.delete(`${this.base}/applications/${id}`); }
  jobStats(): Observable<any> {
    return this.http.get<ApiEnvelope<any>>(`${this.base}/applications/stats`).pipe(this.data());
  }
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
function mapJob(d: any): Job {
  return {
    id: d.id ?? d._id, title: d.title, company: d.company || '', companyLogo: d.companyLogo || '',
    location: d.location || '', salary: d.salary || '', salaryMin: d.salaryMin ?? null, salaryMax: d.salaryMax ?? null,
    description: d.description || '', requiredSkills: d.requiredSkills ?? [], applicationUrl: d.applicationUrl || '',
    remoteType: d.remoteType || 'unknown', employmentType: d.employmentType || 'unknown', experienceLevel: d.experienceLevel || 'unknown',
    visaSponsorship: !!d.visaSponsorship, easyApply: !!d.easyApply, tags: d.tags ?? [],
    source: d.source || '', postedDate: d.postedDate ? day(d.postedDate) : null, saved: !!d.saved,
  };
}
function mapApplication(d: any): Application {
  return {
    id: d.id ?? d._id, jobId: d.jobId, title: d.title || '', company: d.company || '', status: d.status,
    resumeId: d.resumeId || '', notes: d.notes || '', appliedAt: d.appliedAt ? day(d.appliedAt) : null,
    timeline: (d.timeline ?? []).map((t: any) => ({ status: t.status, note: t.note || '', at: dateTime(t.at) })),
    createdAt: day(d.createdAt), updatedAt: day(d.updatedAt),
  };
}
