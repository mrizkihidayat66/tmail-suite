import { NextResponse } from "next/server";

/**
 * OpenAPI Documentation Route
 * 
 * Provides Swagger UI for API documentation
 * Access at: /api/docs
 */
export async function GET() {
  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TMail Suite API Documentation</title>
    <meta name="description" content="Interactive API documentation for TMail Suite" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js" crossorigin></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js" crossorigin></script>
    <script>
      window.onload = () => {
        fetch('/api/openapi')
          .then(res => res.json())
          .then(spec => {
            window.ui = SwaggerUIBundle({
              spec,
              dom_id: '#swagger-ui',
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              layout: 'StandaloneLayout',
              deepLinking: true,
              displayOperationId: true,
              displayRequestDuration: true,
              filter: true
            });
          })
          .catch(err => {
            document.getElementById('swagger-ui').innerHTML = 
              '<div style="padding: 20px; color: red;">Failed to load API specification: ' + err.message + '</div>';
          });
      };
    </script>
  </body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
