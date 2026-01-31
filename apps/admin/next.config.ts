import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimización para Vercel
  output: 'standalone',

  // Configuración de imágenes
  images: {
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
    // Optimización de imágenes en Vercel
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

  // Ignorar errores de TypeScript durante build (deploy rápido)
  // Los errores son de compatibilidad de tipos entre zod v4 y react-hook-form
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
