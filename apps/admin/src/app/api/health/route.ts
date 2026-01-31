import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint para Vercel
 * GET /api/health
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'mekanos-admin',
        version: process.env.npm_package_version || '0.1.0',
        environment: process.env.NODE_ENV,
    });
}
