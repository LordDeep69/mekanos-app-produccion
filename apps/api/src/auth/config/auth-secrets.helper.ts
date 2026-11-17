import { ConfigService } from '@nestjs/config';

const INSECURE_FALLBACK_SECRETS = new Set([
  'fallback-secret',
  'secret',
  'changeme',
  'mekanos-jwt-secret-ultra-secure-2025-production-change-this-in-deployment',
]);

/**
 * Resuelve un secreto criptográfico obligatorio desde ConfigService o env.
 * Falla de forma explícita (Zero-Trust fail-closed) si falta o usa fallbacks conocidos.
 */
export function resolveRequiredAuthSecret(
  configService: ConfigService,
  envKey: 'JWT_SECRET' | 'JWT_REFRESH_SECRET',
): string {
  const raw = configService.get<string>(envKey) ?? process.env[envKey];
  const secret = typeof raw === 'string' ? raw.trim() : '';

  if (!secret) {
    throw new Error(
      `[SECURITY FATAL] La variable de entorno ${envKey} es obligatoria y no puede estar vacía.`,
    );
  }

  if (INSECURE_FALLBACK_SECRETS.has(secret)) {
    throw new Error(
      `[SECURITY FATAL] La variable de entorno ${envKey} contiene un valor por defecto inseguro.`,
    );
  }

  return secret;
}
