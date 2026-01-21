# Variables de Entorno para Render.com

## 📋 INSTRUCCIONES

Copiar estas variables en Render Dashboard → mekanos-api → Environment

---

## 🔐 CORE CONFIGURATION

```bash
NODE_ENV=production
PORT=10000
```

---

## 🗄️ DATABASE (Supabase)

```bash
DATABASE_URL=postgresql://postgres.nemrrkaobdlwehfnetxs:Mekanos2025%23sas@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.nemrrkaobdlwehfnetxs:Mekanos2025%23sas@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
```

---

## 🔑 JWT AUTHENTICATION

```bash
JWT_SECRET=mekanos-jwt-secret-ultra-secure-2025-production-change-this-in-deployment
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=mekanos-refresh-secret-ultra-secure-2025-production-change-this
JWT_REFRESH_EXPIRATION=7d
```

---

## 🌐 CORS

```bash
CORS_ORIGIN=https://mekanos-admin.vercel.app,http://localhost:3001,http://localhost:3002
```

---

## 📸 CLOUDINARY (Imágenes)

### Cuenta Plantas

```bash
CLOUDINARY_CLOUD_NAME_PLANTAS=dibw7aluj
CLOUDINARY_API_KEY_PLANTAS=643988218551617
CLOUDINARY_API_SECRET_PLANTAS=ipcTGt7Kf1NQmYp-ToZtXJX2zJc
```

### Cuenta Bombas

```bash
CLOUDINARY_CLOUD_NAME_BOMBAS=dahu8uycb
CLOUDINARY_API_KEY_BOMBAS=354875858461177
CLOUDINARY_API_SECRET_BOMBAS=vPE7i5V9h6y1dkYiqnCbkL1NoG0
```

---

## 📄 CLOUDFLARE R2 (PDFs)

```bash
R2_ENDPOINT=https://df62bcb5510c62b7ba5dedf3e065c566.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=0e6cbcc0d1350f4de86c5c8489adad32
R2_SECRET_ACCESS_KEY=4a637e26da1ad7f0028f6e81c1a45993f598d1b485c3b0ba47acef27c6c4462f
R2_BUCKET_NAME=mekanos-plantas-produccion
R2_PUBLIC_URL=https://pub-0252b7824c754d46a15fe3acf8d52450.r2.dev
```

---

## 📧 EMAIL (Gmail SMTP)

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

---

## 🌐 PUPPETEER (Chrome)

```bash
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/opt/render/.cache/puppeteer/chrome/linux-142.0.7444.175/chrome-linux64/chrome
```

---

## 📝 NOTAS IMPORTANTES

1. **Email SMTP Password**: Es una "App Password" de Gmail, no la contraseña normal
2. **R2 Public URL**: Ya configurada correctamente para acceso público
3. **Puppeteer Path**: Se configura automáticamente después del build
4. **CORS**: Agregar URLs del Admin Portal cuando esté desplegado

---

## 🔄 ACTUALIZAR EN RENDER

1. Dashboard → mekanos-api
2. Environment tab
3. Add Environment Variable (cada una)
4. Save Changes
5. Manual Deploy

**IMPORTANTE**: Después de agregar variables, hacer Manual Deploy para que tomen efecto.
