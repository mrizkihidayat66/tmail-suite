import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  ErrorResponseSchema,
  SuccessResponseSchema,
  PaginationSchema,
  AccountSchema,
  EmailSchema,
  ApiKeySchema,
  DomainSchema,
  SystemStatsSchema,
  SystemHealthSchema,
  CreateAccountRequestSchema,
  UpdateAccountRequestSchema,
  CreateApiKeyRequestSchema,
  UpdateApiKeyRequestSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  LogoutResponseSchema,
  AdminUserSchema,
  BulkCreateAccountsRequestSchema,
  EmailStatsSchema,
  AuditLogSchema,
} from "./schemas";

/**
 * Central OpenAPI Registry
 * Single source of truth for all API routes and their schemas.
 */

export const registry = new OpenAPIRegistry();

// Register security schemes
registry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Session-based authentication using HTTP-only cookies",
});

registry.registerComponent("securitySchemes", "ApiKeyAuth", {
  type: "apiKey",
  in: "header",
  name: "X-API-Key",
  description: "API Key authentication",
});

// ============================================================================
// ACCOUNTS ROUTES
// ============================================================================

// GET /api/v1/accounts - List accounts
registry.registerPath({
  method: "get",
  path: "/api/v1/accounts",
  tags: ["Accounts"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "List temporary email accounts",
  description: "Retrieve a paginated list of temporary email accounts with optional filtering",
  request: {
    query: z.object({
      page: z.number().int().min(1).default(1).optional().openapi({ example: 1 }),
      limit: z.number().int().min(1).max(100).default(20).optional().openapi({ example: 20 }),
      search: z.string().optional().openapi({ description: "Search in email, label, or notes" }),
      label: z.string().optional().openapi({ description: "Filter by label" }),
      status: z.enum(["active", "expired"]).optional().openapi({ description: "Filter by status" }),
    }),
  },
  responses: {
    200: {
      description: "List of accounts with pagination",
      content: {
        "application/json": {
          schema: z.object({
            accounts: z.array(AccountSchema),
            total: z.number().int(),
            page: z.number().int(),
            limit: z.number().int(),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// POST /api/v1/accounts - Create account
registry.registerPath({
  method: "post",
  path: "/api/v1/accounts",
  tags: ["Accounts"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Create temporary email account",
  description: "Create a new temporary email account with optional custom settings",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            username: z.string().min(1).max(100).optional(),
            customPassword: z.string().min(8).max(128).optional(),
            displayName: z.string().max(200).optional(),
            ttlHours: z.number().int().min(0).max(8760).default(24),
            label: z.string().max(100).optional(),
            notes: z.string().max(1000).optional(),
            domain: z.string().max(253).optional(),
            usernamePattern: z.enum(["random", "en", "id", "zh", "ja"]).default("random").optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Account created successfully",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            email: z.string(),
            username: z.string(),
            password: z.string(),
            displayName: z.string().optional(),
            label: z.string().optional(),
            notes: z.string().optional(),
            ttlHours: z.number(),
            expiresAt: z.string().datetime(),
            isActive: z.boolean(),
            createdAt: z.string().datetime(),
          }),
        },
      },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/accounts/{id} - Get account by ID
registry.registerPath({
  method: "get",
  path: "/api/v1/accounts/{id}",
  tags: ["Accounts"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Get account by ID",
  description: "Retrieve detailed information about a specific account",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "Account ID" }),
    }),
  },
  responses: {
    200: {
      description: "Account details",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            email: z.string(),
            username: z.string(),
            displayName: z.string().optional(),
            label: z.string().optional(),
            notes: z.string().optional(),
            ttlHours: z.number(),
            expiresAt: z.string().datetime(),
            isActive: z.boolean(),
            emailCount: z.number().int(),
            lastSyncedAt: z.string().datetime().nullable(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          }),
        },
      },
    },
    404: {
      description: "Account not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// PATCH /api/v1/accounts/{id} - Update account
registry.registerPath({
  method: "patch",
  path: "/api/v1/accounts/{id}",
  tags: ["Accounts"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Update account",
  description: "Update account properties such as display name, label, notes, or TTL",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "Account ID" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            displayName: z.string().max(200).optional(),
            label: z.string().max(100).optional(),
            notes: z.string().max(1000).optional(),
            ttlHours: z.number().int().min(0).max(8760).optional(),
            isActive: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Account updated",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            email: z.string(),
            displayName: z.string().optional(),
            label: z.string().optional(),
            notes: z.string().optional(),
            ttlHours: z.number(),
            expiresAt: z.string().datetime(),
            isActive: z.boolean(),
            updatedAt: z.string().datetime(),
          }),
        },
      },
    },
    404: {
      description: "Account not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// DELETE /api/v1/accounts/{id} - Delete account
registry.registerPath({
  method: "delete",
  path: "/api/v1/accounts/{id}",
  tags: ["Accounts"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Delete account (soft delete)",
  description: "Soft delete an account. The account will be marked as deleted but data is retained.",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "Account ID" }),
    }),
  },
  responses: {
    204: { description: "Account deleted" },
    404: {
      description: "Account not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/accounts/{id}/emails - List emails for account
registry.registerPath({
  method: "get",
  path: "/api/v1/accounts/{id}/emails",
  tags: ["Emails"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "List emails for account",
  description: "Retrieve a paginated list of emails for a specific account",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "Account ID" }),
    }),
    query: z.object({
      page: z.number().int().min(1).default(1).optional(),
      limit: z.number().int().min(1).max(100).default(20).optional(),
      unread: z.boolean().optional().openapi({ description: "Filter unread only" }),
      subject: z.string().optional().openapi({ description: "Filter by subject" }),
      from: z.string().optional().openapi({ description: "Filter by sender" }),
    }),
  },
  responses: {
    200: {
      description: "List of emails",
      content: {
        "application/json": {
          schema: z.object({
            emails: z.array(EmailSchema),
            total: z.number().int(),
            page: z.number().int(),
            limit: z.number().int(),
          }),
        },
      },
    },
    404: {
      description: "Account not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/accounts/{id}/emails/{emailId} - Get email by ID
registry.registerPath({
  method: "get",
  path: "/api/v1/accounts/{id}/emails/{emailId}",
  tags: ["Emails"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Get email by ID",
  description: `Retrieve detailed information about a specific email.

**Response:**
- Returns complete email details
- Includes full email body (HTML and plain text)
- Shows all headers and metadata
- Lists attachments if any

**Note:**
- Does not automatically mark email as read
- Use PATCH endpoint to update read status
`,
  request: {
    params: z.object({
      id: z.string().openapi({ description: "Account ID" }),
      emailId: z.string().openapi({ description: "Email ID" }),
    }),
  },
  responses: {
    200: {
      description: "Email details",
      content: {
        "application/json": {
          schema: EmailSchema,
        },
      },
    },
    404: {
      description: "Email not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// PATCH /api/v1/accounts/{id}/emails/{emailId} - Update email read status
registry.registerPath({
  method: "patch",
  path: "/api/v1/accounts/{id}/emails/{emailId}",
  tags: ["Emails"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Update email read status",
  description: `Mark email as read or unread.

**Behavior:**
- Updates email's seen flag
- Does not sync back to Gmail
- Local status only

**Use Cases:**
- Mark email as read after viewing
- Mark email as unread for follow-up
- Bulk mark operations
`,
  request: {
    params: z.object({
      id: z.string().openapi({ description: "Account ID" }),
      emailId: z.string().openapi({ description: "Email ID" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            seen: z.boolean().openapi({ description: "Read status (true = read, false = unread)" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Email status updated",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
        },
      },
    },
    404: {
      description: "Email not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// DELETE /api/v1/accounts/{id}/emails/{emailId} - Delete email
registry.registerPath({
  method: "delete",
  path: "/api/v1/accounts/{id}/emails/{emailId}",
  tags: ["Emails"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Delete email",
  description: `Permanently delete an email from the database.

**Behavior:**
- Hard delete (permanent removal)
- Email data cannot be recovered
- Does not delete from Gmail
- Local deletion only

**Note:**
- This only removes email from TMail Suite database
- Original email remains in Gmail inbox
- Next sync will not re-fetch deleted emails
`,
  request: {
    params: z.object({
      id: z.string().openapi({ description: "Account ID" }),
      emailId: z.string().openapi({ description: "Email ID" }),
    }),
  },
  responses: {
    204: {
      description: "Email deleted successfully",
    },
    404: {
      description: "Email not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/accounts/{id}/stats - Get account email statistics
registry.registerPath({
  method: "get",
  path: "/api/v1/accounts/{id}/stats",
  tags: ["Accounts"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Get account email statistics",
  description: "Get email statistics for a specific account",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "Account ID" }),
    }),
  },
  responses: {
    200: {
      description: "Account email statistics",
      content: {
        "application/json": {
          schema: z.object({
            accountId: z.string(),
            email: z.string(),
            lastSyncedAt: z.string().datetime().nullable(),
            totalEmails: z.number().int(),
            unreadEmails: z.number().int(),
            last24Hours: z.number().int(),
            last7Days: z.number().int(),
          }),
        },
      },
    },
    404: {
      description: "Account not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// POST /api/v1/accounts/{id}/sync - Trigger email sync
registry.registerPath({
  method: "post",
  path: "/api/v1/accounts/{id}/sync",
  tags: ["Accounts"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Trigger email sync for account",
  description: "Manually trigger Gmail sync for a specific account",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "Account ID" }),
    }),
  },
  responses: {
    200: {
      description: "Sync completed",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            processed: z.number().int(),
            errors: z.number().int(),
          }),
        },
      },
    },
    404: {
      description: "Account not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// POST /api/v1/accounts/{id}/reset-password - Reset account password
registry.registerPath({
  method: "post",
  path: "/api/v1/accounts/{id}/reset-password",
  tags: ["Accounts"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Reset account password",
  description: "Generate a new random password for the account",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "Account ID" }),
    }),
  },
  responses: {
    200: {
      description: "Password reset successful",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            email: z.string(),
            password: z.string(),
            updatedAt: z.string().datetime(),
          }),
        },
      },
    },
    404: {
      description: "Account not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// POST /api/v1/accounts/bulk - Bulk create accounts
registry.registerPath({
  method: "post",
  path: "/api/v1/accounts/bulk",
  tags: ["Accounts"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Bulk create accounts",
  description: "Create multiple temporary email accounts at once",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            count: z.number().int().min(1).max(100).default(5),
            ttlHours: z.number().int().min(0).max(8760).default(24).optional(),
            label: z.string().max(100).optional(),
            domain: z.string().max(253).optional(),
            usernamePattern: z.enum(["random", "en", "id", "zh", "ja"]).default("random").optional(),
            fixedPassword: z.string().min(8).optional(),
            passwordOptions: z.object({
              length: z.number().int().min(8).max(128).optional(),
              includeSymbols: z.boolean().optional(),
            }).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Accounts created",
      content: {
        "application/json": {
          schema: z.object({
            accounts: z.array(z.object({
              id: z.string(),
              email: z.string(),
              username: z.string(),
              password: z.string(),
            })),
            count: z.number().int(),
            failures: z.array(z.object({
              index: z.number().int(),
              error: z.string(),
            })),
          }),
        },
      },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/accounts/export - Export accounts
registry.registerPath({
  method: "get",
  path: "/api/v1/accounts/export",
  tags: ["Accounts"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Export accounts data",
  description: "Export accounts as CSV or JSON file",
  request: {
    query: z.object({
      fmt: z.enum(["csv", "json"]).default("csv").optional().openapi({ description: "Export format" }),
      label: z.string().optional().openapi({ description: "Filter by label" }),
    }),
  },
  responses: {
    200: {
      description: "File download (CSV or JSON)",
      content: {
        "text/csv": { schema: z.string() },
        "application/json": { schema: z.array(AccountSchema) },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

// POST /api/v1/auth/login - Admin login
registry.registerPath({
  method: "post",
  path: "/api/v1/auth/login",
  tags: ["Authentication"],
  summary: "Admin login",
  description: "Authenticate with username and password. Returns a session cookie.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": {
          schema: LoginResponseSchema,
        },
      },
    },
    401: {
      description: "Invalid credentials",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// POST /api/v1/auth/logout - Admin logout
registry.registerPath({
  method: "post",
  path: "/api/v1/auth/logout",
  tags: ["Authentication"],
  security: [{ BearerAuth: [] }],
  summary: "Admin logout",
  description: "Invalidate the current session",
  responses: {
    200: {
      description: "Logout successful",
      content: {
        "application/json": {
          schema: LogoutResponseSchema,
        },
      },
    },
  },
});

// GET /api/v1/auth/me - Get current user
registry.registerPath({
  method: "get",
  path: "/api/v1/auth/me",
  tags: ["Authentication"],
  security: [{ BearerAuth: [] }],
  summary: "Get current user",
  description: "Get the currently authenticated user's information",
  responses: {
    200: {
      description: "Current user info",
      content: {
        "application/json": {
          schema: AdminUserSchema,
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ============================================================================
// API KEYS ROUTES
// ============================================================================

// GET /api/v1/api-keys - List API keys
registry.registerPath({
  method: "get",
  path: "/api/v1/api-keys",
  tags: ["API Keys"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "List API keys",
  description: "Retrieve all API keys (values are masked)",
  responses: {
    200: {
      description: "List of API keys",
      content: {
        "application/json": {
          schema: z.object({
            apiKeys: z.array(z.object({
              id: z.string(),
              name: z.string(),
              description: z.string().optional(),
              keyPrefix: z.string(),
              scopes: z.array(z.string()),
              expiresAt: z.string().datetime().nullable(),
              lastUsedAt: z.string().datetime().nullable(),
              usageCount: z.number().int(),
              isActive: z.boolean(),
              createdAt: z.string().datetime(),
            })),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// POST /api/v1/api-keys - Create API key
registry.registerPath({
  method: "post",
  path: "/api/v1/api-keys",
  tags: ["API Keys"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Create API key",
  description: "Create a new API key. The full key value is only returned once.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().min(1).max(100),
            description: z.string().max(500).optional(),
            scopes: z.array(z.string()).optional(),
            expiresAt: z.string().datetime().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "API key created",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            keyPrefix: z.string(),
            scopes: z.array(z.string()),
            expiresAt: z.string().datetime().nullable(),
            isActive: z.boolean(),
            createdAt: z.string().datetime(),
            key: z.string().openapi({ description: "Full API key (only shown once)" }),
          }),
        },
      },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// PATCH /api/v1/api-keys/{id} - Update API key
registry.registerPath({
  method: "patch",
  path: "/api/v1/api-keys/{id}",
  tags: ["API Keys"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Update API key",
  description: "Update API key properties",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "API Key ID" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().min(1).max(100).optional(),
            description: z.string().max(500).optional(),
            isActive: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "API key updated",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            isActive: z.boolean(),
            updatedAt: z.string().datetime(),
          }),
        },
      },
    },
    404: {
      description: "API key not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// DELETE /api/v1/api-keys/{id} - Revoke API key
registry.registerPath({
  method: "delete",
  path: "/api/v1/api-keys/{id}",
  tags: ["API Keys"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Revoke API key",
  description: "Permanently revoke an API key",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "API Key ID" }),
    }),
  },
  responses: {
    204: { description: "API key revoked" },
    404: {
      description: "API key not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/api-keys/{id}/reveal - Reveal API key value
registry.registerPath({
  method: "get",
  path: "/api/v1/api-keys/{id}/reveal",
  tags: ["API Keys"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Reveal API key value",
  description: "Reveal the full API key value",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "API Key ID" }),
    }),
  },
  responses: {
    200: {
      description: "API key value",
      content: {
        "application/json": {
          schema: z.object({
            key: z.string(),
          }),
        },
      },
    },
    404: {
      description: "API key not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// POST /api/v1/api-keys/{id}/rotate - Rotate API key
registry.registerPath({
  method: "post",
  path: "/api/v1/api-keys/{id}/rotate",
  tags: ["API Keys"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Rotate API key",
  description: "Generate a new key value for an existing API key. The old key is invalidated.",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "API Key ID" }),
    }),
  },
  responses: {
    201: {
      description: "API key rotated",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            keyPrefix: z.string(),
            scopes: z.array(z.string()),
            expiresAt: z.string().datetime().nullable(),
            isActive: z.boolean(),
            createdAt: z.string().datetime(),
            key: z.string().openapi({ description: "New full API key (only shown once)" }),
          }),
        },
      },
    },
    404: {
      description: "API key not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// GET /api/v1/admin/stats - System statistics
registry.registerPath({
  method: "get",
  path: "/api/v1/admin/stats",
  tags: ["Admin"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "System statistics",
  description: "Get overall system statistics including accounts, emails, and API keys",
  responses: {
    200: {
      description: "System statistics",
      content: {
        "application/json": {
          schema: z.object({
            accounts: z.object({
              total: z.number().int(),
              active: z.number().int(),
              inactive: z.number().int(),
            }),
            emails: z.object({
              total: z.number().int(),
              unread: z.number().int(),
              today: z.number().int(),
            }),
            apiKeys: z.object({
              total: z.number().int(),
              active: z.number().int(),
              revoked: z.number().int(),
            }),
            domains: z.object({
              total: z.number().int(),
              verified: z.number().int(),
            }),
            storage: z.object({
              used: z.number(),
              emails: z.number().int(),
            }),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/admin/config - Get system configuration
registry.registerPath({
  method: "get",
  path: "/api/v1/admin/config",
  tags: ["Admin"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Get system configuration",
  description: "Retrieve current system configuration values",
  responses: {
    200: {
      description: "System configuration",
      content: {
        "application/json": {
          schema: z.object({
            configs: z.record(z.string()),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// PATCH /api/v1/admin/config - Update system configuration
registry.registerPath({
  method: "patch",
  path: "/api/v1/admin/config",
  tags: ["Admin"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Update system configuration",
  description: "Update system configuration values",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            google_client_id: z.string().optional(),
            google_client_secret: z.string().optional(),
            google_redirect_uri: z.string().optional(),
            gmail_catchall_email: z.string().optional(),
            gmail_poll_interval: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Configuration updated",
      content: {
        "application/json": {
          schema: z.object({
            configs: z.record(z.string()),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/admin/health - System health check
registry.registerPath({
  method: "get",
  path: "/api/v1/admin/health",
  tags: ["Admin"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "System health check",
  description: "Check the health status of all system components",
  responses: {
    200: {
      description: "System health status",
      content: {
        "application/json": {
          schema: z.object({
            status: z.string(),
            database: z.object({ status: z.string(), latency: z.number() }),
            gmail: z.object({ status: z.string(), connected: z.boolean() }),
            scheduler: z.object({ status: z.string(), running: z.boolean() }),
            timestamp: z.string().datetime(),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// POST /api/v1/admin/cleanup - Cleanup expired accounts
registry.registerPath({
  method: "post",
  path: "/api/v1/admin/cleanup",
  tags: ["Admin"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Cleanup expired accounts",
  description: "Deactivate all expired accounts",
  responses: {
    200: {
      description: "Cleanup completed",
      content: {
        "application/json": {
          schema: z.object({
            deactivated: z.number().int(),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// POST /api/v1/admin/sync-all - Trigger Gmail sync for all accounts
registry.registerPath({
  method: "post",
  path: "/api/v1/admin/sync-all",
  tags: ["Admin"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Trigger Gmail sync for all accounts",
  description: "Manually trigger Gmail sync for all active accounts",
  responses: {
    200: {
      description: "Sync completed",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            accountsProcessed: z.number().int(),
            emailsFetched: z.number().int(),
            errors: z.number().int(),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/admin/domains - List all domains (admin)
registry.registerPath({
  method: "get",
  path: "/api/v1/admin/domains",
  tags: ["Admin", "Domains"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "List all domains (admin)",
  description: "List all domains including inactive ones",
  responses: {
    200: {
      description: "List of domains",
      content: {
        "application/json": {
          schema: z.object({
            domains: z.array(z.object({
              id: z.string(),
              domain: z.string(),
              isActive: z.boolean(),
              createdAt: z.string().datetime(),
              updatedAt: z.string().datetime(),
            })),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// POST /api/v1/admin/domains - Create domain
registry.registerPath({
  method: "post",
  path: "/api/v1/admin/domains",
  tags: ["Admin", "Domains"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Create domain",
  description: "Add a new domain to the system",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            domain: z.string().min(1),
            isActive: z.boolean().default(true).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Domain created",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            domain: z.string(),
            isActive: z.boolean(),
            createdAt: z.string().datetime(),
          }),
        },
      },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// PATCH /api/v1/admin/domains/{id} - Update domain
registry.registerPath({
  method: "patch",
  path: "/api/v1/admin/domains/{id}",
  tags: ["Admin", "Domains"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Update domain",
  description: "Update domain properties",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "Domain ID" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            domain: z.string().optional(),
            isActive: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Domain updated",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            domain: z.string(),
            isActive: z.boolean(),
            updatedAt: z.string().datetime(),
          }),
        },
      },
    },
    404: {
      description: "Domain not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// DELETE /api/v1/admin/domains/{id} - Delete domain
registry.registerPath({
  method: "delete",
  path: "/api/v1/admin/domains/{id}",
  tags: ["Admin", "Domains"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Delete domain",
  description: "Remove a domain from the system",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "Domain ID" }),
    }),
  },
  responses: {
    204: { description: "Domain deleted" },
    404: {
      description: "Domain not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/admin/users - List admin users
registry.registerPath({
  method: "get",
  path: "/api/v1/admin/users",
  tags: ["Admin"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "List admin users",
  description: "List all admin users",
  responses: {
    200: {
      description: "List of admin users",
      content: {
        "application/json": {
          schema: z.object({
            users: z.array(z.object({
              id: z.string(),
              username: z.string(),
              displayName: z.string(),
              isActive: z.boolean(),
              lastLoginAt: z.string().datetime().nullable(),
              createdAt: z.string().datetime(),
            })),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// POST /api/v1/admin/users - Create admin user
registry.registerPath({
  method: "post",
  path: "/api/v1/admin/users",
  tags: ["Admin"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Create admin user",
  description: "Create a new admin user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            username: z.string().min(1),
            password: z.string().min(8),
            displayName: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "User created",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            username: z.string(),
            displayName: z.string(),
            isActive: z.boolean(),
            createdAt: z.string().datetime(),
          }),
        },
      },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// PATCH /api/v1/admin/users/{id} - Update admin user
registry.registerPath({
  method: "patch",
  path: "/api/v1/admin/users/{id}",
  tags: ["Admin"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Update admin user",
  description: "Update admin user properties",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "User ID" }),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            displayName: z.string().optional(),
            currentPassword: z.string().optional(),
            password: z.string().min(8).optional(),
            isActive: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "User updated",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            username: z.string(),
            displayName: z.string(),
            isActive: z.boolean(),
            updatedAt: z.string().datetime(),
          }),
        },
      },
    },
    404: {
      description: "User not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// DELETE /api/v1/admin/users/{id} - Deactivate admin user
registry.registerPath({
  method: "delete",
  path: "/api/v1/admin/users/{id}",
  tags: ["Admin"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Deactivate admin user",
  description: "Deactivate an admin user account",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "User ID" }),
    }),
  },
  responses: {
    204: { description: "User deactivated" },
    404: {
      description: "User not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/admin/audit-log - Get audit logs
registry.registerPath({
  method: "get",
  path: "/api/v1/admin/audit-log",
  tags: ["Admin"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Get audit logs",
  description: "Retrieve paginated audit logs with optional filtering",
  request: {
    query: z.object({
      page: z.number().int().min(1).default(1).optional(),
      limit: z.number().int().min(1).max(100).default(20).optional(),
      action: z.string().optional().openapi({ description: "Filter by action" }),
      actorType: z.string().optional().openapi({ description: "Filter by actor type" }),
    }),
  },
  responses: {
    200: {
      description: "Audit logs",
      content: {
        "application/json": {
          schema: z.object({
            logs: z.array(AuditLogSchema),
            total: z.number().int(),
            page: z.number().int(),
            limit: z.number().int(),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ============================================================================
// DOMAINS ROUTES
// ============================================================================

// GET /api/v1/domains - List active domains
registry.registerPath({
  method: "get",
  path: "/api/v1/domains",
  tags: ["Domains"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "List active domains",
  description: "List all active domains available for account creation",
  responses: {
    200: {
      description: "List of active domains",
      content: {
        "application/json": {
          schema: z.object({
            domains: z.array(z.object({
              id: z.string(),
              domain: z.string(),
              createdAt: z.string().datetime(),
            })),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ============================================================================
// EMAILS ROUTES
// ============================================================================

// GET /api/v1/emails/search - Search emails
registry.registerPath({
  method: "get",
  path: "/api/v1/emails/search",
  tags: ["Emails"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Search emails",
  description: "Search emails across all accounts by subject, sender, or content",
  request: {
    query: z.object({
      q: z.string().openapi({ description: "Search query (required)" }),
      accountId: z.string().optional().openapi({ description: "Filter by account ID" }),
      limit: z.number().int().min(1).max(100).default(20).optional(),
    }),
  },
  responses: {
    200: {
      description: "Search results",
      content: {
        "application/json": {
          schema: z.object({
            emails: z.array(z.object({
              id: z.string(),
              accountId: z.string(),
              accountEmail: z.string(),
              subject: z.string(),
              from: z.string(),
              snippet: z.string(),
              receivedAt: z.string().datetime(),
              seen: z.boolean(),
            })),
            query: z.string(),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/emails/recent - Get recent emails
registry.registerPath({
  method: "get",
  path: "/api/v1/emails/recent",
  tags: ["Emails"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Get recent emails across all accounts",
  description: "Retrieve the most recent emails across all accounts",
  request: {
    query: z.object({
      limit: z.number().int().min(1).max(100).default(20).optional(),
    }),
  },
  responses: {
    200: {
      description: "Recent emails",
      content: {
        "application/json": {
          schema: z.object({
            emails: z.array(z.object({
              id: z.string(),
              accountId: z.string(),
              accountEmail: z.string(),
              subject: z.string(),
              from: z.string(),
              snippet: z.string(),
              receivedAt: z.string().datetime(),
              seen: z.boolean(),
            })),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ============================================================================
// GMAIL ROUTES
// ============================================================================

// GET /api/v1/gmail/connect - Initiate Gmail OAuth
registry.registerPath({
  method: "get",
  path: "/api/v1/gmail/connect",
  tags: ["Gmail"],
  security: [{ BearerAuth: [] }],
  summary: "Initiate Gmail OAuth connection",
  description: "Redirect to Google OAuth consent screen to connect Gmail",
  responses: {
    302: { description: "Redirect to Google OAuth" },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/gmail/callback - Gmail OAuth callback
registry.registerPath({
  method: "get",
  path: "/api/v1/gmail/callback",
  tags: ["Gmail"],
  summary: "Gmail OAuth callback handler",
  description: "Handles the OAuth callback from Google after user consent",
  request: {
    query: z.object({
      code: z.string().openapi({ description: "OAuth authorization code" }),
      state: z.string().openapi({ description: "CSRF state token" }),
      error: z.string().optional().openapi({ description: "OAuth error if any" }),
    }),
  },
  responses: {
    302: { description: "Redirect to /dashboard/settings" },
    400: {
      description: "OAuth error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/gmail/status - Gmail connection status
registry.registerPath({
  method: "get",
  path: "/api/v1/gmail/status",
  tags: ["Gmail"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Get Gmail connection status",
  description: "Check if Gmail is connected and get token details",
  responses: {
    200: {
      description: "Gmail connection status",
      content: {
        "application/json": {
          schema: z.object({
            connected: z.boolean(),
            token: z.object({
              userEmail: z.string(),
              expiresAt: z.string().datetime(),
              updatedAt: z.string().datetime(),
              scope: z.string(),
            }).nullable(),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ============================================================================
// UTILS ROUTES
// ============================================================================

// GET /api/v1/utils/generate-password - Generate passwords
registry.registerPath({
  method: "get",
  path: "/api/v1/utils/generate-password",
  tags: ["Utils"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Generate secure passwords",
  description: "Generate one or more secure random passwords",
  request: {
    query: z.object({
      count: z.number().int().min(1).max(20).default(1).optional(),
      length: z.number().int().min(8).max(128).default(16).optional(),
      includeSymbols: z.boolean().default(true).optional(),
      includeNumbers: z.boolean().default(true).optional(),
      includeUppercase: z.boolean().default(true).optional(),
    }),
  },
  responses: {
    200: {
      description: "Generated passwords",
      content: {
        "application/json": {
          schema: z.object({
            passwords: z.array(z.string()),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// GET /api/v1/utils/generate-username - Generate username
registry.registerPath({
  method: "get",
  path: "/api/v1/utils/generate-username",
  tags: ["Utils"],
  security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
  summary: "Generate random username",
  description: "Generate a random username based on the specified pattern",
  request: {
    query: z.object({
      pattern: z.enum(["random", "en", "id", "zh", "ja"]).default("random").optional(),
    }),
  },
  responses: {
    200: {
      description: "Generated username",
      content: {
        "application/json": {
          schema: z.object({
            username: z.string(),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

/**
 * Generate OpenAPI document from registry
 */
export function generateOpenAPIDocument(serverUrl: string) {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Tmail Suite API",
      version: "1.0.0",
      description: "Temporary email service API with Gmail integration",
      license: {
        name: "GPL-3.0",
        url: "https://www.gnu.org/licenses/gpl-3.0.html",
      },
    },
    servers: [
      {
        url: serverUrl,
        description: "API Server",
      },
    ],
    tags: [
      { name: "Accounts", description: "Temporary email account management" },
      { name: "Emails", description: "Email operations" },
      { name: "Authentication", description: "Admin authentication" },
      { name: "API Keys", description: "API key management" },
      { name: "Domains", description: "Domain management" },
      { name: "Admin", description: "Administrative operations" },
      { name: "Gmail", description: "Gmail integration" },
      { name: "Utils", description: "Utility endpoints" },
    ],
  });
}
