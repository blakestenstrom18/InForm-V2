import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Session cookie name (must match lib/auth.ts)
const SESSION_COOKIE_NAME = 'inform_session';

// Middleware can't use Prisma (Edge Runtime limitation)
// So we only check for cookie presence, not validate it
// Actual validation happens in page/API routes (Node.js runtime)
function hasSessionCookie(request: NextRequest): boolean {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
  return !!sessionId;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/api/public',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/reset',
    '/api/auth/reset/confirm',
    '/api/auth/accept-invite',
  ];

  // Check if route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Auth routes (login, reset password, etc.)
  const authRoutes = ['/login', '/reset', '/accept-invite'];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Public form routes - pattern: /{orgSlug}/{formSlug}
  // Check if path matches pattern (two segments, not starting with known admin routes)
  const pathSegments = pathname.split('/').filter(Boolean);
  const isPublicFormRoute = 
    pathSegments.length === 2 && 
    !['dashboard', 'forms', 'submissions', 'review-queue', 'login', 'reset', 'accept-invite', 'api'].includes(pathSegments[0]) &&
    !pathname.startsWith('/forms/new') &&
    !pathname.startsWith('/forms/') && // Admin form routes
    !pathname.startsWith('/api/');

  // Allow public routes, public form routes, and API routes
  if (isPublicRoute || isPublicFormRoute) {
    return NextResponse.next();
  }

  // Check if user has session cookie (lightweight check - no DB validation)
  const hasSession = hasSessionCookie(request);

  // For API routes, check for session cookie
  if (pathname.startsWith('/api/')) {
    // Allow public API routes without session
    if (isPublicRoute) {
      return NextResponse.next();
    }
    // For protected API routes, require session cookie
    // Actual validation happens in the API route handler (Node.js runtime)
    if (!hasSession) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // For page routes, handle redirects based on session cookie presence
  // Redirect authenticated users (with cookie) away from auth pages
  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users (no cookie) to login
  // Exception: allow auth routes and public form routes
  if (!hasSession && !isAuthRoute && !isPublicFormRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

