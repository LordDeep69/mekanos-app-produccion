import { z } from 'zod';

/**
 * Schema de validación para environment variables
 * Todas las variables requeridas deben estar presentes al iniciar la aplicación
 */
const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535)),

  // Database
  DATABASE_URL: z.string().url(),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().url().optional(),

  // Cloudinary - Plantas
  CLOUDINARY_CLOUD_NAME_PLANTAS: z.string().optional(),
  CLOUDINARY_API_KEY_PLANTAS: z.string().optional(),
  CLOUDINARY_API_SECRET_PLANTAS: z.string().optional(),
  CLOUDINARY_URL_PLANTAS: z.string().optional(),

  // Cloudinary - Bombas
  CLOUDINARY_CLOUD_NAME_BOMBAS: z.string().optional(),
  CLOUDINARY_API_KEY_BOMBAS: z.string().optional(),
  CLOUDINARY_API_SECRET_BOMBAS: z.string().optional(),
  CLOUDINARY_URL_BOMBAS: z.string().optional(),

  // Cloudflare R2 - Plantas
  R2_PLANTAS_ACCOUNT_ID: z.string().optional(),
  R2_PLANTAS_ACCESS_KEY_ID: z.string().optional(),
  R2_PLANTAS_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PLANTAS_BUCKET_NAME: z.string().optional(),
  R2_PLANTAS_ENDPOINT: z.string().url().optional(),

  // Cloudflare R2 - Bombas
  R2_BOMBAS_ACCOUNT_ID: z.string().optional(),
  R2_BOMBAS_ACCESS_KEY_ID: z.string().optional(),
  R2_BOMBAS_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BOMBAS_BUCKET_NAME: z.string().optional(),
  R2_BOMBAS_ENDPOINT: z.string().url().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valida las environment variables al iniciar la aplicación
 * Si falta alguna variable requerida, la aplicación terminará con error
 */
export function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return parsed;
  } catch (error) {
    console.error('❌ Invalid environment variables:');
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
    }
    console.error('\nPlease check your .env file and restart the application.');
    process.exit(1);
  }
}
