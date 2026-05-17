import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z);

/**
 * Common Schemas for API Documentation
 * These schemas serve as single source of truth for both runtime validation AND OpenAPI spec generation.
 */

// Error Response Schema
export const ErrorResponseSchema = z.object({
  error: z.string().describe("Error message"),
  code: z.string().optional().describe("Error code"),
  details: z.any().optional().describe("Additional error details"),
}).openapi("ErrorResponse");

// Success Response Schema
export const SuccessResponseSchema = z.object({
  success: z.boolean().describe("Operation success status"),
  message: z.string().optional().describe("Success message"),
}).openapi("SuccessResponse");

// Pagination Schema
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1).describe("Current page number"),
  limit: z.number().int().min(1).max(100).default(20).describe("Items per page"),
  total: z.number().int().describe("Total number of items"),
  totalPages: z.number().int().describe("Total number of pages"),
}).openapi("Pagination");

// Account Schema
export const AccountSchema = z.object({
  id: z.string().describe("Account ID"),
  username: z.string().describe("Account username"),
  email: z.string().email().describe("Account email address"),
  domainId: z.string().describe("Domain ID"),
  expiresAt: z.string().datetime().describe("Account expiration date"),
  createdAt: z.string().datetime().describe("Account creation date"),
  updatedAt: z.string().datetime().describe("Last update date"),
  deletedAt: z.string().datetime().nullable().optional().describe("Deletion date if soft deleted"),
}).openapi("Account");

// Email Schema
export const EmailSchema = z.object({
  id: z.string().describe("Email ID"),
  accountId: z.string().describe("Associated account ID"),
  gmailMessageId: z.string().describe("Gmail message ID"),
  subject: z.string().describe("Email subject"),
  from: z.string().describe("Sender email address"),
  to: z.string().optional().describe("Recipient email address"),
  body: z.string().optional().describe("Email body content"),
  receivedAt: z.string().datetime().describe("Email received date"),
  isRead: z.boolean().describe("Read status"),
}).openapi("Email");

// API Key Schema
export const ApiKeySchema = z.object({
  id: z.string().describe("API Key ID"),
  name: z.string().describe("API Key name"),
  keyPrefix: z.string().describe("API Key prefix (first 12 characters)"),
  scopes: z.array(z.string()).describe("API Key scopes/permissions"),
  isActive: z.boolean().describe("Active status"),
  expiresAt: z.string().datetime().nullable().optional().describe("Expiration date"),
  lastUsedAt: z.string().datetime().nullable().optional().describe("Last usage date"),
  createdAt: z.string().datetime().describe("Creation date"),
  revokedAt: z.string().datetime().nullable().optional().describe("Revocation date"),
}).openapi("ApiKey");

// Domain Schema
export const DomainSchema = z.object({
  id: z.string().describe("Domain ID"),
  domain: z.string().describe("Domain name"),
  isActive: z.boolean().describe("Active status"),
  createdAt: z.string().datetime().describe("Creation date"),
}).openapi("Domain");

// System Stats Schema
export const SystemStatsSchema = z.object({
  totalAccounts: z.number().int().describe("Total number of accounts"),
  activeAccounts: z.number().int().describe("Number of active accounts"),
  expiredAccounts: z.number().int().describe("Number of expired accounts"),
  totalEmails: z.number().int().describe("Total number of emails"),
  emailsLast24h: z.number().int().describe("Emails received in last 24 hours"),
  totalApiKeys: z.number().int().describe("Total number of API keys"),
  activeApiKeys: z.number().int().describe("Number of active API keys"),
  gmailConnected: z.boolean().describe("Gmail connection status"),
  totalDomains: z.number().int().describe("Total number of domains"),
  activeDomains: z.number().int().describe("Number of active domains"),
}).openapi("SystemStats");

// System Health Schema
export const SystemHealthSchema = z.object({
  status: z.enum(["ok", "degraded"]).describe("Overall system status"),
  database: z.enum(["ok", "error"]).describe("Database status"),
  gmail: z.enum(["connected", "disconnected"]).describe("Gmail connection status"),
}).openapi("SystemHealth");

// Create Account Request Schema
export const CreateAccountRequestSchema = z.object({
  username: z.string().min(3).max(50).optional().describe("Custom username (auto-generated if not provided)"),
  password: z.string().min(8).optional().describe("Custom password (auto-generated if not provided)"),
  domainId: z.string().optional().describe("Domain ID (uses default if not provided)"),
  expiresInDays: z.number().int().min(1).max(365).default(7).describe("Account expiration in days"),
  usernamePattern: z.enum(["random", "en", "id", "zh", "ja"]).optional().describe("Username generation pattern"),
}).openapi("CreateAccountRequest");

// Update Account Request Schema
export const UpdateAccountRequestSchema = z.object({
  expiresAt: z.string().datetime().optional().describe("New expiration date"),
  password: z.string().min(8).optional().describe("New password"),
}).openapi("UpdateAccountRequest");

// Create API Key Request Schema
export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(100).describe("API Key name"),
  scopes: z.array(z.string()).min(1).describe("API Key scopes/permissions"),
  expiresInDays: z.number().int().min(1).optional().describe("Expiration in days (never expires if not provided)"),
}).openapi("CreateApiKeyRequest");

// Update API Key Request Schema
export const UpdateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(100).optional().describe("New API Key name"),
  scopes: z.array(z.string()).min(1).optional().describe("New API Key scopes"),
}).openapi("UpdateApiKeyRequest");

// Login Request Schema
export const LoginRequestSchema = z.object({
  username: z.string().min(1).describe("Admin username"),
  password: z.string().min(1).describe("Admin password"),
}).openapi("LoginRequest");

// Admin User Schema
export const AdminUserSchema = z.object({
  id: z.string().describe("User ID"),
  username: z.string().describe("Username"),
  displayName: z.string().describe("Display name"),
  mustChangePassword: z.boolean().optional().describe("Whether user must change password"),
}).openapi("AdminUser");

// Login Response Schema
export const LoginResponseSchema = z.object({
  user: AdminUserSchema.describe("User information"),
  mustChangePassword: z.boolean().describe("Whether user must change password"),
}).openapi("LoginResponse");

// Logout Response Schema
export const LogoutResponseSchema = z.object({
  message: z.string().describe("Logout confirmation message"),
}).openapi("LogoutResponse");

// Bulk Create Accounts Request Schema
export const BulkCreateAccountsRequestSchema = z.object({
  count: z.number().int().min(1).max(100).describe("Number of accounts to create"),
  domainId: z.string().optional().describe("Domain ID for all accounts"),
  expiresInDays: z.number().int().min(1).max(365).default(7).describe("Expiration in days for all accounts"),
  usernamePattern: z.enum(["random", "en", "id", "zh", "ja"]).optional().describe("Username generation pattern"),
}).openapi("BulkCreateAccountsRequest");

// Email Stats Schema
export const EmailStatsSchema = z.object({
  totalEmails: z.number().int().describe("Total number of emails"),
  unreadEmails: z.number().int().describe("Number of unread emails"),
  last24Hours: z.number().int().describe("Emails received in last 24 hours"),
  last7Days: z.number().int().describe("Emails received in last 7 days"),
}).openapi("EmailStats");

// Audit Log Schema
export const AuditLogSchema = z.object({
  id: z.string().describe("Audit log ID"),
  actorType: z.string().describe("Actor type (admin, system, api_key)"),
  actorId: z.string().optional().describe("Actor ID"),
  actorName: z.string().optional().describe("Actor name"),
  action: z.string().describe("Action performed"),
  targetType: z.string().optional().describe("Target type"),
  targetId: z.string().optional().describe("Target ID"),
  targetName: z.string().optional().describe("Target name"),
  metadata: z.string().optional().describe("Additional metadata (JSON string)"),
  ipAddress: z.string().optional().describe("IP address"),
  userAgent: z.string().optional().describe("User agent"),
  createdAt: z.string().datetime().describe("Log creation date"),
}).openapi("AuditLog");

// Export types
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type Account = z.infer<typeof AccountSchema>;
export type Email = z.infer<typeof EmailSchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
export type Domain = z.infer<typeof DomainSchema>;
export type SystemStats = z.infer<typeof SystemStatsSchema>;
export type SystemHealth = z.infer<typeof SystemHealthSchema>;
export type CreateAccountRequest = z.infer<typeof CreateAccountRequestSchema>;
export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequestSchema>;
export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;
export type UpdateApiKeyRequest = z.infer<typeof UpdateApiKeyRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
export type AdminUser = z.infer<typeof AdminUserSchema>;
export type BulkCreateAccountsRequest = z.infer<typeof BulkCreateAccountsRequestSchema>;
export type EmailStats = z.infer<typeof EmailStatsSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
