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
  lastLoginAt: string | null;
  createdAt: string;
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
}
