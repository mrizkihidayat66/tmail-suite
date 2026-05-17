import { NextRequest, NextResponse } from "next/server";
import { generateOpenAPIDocument } from "@/lib/api/openapi-registry";

/**
 * GET /api/openapi
 * 
 * Returns the OpenAPI specification in JSON format
 * Generated dynamically from Zod schemas and registry
 * Server URLs are dynamically derived from the request Host header
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;

  const spec = generateOpenAPIDocument(baseUrl);

  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
