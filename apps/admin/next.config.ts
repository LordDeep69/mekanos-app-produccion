import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimización para Vercel
  output: 'standalone',

  // Raíz explícita del monorepo para Turbopack en pnpm workspaces
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },

  // Optimización de imports de librerías pesadas / barriles en dev y build
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-query',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-underline',
      'zod',
    ],
  },

  // Configuración de imágenes
  images: {
    // ✅ Permite que las imágenes se abran directamente en el navegador sin forzar descarga (Content-Disposition: inline)
    contentDispositionType: 'inline',
    // ✅ Desactiva el proxy interno /_next/image para que la etiqueta <img> siempre tenga la URL directa nativa
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
    ],
    // Optimización de formatos
    formats: ['image/avif', 'image/webp'],
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Variables de entorno públicas
  env: {
    NEXT_PUBLIC_APP_NAME: 'MEKANOS Admin',
    NEXT_PUBLIC_APP_VERSION: '0.1.0',
  },

  // ✅ PROXY REWRITES: Permite que solicitudes al puerto 3001 bajo /api/... se redirijan
  // transparentemente al backend NestJS en el puerto 3000
  async rewrites() {
    return [
      {
        source: '/api/:path((?!auth).*)',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },

  // Verificación estricta de TypeScript habilitada (0 errores TS)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
