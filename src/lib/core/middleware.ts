import { NextRequest, NextResponse } from "next/server";
import { verifySession, SessionPayload } from "./auth";
import { verifyApiKey, validateScopes } from "@/lib/features/api-keys/service";
import { handleError } from "./response";
import { UnauthorizedError, ForbiddenError } from "./errors";
import { parseJsonSafe } from "@/lib/shared/utils";
import { checkApiKeyRateLimit } from "./rate-limit";

export type RouteContext<P extends Record<string, string> = Record<string, string>> = {
  params: P;
};

export type SessionWithScopes = SessionPayload & {
  scopes?: string[];
  isApiKey?: boolean;
  apiKeyId?: string;
};

type AuthedHandler<P extends Record<string, string> = Record<string, string>> = (
  req: NextRequest,
  session: SessionWithScopes,
  ctx: RouteContext<P>
) => Promise<NextResponse>;

async function resolveAuth(req: NextRequest): Promise<SessionWithScopes> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer tm_")) {
    const rawKey = authHeader.slice(7).trim(); // Extract and trim Bearer token
    const key = await verifyApiKey(rawKey);
    if (!key) throw new UnauthorizedError("Invalid or expired API key");
    
    const scopes = parseJsonSafe<string[]>(key.scopes, ["*"]);
    return { 
      sub: key.createdById, 
      username: `apikey:${key.keyPrefix}`,
      scopes,
      isApiKey: true,
      apiKeyId: key.id,
    };
  }

  const token = req.cookies.get("token")?.value;
  if (!token) throw new UnauthorizedError();
  const session = await verifySession(token);
  
  // Session-based auth has full access (no scope restrictions)
  return { ...session, scopes: ["*"], isApiKey: false };
}

export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: AuthedHandler<P>,
  options?: { requiredScopes?: string[] }
) {
  return async (req: NextRequest, ctx: { params?: P } = {}): Promise<NextResponse> => {
    try {
      const session = await resolveAuth(req);
      
      // Check API key rate limit
      if (session.isApiKey && session.apiKeyId) {
        const rateLimit = checkApiKeyRateLimit(session.apiKeyId);
        if (!rateLimit.allowed) {
          return NextResponse.json(
            { 
              error: "Too Many Requests",
              message: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`,
              retryAfter: rateLimit.retryAfter
            },
            { 
              status: 429,
              headers: {
                "X-RateLimit-Limit": String(rateLimit.limit ?? 0),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": String(rateLimit.resetAt ?? 0),
                "Retry-After": String(rateLimit.retryAfter ?? 0)
              }
            }
          );
        }
        
        // Add rate limit headers to response (will be set later)
        req.headers.set("X-RateLimit-Info", JSON.stringify({
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt
        }));
      }
      
      // Check scopes if required and using API key
      if (options?.requiredScopes && session.isApiKey) {
        const hasAccess = validateScopes(options.requiredScopes, session.scopes ?? []);
        if (!hasAccess) {
          throw new ForbiddenError("Insufficient permissions. Required scopes: " + options.requiredScopes.join(", "));
        }
      }
      
      const response = await handler(req, session, { params: ctx.params ?? ({} as P) });
      
      // Add rate limit headers to successful responses for API keys
      if (session.isApiKey && session.apiKeyId) {
        const rateLimitInfo = req.headers.get("X-RateLimit-Info");
        if (rateLimitInfo) {
          const info = JSON.parse(rateLimitInfo);
          response.headers.set("X-RateLimit-Limit", String(info.limit));
          response.headers.set("X-RateLimit-Remaining", String(info.remaining));
          response.headers.set("X-RateLimit-Reset", String(info.resetAt));
        }
      }
      
      return response;
    } catch (error) {
      return handleError(error);
    }
  };
}

export function withErrorHandler(
  handler: (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params?: Record<string, string> } = {}): Promise<NextResponse> => {
    try {
      return await handler(req, { params: ctx.params ?? {} });
    } catch (error) {
      return handleError(error);
    }
  };
}
