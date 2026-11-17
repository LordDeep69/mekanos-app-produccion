/**
 * Portal Admin White-Label
 * Middleware de Protección de Rutas (Auth + RBAC Zero-Trust)
 */

import { auth } from '@/auth';
import { canAccessRoute } from '@/lib/rbac';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login'];
const PUBLIC_PREFIXES = ['/api/auth', '/_next', '/favicon.ico', '/images'];

const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

function clearSessionCookies(response: NextResponse, req?: NextRequest) {
  for (const name of SESSION_COOKIE_NAMES) {
    response.cookies.delete(name);
  }
  if (req) {
    for (const cookie of req.cookies.getAll()) {
      if (
        SESSION_COOKIE_NAMES.some(
          (base) => cookie.name === base || cookie.name.startsWith(`${base}.`),
        )
      ) {
        response.cookies.delete(cookie.name);
      }
    }
  }
  return response;
}

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const sessionError = req.auth?.error === 'RefreshTokenError';
  const isLoggedIn = !!req.auth && !sessionError;

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isPublicPrefix = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (sessionError) {
    if (pathname === '/api/auth/session') {
      return clearSessionCookies(NextResponse.next(), req);
    }
    if (!isPublicPrefix) {
      if (pathname === '/login') {
        return clearSessionCookies(NextResponse.next(), req);
      }
      const loginUrl = new URL('/login', nextUrl);
      loginUrl.searchParams.set('error', 'SessionExpired');
      return clearSessionCookies(NextResponse.redirect(loginUrl), req);
    }
  }

  if (isPublicRoute || isPublicPrefix) {
    if (isLoggedIn && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Gobernanza RBAC por ruta y rol/permisos del usuario
  const userClaims = {
    rol: req.auth?.user?.rol,
    roles: req.auth?.user?.roles,
    permisos: req.auth?.user?.permisos,
  };
  if (pathname !== '/dashboard' && !canAccessRoute(pathname, userClaims)) {
    const deniedUrl = new URL('/dashboard', nextUrl);
    deniedUrl.searchParams.set('denied', pathname);
    return NextResponse.redirect(deniedUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
