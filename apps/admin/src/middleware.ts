/**
 * MEKANOS S.A.S - Portal Admin
 * Middleware de Protección de Rutas
 * 
 * ZERO TRUST: Todas las rutas están protegidas excepto:
 * - /login (página de autenticación)
 * - /api/auth/* (endpoints de NextAuth)
 * - /_next/* (assets de Next.js)
 * - /favicon.ico, /images/* (recursos estáticos)
 */

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login'];

// Prefijos de rutas que no requieren autenticación
const PUBLIC_PREFIXES = [
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/images',
];

// Cookies de sesión de NextAuth (v5 y v4, HTTP y HTTPS)
const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

function clearSessionCookies(response: NextResponse) {
  for (const name of SESSION_COOKIE_NAMES) {
    response.cookies.delete(name);
  }
  return response;
}

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const sessionError = req.auth?.error === 'RefreshTokenError';
  const isLoggedIn = !!req.auth && !sessionError;

  // Verificar si es una ruta pública
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isPublicPrefix = PUBLIC_PREFIXES.some((prefix) => 
    pathname.startsWith(prefix)
  );

  // Rutas públicas: permitir acceso
  // Sesión con refresh token inválido: limpiar cookie y forzar re-login.
  // Evita el bucle /dashboard -> API 401 -> /login -> /dashboard.
  if (sessionError && !isPublicPrefix) {
    if (pathname === '/login') {
      return clearSessionCookies(NextResponse.next());
    }
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('error', 'SessionExpired');
    return clearSessionCookies(NextResponse.redirect(loginUrl));
  }

  if (isPublicRoute || isPublicPrefix) {
    // Si está logueado y trata de ir a /login, redirigir a dashboard
    if (isLoggedIn && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  // Rutas protegidas: verificar autenticación
  if (!isLoggedIn) {
    // Guardar la URL original para redirigir después del login
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Usuario autenticado: permitir acceso
  return NextResponse.next();
});

export const config = {
  // Matcher: aplicar middleware a todas las rutas excepto archivos estáticos
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
