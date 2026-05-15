import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Load pre-generated OpenAPI spec from public/openapi.json
 * Generated at build time by scripts/generate-openapi.js
 */
let cachedSpec: Record<string, unknown> | null = null;

function loadSpec(): Record<string, unknown> {
  if (cachedSpec) return cachedSpec;

  const specPath = join(process.cwd(), "public", "openapi.json");
  const content = readFileSync(specPath, "utf-8");
  cachedSpec = JSON.parse(content);
  return cachedSpec!;
}

/**
 * GET /api/openapi
 * 
 * Returns the OpenAPI specification in JSON format
 * Server URLs are dynamically derived from the request Host header
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;

  const spec = {
    ...loadSpec(),
    servers: [
      {
        url: baseUrl,
        description: "Current server",
      },
    ],
  };

  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
