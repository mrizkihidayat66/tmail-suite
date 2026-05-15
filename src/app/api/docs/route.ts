import { NextResponse } from "next/server";

/**
 * OpenAPI Documentation Route
 * 
 * Provides Scalar API Reference for interactive API documentation
 * Access at: /api/docs
 */
export async function GET() {
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
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server"
      },
      {
        url: "https://api.tmail-suite.local",
        description: "Production server"
      }
    ]
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
      data-url="/api/openapi"
      data-configuration='${JSON.stringify(configuration)}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
