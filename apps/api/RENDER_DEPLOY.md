# Deploy Mekanos API to Render.com (FREE)

## ¿Por qué Render?
- ✅ **750 horas gratis/mes** (suficiente para 1 servicio 24/7)
- ✅ **NO requiere tarjeta de crédito**
- ✅ Auto-deploy desde GitHub
- ✅ HTTPS automático
- ⚠️ Sleep después de 15 min inactividad (se despierta con request)

## Paso 1: Crear Cuenta en Render

1. Ir a [render.com](https://render.com)
2. Click "Get Started for Free"
3. **Registrarse con GitHub** (lorddeep3@gmail.com)
4. Autorizar acceso al repositorio

## Paso 2: Crear Web Service

1. En Dashboard, click **"New +"** → **"Web Service"**
2. Conectar repositorio: `LordDeep69/mekanos-app-produccion`
3. Configurar:

| Campo | Valor |
|-------|-------|
| **Name** | `mekanos-api` |
| **Region** | Oregon (US West) |
| **Branch** | `fix/admin-order-creation-and-detail-sync` |
| **Root Directory** | `apps/api` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start:prod` |
| **Plan** | Free |

## Paso 3: Variables de Entorno

En la sección "Environment", agregar estas variables:

### Requeridas
```
NODE_ENV=production
PORT=10000

# Database (Supabase)
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# JWT
JWT_SECRET=tu-secret-seguro-min-32-chars
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=otro-secret-seguro
JWT_REFRESH_EXPIRATION=7d

# CORS - URLs del Admin Portal
CORS_ORIGIN=https://tu-admin-portal.vercel.app,http://localhost:3002
```

### Cloudinary (Imágenes)
```
CLOUDINARY_CLOUD_NAME_PLANTAS=dxxxxxx
CLOUDINARY_API_KEY_PLANTAS=123456789
CLOUDINARY_API_SECRET_PLANTAS=abc123...
CLOUDINARY_CLOUD_NAME_BOMBAS=dxxxxxx
CLOUDINARY_API_KEY_BOMBAS=123456789
CLOUDINARY_API_SECRET_BOMBAS=abc123...
```

### Cloudflare R2 (PDFs)
```
R2_PLANTAS_ACCOUNT_ID=xxxxx
R2_PLANTAS_ACCESS_KEY_ID=xxxxx
R2_PLANTAS_SECRET_ACCESS_KEY=xxxxx
R2_PLANTAS_BUCKET_NAME=mekanos-plantas-produccion
R2_PUBLIC_URL=https://pub-0252b7824c754d46a15fe3acf8d52450.r2.dev
```

### Email
```
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=mekanossas4@gmail.com
EMAIL_SMTP_PASS=tu-app-password
EMAIL_FROM=mekanossas4@gmail.com
```

## Paso 4: Deploy

1. Click **"Create Web Service"**
2. Esperar build (~5-10 minutos primera vez)
3. URL generada: `https://mekanos-api.onrender.com`

## Paso 5: Verificar

- **Health Check**: `https://mekanos-api.onrender.com/api/health`
- **Swagger Docs**: `https://mekanos-api.onrender.com/api/docs`

## Notas Importantes

### Sleep Mode (Free Tier)
El servicio se "duerme" después de 15 min sin requests. El primer request después tarda ~30 segundos. Esto es normal en free tier.

**Solución para mantenerlo despierto (opcional)**:
- Usar [UptimeRobot](https://uptimerobot.com) (gratis) para hacer ping cada 5 min
- O aceptar el delay inicial

### Límites Free Tier
- 750 horas/mes (suficiente para 1 servicio 24/7)
- 512 MB RAM
- Sin límite de requests

### Actualizar Variables
Si cambias variables de entorno, el servicio se reinicia automáticamente.

## Troubleshooting

### Build falla con "workspace:*"
El monorepo usa pnpm workspaces. Render puede no detectarlo bien.
Solución: Cambiar temporalmente las dependencias workspace a rutas relativas o publicar paquetes internos.

### Puppeteer no funciona
Render incluye Chromium en el build. Si hay problemas:
```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## Comandos Útiles en Local

```bash
# Probar build de producción
npm run build
npm run start:prod

# Ver logs en Render
# Dashboard → Tu servicio → Logs
```

---

**Última actualización**: Enero 2026
**Repositorio**: github.com/LordDeep69/mekanos-app-produccion
