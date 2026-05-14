import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { ZodError } from "zod";
import { logger } from "./logger";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Track error for monitoring/alerting
 * In production, this should send to error tracking service (Sentry, etc.)
 */
function trackError(error: unknown, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to Sentry or similar error tracking service
    // Sentry.captureException(error, { extra: context });
  }
  
  logger.error(
    'API Error',
    error instanceof Error ? error : undefined,
    { ...context, errorType: error?.constructor?.name }
  );
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    // Application errors are expected, log at info level
    if (error.statusCode >= 500) {
      trackError(error, { code: error.code });
    }
    
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const message = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json(
      { error: message, code: "VALIDATION_ERROR" },
      { status: 422 }
    );
  }

  // Unexpected errors - track for monitoring
  trackError(error, { type: 'unexpected' });
  
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
