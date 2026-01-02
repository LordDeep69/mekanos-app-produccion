/**
 * MEKANOS S.A.S - Portal Admin
 * Route Handler para NextAuth.js v5
 * 
 * Este archivo expone los endpoints de autenticación:
 * - GET/POST /api/auth/signin
 * - GET/POST /api/auth/signout
 * - GET /api/auth/session
 * - GET/POST /api/auth/callback/credentials
 */

import { handlers } from '@/auth';

export const { GET, POST } = handlers;
