import { NextResponse } from "next/server";

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="TMail Suite API Documentation - Interactive API reference with testing capabilities" />
    <title>TMail Suite API Documentation</title>
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/openapi"
      data-configuration='{
        "theme": "default",
        "layout": "modern",
        "defaultHttpClient": {
          "targetKey": "javascript",
          "clientKey": "fetch"
        },
        "authentication": {
          "preferredSecurityScheme": "bearerAuth",
          "http": {
            "bearer": {
              "token": ""
            }
          }
        },
        "hiddenClients": [],
        "darkMode": true
      }'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.97"></script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
