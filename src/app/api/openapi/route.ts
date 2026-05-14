import { NextResponse } from "next/server";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

/**
 * Generate OpenAPI specification from JSDoc comments
 */
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "TMail Suite API",
      version: "1.0.0",
      description: `
# TMail Suite API Documentation

TMail Suite is a comprehensive temporary email management system with Gmail integration.

## Features
- 📧 Temporary email account management
- 🔐 Secure authentication and API key management
- 📊 Real-time email monitoring and statistics
- 🔄 Gmail integration with OAuth2
- 👥 Multi-domain support
- 📝 Comprehensive audit logging
- 🛡️ Rate limiting and security controls

## Authentication

### Session-based Authentication
For admin operations, use session-based authentication:
1. Login via \`POST /api/v1/auth/login\`
2. Receive session token in response
3. Include token in subsequent requests via \`Authorization: Bearer <token>\` header

### API Key Authentication
For programmatic access, use API keys:
1. Create API key via \`POST /api/v1/api-keys\`
2. Include key in requests via \`X-API-Key\` header
3. API keys support scoped permissions

## Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Authenticated: 1000 requests per 15 minutes
- Burst protection: 10 requests per second

## Error Handling
All errors follow consistent format:
\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
\`\`\`

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 429: Too Many Requests
- 500: Internal Server Error

## Pagination
List endpoints support pagination:
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 20, max: 100)

Response includes pagination metadata:
\`\`\`json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
\`\`\`
      `,
      contact: {
        name: "TMail Suite Support",
        email: "support@tmail-suite.local",
      },
      license: {
        name: "GPL-3.0",
        url: "https://www.gnu.org/licenses/gpl-3.0.html",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://api.tmail-suite.local",
        description: "Production server",
      },
    ],
    tags: [
      {
        name: "Authentication",
        description: "Admin authentication and session management",
      },
      {
        name: "Accounts",
        description: "Temporary email account management",
      },
      {
        name: "Emails",
        description: "Email retrieval and management",
      },
      {
        name: "API Keys",
        description: "API key management for programmatic access",
      },
      {
        name: "Domains",
        description: "Domain configuration and management",
      },
      {
        name: "Gmail",
        description: "Gmail integration and OAuth2 management",
      },
      {
        name: "Admin",
        description: "System administration and monitoring",
      },
      {
        name: "Utils",
        description: "Utility endpoints for password and username generation",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Session token obtained from login endpoint",
        },
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "API key for programmatic access",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
            code: {
              type: "string",
              description: "Error code",
            },
            details: {
              type: "object",
              description: "Additional error details",
            },
          },
          required: ["error"],
        },
        Success: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              description: "Operation success status",
            },
            message: {
              type: "string",
              description: "Success message",
            },
          },
          required: ["success"],
        },
        Pagination: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              minimum: 1,
              description: "Current page number",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              description: "Items per page",
            },
            total: {
              type: "integer",
              description: "Total number of items",
            },
            totalPages: {
              type: "integer",
              description: "Total number of pages",
            },
          },
          required: ["page", "limit", "total", "totalPages"],
        },
      },
    },
  },
  apis: [
    path.join(process.cwd(), "src/app/api/v1/**/*.ts"),
    path.join(process.cwd(), "src/lib/api/**/*.ts"),
  ],
});

/**
 * GET /api/openapi
 * 
 * Returns the OpenAPI specification in JSON format
 */
export async function GET() {
  return NextResponse.json(swaggerSpec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
