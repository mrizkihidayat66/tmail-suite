import { NextResponse } from "next/server";

export async function GET() {
  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>TMail Suite API Documentation</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/openapi"
      data-configuration='{"theme":"purple","layout":"modern","defaultOpenAllTags":true}'
    ></script>
    <script src="/api/docs/assets/browser/standalone.js"></script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

