import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Serve Scalar API Reference assets from node_modules
 * This allows self-hosting to avoid CDN blocking issues
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join("/");
    const fullPath = join(
      process.cwd(),
      "node_modules",
      "@scalar",
      "api-reference",
      "dist",
      filePath
    );

    const content = await readFile(fullPath);

    // Determine content type
    let contentType = "application/octet-stream";
    if (filePath.endsWith(".js")) {
      contentType = "application/javascript";
    } else if (filePath.endsWith(".css")) {
      contentType = "text/css";
    } else if (filePath.endsWith(".woff2")) {
      contentType = "font/woff2";
    } else if (filePath.endsWith(".woff")) {
      contentType = "font/woff";
    } else if (filePath.endsWith(".ttf")) {
      contentType = "font/ttf";
    }

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Asset not found" },
      { status: 404 }
    );
  }
}
