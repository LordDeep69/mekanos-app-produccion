/**
 * MEKANOS S.A.S - Portal Admin
 * Extensión de tipos NextAuth.js v5
 * 
 * ZERO TRUST: Declaración explícita de propiedades custom del User
 * Estas propiedades vienen del backend NestJS en /auth/login
 */

import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    /**
     * Extiende la interfaz User con propiedades custom del backend
     */
    interface User {
        id: string;
        email: string;
        nombre: string;
        rol: string;
        idEmpleado?: number;
        accessToken: string;
        refreshToken: string;
    }

    /**
     * Extiende la interfaz Session para incluir user con propiedades custom
     */
    interface Session {
        user: {
            id: string;
            email: string;
            nombre: string;
            rol: string;
            idEmpleado?: number;
        } & DefaultSession['user'];
        accessToken: string;
        error?: string;
    }
}

declare module 'next-auth/jwt' {
    /**
     * Extiende el JWT con tokens del backend
     */
    interface JWT {
        id: string;
        nombre: string;
        rol: string;
        idEmpleado?: number;
        accessToken: string;
        refreshToken: string;
        accessTokenExpires: number;
        error?: string;
    }
}
