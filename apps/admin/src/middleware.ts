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

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  // Verificar si es una ruta pública
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isPublicPrefix = PUBLIC_PREFIXES.some((prefix) => 
    pathname.startsWith(prefix)
  );

  // Rutas públicas: permitir acceso
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
