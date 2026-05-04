export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
}

export interface AccountRow {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  label: string | null;
  notes: string | null;
  ttlHours: number;
  expiresAt: string | null;
  isActive: boolean;
  emailCount: number;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountWithPassword extends AccountRow {
  password: string;
}

export interface EmailRow {
  id: string;
  accountId: string;
  fromAddress: string;
  fromName: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: string;
  isRead: boolean;
  hasAttachments: boolean;
  sizeBytes: number | null;
  seen: boolean;
  from: { address: string; name: string | null };
}

export interface EmailDetail extends EmailRow {
  gmailMessageId: string;
  gmailThreadId: string | null;
  toAddress: string;
  ccAddresses: string[];
  bccAddresses: string[];
  bodyText: string | null;
  bodyHtml: string | null;
  rawHeaders: Record<string, string>;
  gmailLabels: string[];
  attachments: AttachmentRow[];
}

export interface AttachmentRow {
  id: string;
  filename: string;
  contentType: string | null;
  sizeBytes: number | null;
  storagePath: string | null;
}

export interface ApiKeyRow {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKeyWithSecret extends ApiKeyRow {
  key: string;
}

export interface AdminUserRow {
  id: string;
  username: string;
  displayName: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface MeResponse {
  id: string;
  username: string;
  displayName: string | null;
  mustChangePassword: boolean;
}

export interface SystemStats {
  totalAccounts: number;
  activeAccounts: number;
  expiredAccounts: number;
  totalEmails: number;
  emailsLast24h: number;
  totalApiKeys: number;
  activeApiKeys: number;
  gmailConnected: boolean;
  totalDomains: number;
  activeDomains: number;
}

export interface DomainRow {
  id: string;
  domain: string;
  isActive: boolean;
  createdAt: string;
}

export interface GmailStatus {
  connected: boolean;
  token: {
    userEmail: string;
    expiresAt: string;
    updatedAt: string;
    scope: string;
  } | null;
}

export interface HealthStatus {
  status: string;
  database: string;
  gmail: string;
}

export interface AuditLogRow {
  id: string;
  actorType: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface EmailsResponse {
  emails: EmailRow[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export interface AccountsResponse {
  accounts: AccountRow[];
  total: number;
  page: number;
  limit: number;
}

