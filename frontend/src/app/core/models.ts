export type CampaignStatus = 'sent' | 'sending' | 'scheduled' | 'draft' | 'failed' | 'paused';
export type EmailStatus = 'delivered' | 'opened' | 'bounced' | 'failed' | 'pending';

export interface Campaign {
  id: string;
  name: string;
  sent: number;
  total: number;
  status: CampaignStatus;
  createdAt: string;
  openRate?: number;
}

export interface EmailRecord {
  id: string;
  recipient: string;
  name: string;
  subject: string;
  status: EmailStatus;
  date: string;
  campaign: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  updatedAt: string;
  uses: number;
  accent: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  position: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  favorite: boolean;
  groups: string[];
  addedAt: string;
}

export interface Resume {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface InboxItem {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  to: string;
  toEmail: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export interface InboxMessage {
  id: string;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  date: string;
  html: string;
  unread: boolean;
}

export interface InboxThread {
  threadId: string;
  subject: string;
  messages: InboxMessage[];
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  gmailAccount: string;
  gmailConnected: boolean;
  signature: string;
  role: string;
  initials: string;
  // Per-user sending credentials (password never returned)
  mailUser?: string;
  mailHost?: string;
  mailPort?: number;
  mailFromName?: string;
  mailConfigured?: boolean;
  googleConnected?: boolean;
  plan?: 'free' | 'pro' | 'business';
  aiEnabled?: boolean;
  aiModel?: string;
  aiUseCustom?: boolean;
  aiCustomBaseUrl?: string;
  aiCustomModel?: string;
  aiCustomConfigured?: boolean;
}

export interface AiStatus {
  configured: boolean;
  provider: string | null;
  source: 'default' | 'custom';
  defaultModel: string | null;
  model: string;
  enabled: boolean;
  plan: 'free' | 'pro' | 'business';
  useCustom: boolean;
  customBaseUrl: string;
  customModel: string;
  customConfigured: boolean;
}

export interface DashboardStats {
  sentToday: number;
  pending: number;
  failed: number;
  totalContacts: number;
  activeCampaigns: number;
  gmailConnected: boolean;
}

export interface AnalyticsData {
  totalSent: number;
  deliveryRate: number;
  failureRate: number;
  openRate: number;
  breakdown: { status: string; count: number }[];
  weekly: { label: string; value: number }[];
  monthly: { label: string; sent: number; opened: number }[];
  topCampaigns: { name: string; rate: number }[];
}

/** Standard API envelopes returned by the backend */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedEnvelope<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
