# 🚀 CONFIGURACIÓN COMPLETA RENDER - Mekanos API

## 📋 PASOS PARA DEPLOYMENT 100% FUNCIONAL

---

## PASO 1: Actualizar Build Command en Render

1. Ve a **Render Dashboard** → **mekanos-api**
2. Click en **Settings**
3. Scroll hasta **Build Command**
4. Reemplazar con:

```bash
chmod +x render-build.sh && ./render-build.sh
```

5. **Save Changes**

---

## PASO 2: Agregar Variables de Entorno

### 2.1 Core Configuration

En **Environment** tab, agregar:

```bash
NODE_ENV=production
PORT=10000
```

### 2.2 Database (Supabase)

```bash
DATABASE_URL=postgresql://postgres.nemrrkaobdlwehfnetxs:Mekanos2025%23sas@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

DIRECT_URL=postgresql://postgres.nemrrkaobdlwehfnetxs:Mekanos2025%23sas@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
```

### 2.3 JWT Authentication

```bash
JWT_SECRET=mekanos-jwt-secret-ultra-secure-2025-production-change-this-in-deployment

JWT_EXPIRATION=15m

JWT_REFRESH_SECRET=mekanos-refresh-secret-ultra-secure-2025-production-change-this

JWT_REFRESH_EXPIRATION=7d
```

### 2.4 CORS

```bash
CORS_ORIGIN=https://mekanos-admin.vercel.app,http://localhost:3001,http://localhost:3002
```

### 2.5 Cloudinary (Imágenes)

**Cuenta Plantas:**
```bash
CLOUDINARY_CLOUD_NAME_PLANTAS=dibw7aluj
CLOUDINARY_API_KEY_PLANTAS=643988218551617
CLOUDINARY_API_SECRET_PLANTAS=ipcTGt7Kf1NQmYp-ToZtXJX2zJc
```

**Cuenta Bombas:**
```bash
CLOUDINARY_CLOUD_NAME_BOMBAS=dahu8uycb
CLOUDINARY_API_KEY_BOMBAS=354875858461177
CLOUDINARY_API_SECRET_BOMBAS=vPE7i5V9h6y1dkYiqnCbkL1NoG0
```

### 2.6 Cloudflare R2 (PDFs)

```bash
R2_ENDPOINT=https://df62bcb5510c62b7ba5dedf3e065c566.r2.cloudflarestorage.com

R2_ACCESS_KEY_ID=0e6cbcc0d1350f4de86c5c8489adad32

R2_SECRET_ACCESS_KEY=4a637e26da1ad7f0028f6e81c1a45993f598d1b485c3b0ba47acef27c6c4462f

R2_BUCKET_NAME=mekanos-plantas-produccion

R2_PUBLIC_URL=https://pub-0252b7824c754d46a15fe3acf8d52450.r2.dev
```

### 2.7 Email (Gmail SMTP) ⚠️ IMPORTANTE

```bash
EMAIL_SMTP_HOST=smtp.gmail.com

EMAIL_SMTP_PORT=587

EMAIL_SMTP_SECURE=false

EMAIL_SMTP_USER=mekanossas4@gmail.com

EMAIL_SMTP_PASS=jvsd znpw hsfv jgmy

EMAIL_FROM=mekanossas4@gmail.com

EMAIL_FROM_NAME=MEKANOS S.A.S

EMAIL_FROM_ADDRESS=mekanossas4@gmail.com
```

**NOTA:** `EMAIL_SMTP_PASS` es una **App Password** de Gmail, NO la contraseña normal.

### 2.8 Puppeteer (Chrome para PDFs)

```bash
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
```

---

## PASO 3: Deploy

1. Click **Save Changes** (después de agregar todas las variables)
2. Click **Manual Deploy** → **Deploy latest commit**
3. Esperar ~10-15 minutos (primera vez con Chrome tarda más)

---

## PASO 4: Verificar Instalación

### 4.1 Health Check
```bash
curl https://mekanos-api.onrender.com/api/health
```

Debe retornar:
```json
{
  "status": "ok",
  "database": "connected",
  "environment": "production"
}
```

### 4.2 Verificar Chrome/Puppeteer

Revisar logs en Render, debe aparecer:
```
✅ Chrome instalado exitosamente
```

### 4.3 Verificar Email Service

Revisar logs, debe aparecer:
```
✅ Email service initialized successfully
```

**Si aparece timeout**, verificar que la App Password de Gmail sea correcta.

---

## 🔧 TROUBLESHOOTING

### Problema: Chrome no se instala

**Solución:**
1. Verificar que `render-build.sh` tenga permisos de ejecución
2. Revisar logs de build para errores específicos
3. Si falla, agregar variable:
   ```bash
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
   ```

### Problema: Email timeout persiste

**Causas posibles:**
1. **App Password incorrecta** - Regenerar en Google Account
2. **2FA no activado** - Gmail requiere 2FA para App Passwords
3. **Firewall de Render** - Poco probable pero posible

**Solución:**
1. Ir a https://myaccount.google.com/apppasswords
2. Crear nueva App Password para "Mail"
3. Copiar password (sin espacios)
4. Actualizar `EMAIL_SMTP_PASS` en Render
5. Redeploy

### Problema: Build falla en Prisma

**Solución:**
El script `render-build.sh` ya maneja esto. Si falla:
1. Verificar que `packages/database` existe
2. Verificar que `prisma/schema.prisma` existe
3. Revisar logs para error específico

---

## 📊 CHECKLIST DE VERIFICACIÓN

Después del deploy, verificar:

- [ ] ✅ Health check responde 200
- [ ] ✅ Login funciona (POST /api/auth/login)
- [ ] ✅ Swagger docs accesible (/api/docs)
- [ ] ✅ Logs muestran "Chrome instalado"
- [ ] ✅ Logs muestran "Email service initialized"
- [ ] ✅ No hay errores de Puppeteer en logs
- [ ] ✅ No hay timeout de email en logs

---

## 🎯 RESULTADO ESPERADO

Después de completar todos los pasos:

```
✅ Database: Connected
✅ Cloudinary: Configured (Plantas + Bombas)
✅ Cloudflare R2: Configured
✅ Email Service: Initialized
✅ Puppeteer/Chrome: Installed
✅ All endpoints: Operational
```

**Backend al 100% funcional** 🚀

---

## 📞 SOPORTE

Si algún paso falla:
1. Revisar logs en Render Dashboard
2. Verificar variables de entorno (typos comunes)
3. Verificar que commit `603b2d2` esté desplegado
4. Consultar `RENDER_DEPLOYMENT_TEST_REPORT.md` para tests

---

**Última actualización:** 21 Enero 2026  
**Commit:** `603b2d2`  
**Status:** Listo para deployment completo
