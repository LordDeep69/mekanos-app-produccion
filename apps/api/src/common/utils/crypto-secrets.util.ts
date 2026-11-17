import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const CIPHER_PREFIX = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

const INSECURE_MASTER_SECRETS = new Set([
  'fallback-secret',
  'secret',
  'changeme',
  'mekanos-jwt-secret-ultra-secure-2025-production-change-this-in-deployment',
]);

function deriveEncryptionKey(overrideSecret?: string): Buffer {
  const raw = (
    overrideSecret ??
    process.env.CONFIG_ENCRYPTION_KEY ??
    process.env.JWT_SECRET ??
    ''
  ).trim();

  if (!raw || raw.length < 16 || INSECURE_MASTER_SECRETS.has(raw.toLowerCase())) {
    throw new Error(
      '[CryptoSecretsUtil] Clave maestra CONFIG_ENCRYPTION_KEY / JWT_SECRET ausente, insegura o demasiado corta (< 16 caracteres).',
    );
  }

  return createHash('sha256').update(raw, 'utf8').digest();
}

/**
 * Cifra un secreto en texto plano usando AES-256-GCM con IV aleatorio por operación.
 */
export function encryptSecret(plaintext: string, overrideSecret?: string): string {
  if (!plaintext) {
    throw new Error('[CryptoSecretsUtil] No se puede cifrar un secreto vacío.');
  }

  const key = deriveEncryptionKey(overrideSecret);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${CIPHER_PREFIX}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Descifra un secreto previamente cifrado con encryptSecret().
 */
export function decryptSecret(payload: string, overrideSecret?: string): string {
  if (!payload || !payload.startsWith(`${CIPHER_PREFIX}:`)) {
    throw new Error('[CryptoSecretsUtil] Formato de secreto cifrado inválido.');
  }

  const parts = payload.split(':');
  if (parts.length !== 4) {
    throw new Error('[CryptoSecretsUtil] Payload cifrado corrupto o incompleto.');
  }

  const [, ivB64, tagB64, cipherB64] = parts;
  const key = deriveEncryptionKey(overrideSecret);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherB64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export function isEncryptedSecret(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(`${CIPHER_PREFIX}:`) && value.split(':').length === 4;
}
