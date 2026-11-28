/**
 * Sanitizador seguro de payloads HTTP para logging en stdout (Fase 0).
 *
 * Protege contra:
 * 1. Fuga de credenciales, tokens JWT/FCM y llaves privadas Firebase.
 * 2. Volcado masivo de imágenes/firmas en Base64 crudo (con o sin prefijo `data:image/`)
 *    que bloqueaba el event loop y saturaba stdout durante finalizaciones de OS.
 * 3. Arrays masivos o strings de varios megabytes.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'contrasena',
  'contraseña',
  'newpassword',
  'new_password',
  'token',
  'access_token',
  'refresh_token',
  'fcm_token',
  'fcmtoken',
  'secret',
  'authorization',
  'private_key',
  'privatekey',
  'firebase_private_key',
  'api_secret',
  'apisecret',
]);

const MEDIA_BASE64_KEYS = new Set([
  'base64',
  'firma_base64',
  'firmabase64',
  'imagen_base64',
  'imagenbase64',
  'image_base64',
  'imagebase64',
  'file_base64',
  'filebase64',
  'archivo_base64',
  'archivobase64',
  'pdf_base64',
  'pdfbase64',
  'dataurl',
  'data_url',
]);

const RAW_BASE64_REGEX = /^[A-Za-z0-9+/=_-]+$/;
const MAX_ARRAY_LOG_ITEMS = 20;
const MAX_STRING_LOG_LENGTH = 2000;
const MAX_DEPTH = 8;

function sanitizeStringValue(keyLower: string, value: string): string {
  if (SENSITIVE_KEYS.has(keyLower)) {
    return '********';
  }

  if (MEDIA_BASE64_KEYS.has(keyLower) && value.length > 64) {
    return `[REDACTED_MEDIA_BASE64 len=${value.length}]`;
  }

  if (
    value.length > 64 &&
    (value.startsWith('data:image/') ||
      value.startsWith('data:application/pdf') ||
      value.startsWith('data:application/octet-stream'))
  ) {
    return `${value.substring(0, 32)}... [REDACTED_DATA_URI len=${value.length}]`;
  }

  if (value.length > 512) {
    const compact = value.replace(/\s+/g, '');
    if (compact.length > 512 && RAW_BASE64_REGEX.test(compact)) {
      return `[REDACTED_RAW_BASE64 len=${value.length}]`;
    }
  }

  if (value.length > MAX_STRING_LOG_LENGTH) {
    return `${value.substring(0, 200)}... [TRUNCATED len=${value.length}]`;
  }

  return value;
}

export function sanitizeLogPayload(data: unknown, depth = 0, seen?: WeakSet<object>): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return sanitizeStringValue('', data);
  if (typeof data !== 'object') return data;

  if (depth >= MAX_DEPTH) {
    return '[MAX_DEPTH_REACHED]';
  }

  const visited = seen ?? new WeakSet<object>();
  if (visited.has(data as object)) {
    return '[CIRCULAR_REF]';
  }
  visited.add(data as object);

  if (Array.isArray(data)) {
    const slice = data
      .slice(0, MAX_ARRAY_LOG_ITEMS)
      .map((item) => sanitizeLogPayload(item, depth + 1, visited));
    if (data.length > MAX_ARRAY_LOG_ITEMS) {
      slice.push(`... (+${data.length - MAX_ARRAY_LOG_ITEMS} items omitted)`);
    }
    return slice;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const keyLower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(keyLower)) {
      sanitized[key] = '********';
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeStringValue(keyLower, value);
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeLogPayload(value, depth + 1, visited);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
