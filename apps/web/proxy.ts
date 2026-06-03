import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Routes that do NOT require authentication
  const isPublicRoute = 
    request.nextUrl.pathname === '/' || 
    request.nextUrl.pathname.startsWith('/auth') || 
    request.nextUrl.pathname.startsWith('/f/') || 
    request.nextUrl.pathname.startsWith('/api') || 
    request.nextUrl.pathname.startsWith('/invite') ||
    request.nextUrl.pathname.startsWith('/share') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico');

  // Check if session cookie exists
  const hasSession = request.cookies.has('fc_session');

  // If not authenticated and trying to access a protected route
  if (!isPublicRoute && !hasSession) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // If authenticated and trying to access auth pages, redirect to dashboard
  if (hasSession && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Ensure middleware runs on all paths
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
