# 🌐 CONFIGURACIÓN DE ENTORNOS - Mekanos

## 📋 RESUMEN

**Backend:** https://mekanos-api.onrender.com  
**Admin Portal:** Configurado para apuntar a Render  
**Mobile App:** Configurado para apuntar a Render en RELEASE mode

---

## 🚀 BACKEND - Render.com

### URL Producción

```
https://mekanos-api.onrender.com/api
```

### Endpoints Principales

- **Health:** https://mekanos-api.onrender.com/api/health
- **Swagger:** https://mekanos-api.onrender.com/api/docs
- **Login:** https://mekanos-api.onrender.com/api/auth/login

### Características

- ✅ Chrome/Puppeteer instalado (PDFs)
- ✅ Email SMTP configurado
- ✅ Cloudinary (Plantas + Bombas)
- ✅ Cloudflare R2 (PDFs públicos)
- ✅ Base de datos Supabase
- ⚠️ Sleep después de 15 min inactividad (free tier)

### Credenciales de Prueba

```json
{
  "email": "admin@mekanos.com",
  "password": "Admin123!"
}
```

---

## 💻 ADMIN PORTAL - Next.js

### Configuración Actual

**Archivo:** `apps/admin/.env.local`

```bash
# 🚀 PRODUCCIÓN (Render)
NEXT_PUBLIC_API_URL=https://mekanos-api.onrender.com/api
```

### Cambiar a Desarrollo Local

Para usar backend local (localhost:3000):

1. Editar `apps/admin/.env.local`
2. Comentar línea de producción
3. Descomentar línea de desarrollo:

```bash
# 🔧 DESARROLLO (Localhost)
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

4. Reiniciar servidor Next.js:

```bash
cd apps/admin
pnpm dev
```

### Ejecutar Admin Portal

```bash
cd apps/admin
pnpm dev
```

Abre: http://localhost:3001

---

## 📱 MOBILE APP - Flutter

### Configuración Actual

**Archivo:** `apps/mobile/lib/core/config/environment.dart`

```dart
// 🚀 PRODUCCIÓN: Render.com
static const String _productionApiUrl = 'https://mekanos-api.onrender.com/api';
```

### Comportamiento Automático

| Modo                 | URL Backend                               |
| -------------------- | ----------------------------------------- |
| **DEBUG** (emulador) | `http://10.0.2.2:3000/api` (localhost)    |
| **DEBUG** (web)      | `http://localhost:3000/api`               |
| **RELEASE** (APK)    | `https://mekanos-api.onrender.com/api` ✅ |

### Ejecutar en Desarrollo (usa localhost)

```bash
cd apps/mobile
flutter run
```

### Generar APK Producción (usa Render)

```bash
cd apps/mobile
flutter build apk --release
```

El APK generado apuntará automáticamente a Render.

### Cambiar a Localhost en Release (opcional)

Si necesitas que RELEASE también use localhost:

1. Editar `apps/mobile/lib/core/config/environment.dart`
2. Cambiar línea 26-27:

```dart
// Forzar localhost incluso en RELEASE
if (kReleaseMode) {
  return 'http://10.0.2.2:$_backendPort/api'; // o tu IP local
}
```

---

## 🔄 FLUJO DE TRABAJO RECOMENDADO

### Desarrollo Local

1. **Backend:** `cd apps/api && pnpm dev` (localhost:3000)
2. **Admin:** Usar localhost en `.env.local`
3. **Mobile:** Modo DEBUG (automático)

### Pruebas Pre-Producción

1. **Backend:** Render (ya desplegado)
2. **Admin:** Apuntar a Render
3. **Mobile:** Generar APK release

### Producción

1. **Backend:** Render (siempre activo)
2. **Admin:** Deploy a Vercel/Netlify con env vars de Render
3. **Mobile:** APK release distribuido

---

## 🧪 VERIFICAR CONEXIÓN

### Desde Admin Portal

1. Abrir http://localhost:3001
2. Intentar login
3. Revisar Network tab (debería llamar a Render)

### Desde Mobile App

1. Ejecutar `flutter run --release` (o instalar APK)
2. Intentar login
3. Revisar logs:

```bash
flutter logs
```

Debe mostrar:

```
🌐 API Base URL: https://mekanos-api.onrender.com/api
```

---

## ⚠️ NOTAS IMPORTANTES

### Sleep Mode de Render (Free Tier)

- El backend se "duerme" después de 15 min sin requests
- Primera request después del sleep tarda ~30-50 segundos
- Requests subsecuentes son normales

**Solución para Admin/Mobile:**

- Mostrar loading mientras despierta
- Timeout configurado en 320s (suficiente)

### CORS

Si hay errores de CORS, verificar que la URL del Admin esté en:

```
Render Dashboard → Environment → CORS_ORIGIN
```

Debe incluir:

```
https://tu-admin-vercel.app,http://localhost:3001
```

---

## 📊 CHECKLIST DE VERIFICACIÓN

Después de cambiar configuración:

- [ ] Admin Portal se conecta a Render
- [ ] Mobile App (release) se conecta a Render
- [ ] Login funciona desde ambos
- [ ] Sync download funciona
- [ ] No hay errores de CORS
- [ ] Timeout suficiente para sleep mode

---

## 🆘 TROUBLESHOOTING

### Error: "Network Error" en Admin

- Verificar `NEXT_PUBLIC_API_URL` en `.env.local`
- Reiniciar servidor Next.js
- Verificar que Render esté activo (hacer request manual)

### Error: "Connection refused" en Mobile

- Verificar que estás en RELEASE mode
- Verificar URL en `environment.dart`
- Hot restart completo: `flutter run --release`

### Backend no responde

- Render está en sleep mode (esperar 30-50s)
- Verificar en Render Dashboard que el deploy fue exitoso
- Revisar logs en Render

---

**Última actualización:** 21 Enero 2026  
**Backend Commit:** `8329b49`  
**Status:** ✅ Configuración completa y funcional
