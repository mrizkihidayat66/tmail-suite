import { NextRequest, NextResponse } from "next/server";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

/**
 * Generate OpenAPI specification from JSDoc comments
 */
function generateOpenAPISpec() {
  return swaggerJsdoc({
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
For web UI operations:
1. Login via \`POST /api/v1/auth/login\`
2. Session cookie is automatically set
3. All subsequent requests include session automatically

### API Key Authentication
For programmatic access:
1. Create API key via dashboard or \`POST /api/v1/api-keys\`
2. Include key in requests via \`Authorization: Bearer <api_key>\` header
3. API keys support scoped permissions

## Rate Limiting
- Default: 100 requests per minute per IP
- Login: 5 attempts per 15 minutes
- Authenticated requests have higher limits

## Error Handling
All errors follow consistent format:
\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
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
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Session token or API key (prefix: tm_)",
          },
        },
      },
    },
    apis: [
      path.join(process.cwd(), "src/app/api/v1/**/*.ts"),
      path.join(process.cwd(), "src/lib/api/**/*.ts"),
    ],
  });
}

/**
 * OpenAPI Documentation Route
 * 
 * Provides Scalar API Reference for interactive API documentation
 * Access at: /api/docs (requires authentication)
 * 
 * Query parameters:
 * - format=json: Returns OpenAPI spec in JSON format
 * - (no params): Returns Scalar HTML interface
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  // If format=json, return OpenAPI spec
  if (format === "json") {
    const spec = generateOpenAPISpec();
    return NextResponse.json(spec, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  }

  // Otherwise, return Scalar HTML interface
  const configuration = {
    theme: "default",
    layout: "modern",
    defaultOpenAllTags: false,
    showSidebar: true,
    hideModels: false,
    hideDownloadButton: false,
    darkMode: false,
    authentication: {
      preferredSecurityScheme: "bearerAuth",
      apiKey: {
        token: ""
      }
    }
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TMail Suite API Documentation</title>
    <meta name="description" content="Interactive API documentation for TMail Suite with Scalar" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/docs?format=json"
      data-configuration='${JSON.stringify(configuration)}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
