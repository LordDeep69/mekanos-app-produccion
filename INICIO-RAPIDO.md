# 🚀 Inicio Rápido - MEKANOS Backend Local + Ngrok

## ✅ Solución al Problema de Reinicio

**Problema:** Cada vez que la PC se apaga, Ngrok genera una URL diferente y hay que reconfigurar admin y mobile.

**Solución:** Usar el **dominio estático reservado** de Ngrok que siempre es el mismo.

---

## 📋 Configuración Inicial (Solo una vez)

### 1. Configurar Authtoken de Ngrok

```powershell
ngrok config add-authtoken 39B5AC971r0tlCX6X96UbIdRF8B_Fzhk1stwUhCNAwQHsJeZ
```

✅ Esto guarda el token en `C:\Users\Usuario\AppData\Local\ngrok\ngrok.yml`

### 2. Dominio Estático Reservado

Tu cuenta de Ngrok tiene un dominio estático reservado:

```
https://hereditarily-unmutualized-joey.ngrok-free.dev
```

**Este dominio NUNCA cambia**, incluso si reinicias la PC o Ngrok.

---

## 🎯 Inicio Rápido (Después de Reiniciar PC)

### Opción 1: Script Automático (Recomendado)

Ejecuta el script que inicia todo automáticamente:

```powershell
.\start-backend-ngrok.ps1
```

Este script:
1. ✅ Inicia el backend NestJS en puerto 3000
2. ✅ Espera 10 segundos
3. ✅ Inicia Ngrok con el dominio estático
4. ✅ Abre 2 ventanas de PowerShell (NO las cierres)

### Opción 2: Manual

**Terminal 1 - Backend:**
```powershell
cd "C:\Users\Usuario\Downloads\mekanosApp\BASE DE DATOS\MEKANOS_DB\REFACTORIZATION\monorepo"
pnpm --filter @mekanos/api start:dev
```

**Terminal 2 - Ngrok:**
```powershell
ngrok http --url=hereditarily-unmutualized-joey.ngrok-free.dev 3000
```

---

## 🔗 URLs Configuradas

### Portal Admin
- **Archivo:** `apps/admin/.env.local`
- **Variable:** `NEXT_PUBLIC_API_URL=https://hereditarily-unmutualized-joey.ngrok-free.dev/api`
- ✅ Ya configurado - NO necesitas cambiar nada

### Mobile App
- **Archivo:** `apps/mobile/.env`
- **Variable:** `EXPO_PUBLIC_API_URL=https://hereditarily-unmutualized-joey.ngrok-free.dev/api`
- ✅ Ya configurado - NO necesitas cambiar nada

---

## ✅ Verificación

### 1. Verificar Backend Local
```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/health -UseBasicParsing
```

Debe retornar: `{"status":"ok",...}`

### 2. Verificar Ngrok Público
```powershell
Invoke-WebRequest -Uri https://hereditarily-unmutualized-joey.ngrok-free.dev/api/health -UseBasicParsing
```

Debe retornar el mismo JSON.

### 3. Verificar Portal Admin
1. Abre: https://mekanos-admin-portal.vercel.app
2. Login: `admin@mekanos.com` / `Admin123!`
3. Navega a una orden
4. Debe cargar los datos correctamente

---

## 🎓 Explicación Técnica

### ¿Por qué el dominio estático funciona?

Ngrok tiene 2 tipos de URLs:

1. **URL Temporal (gratis):** `https://abc123.ngrok-free.app`
   - ❌ Cambia cada vez que reinicias Ngrok
   - ❌ Hay que reconfigurar admin y mobile

2. **URL Estática (plan pagado):** `https://hereditarily-unmutualized-joey.ngrok-free.dev`
   - ✅ NUNCA cambia
   - ✅ Configurar una sola vez
   - ✅ Tu cuenta tiene este dominio reservado

### ¿Qué hace el authtoken?

El authtoken vincula tu instalación de Ngrok con tu cuenta, permitiendo:
- ✅ Usar el dominio estático reservado
- ✅ Sesiones más largas (sin límite de 2 horas)
- ✅ Más túneles simultáneos

---

## 🆘 Solución de Problemas

### Error: "endpoint is already online"

**Causa:** Ya hay un Ngrok corriendo con ese dominio.

**Solución:**
```powershell
# Buscar proceso de ngrok
Get-Process ngrok

# Matar todos los procesos ngrok
Get-Process ngrok | Stop-Process -Force

# Reiniciar
ngrok http --url=hereditarily-unmutualized-joey.ngrok-free.dev 3000
```

### Backend no responde

**Verificar que esté corriendo:**
```powershell
Get-Process node
```

**Reiniciar backend:**
```powershell
cd "C:\Users\Usuario\Downloads\mekanosApp\BASE DE DATOS\MEKANOS_DB\REFACTORIZATION\monorepo"
pnpm --filter @mekanos/api start:dev
```

### Portal Admin no carga datos

1. ✅ Verificar que backend local esté corriendo (puerto 3000)
2. ✅ Verificar que Ngrok esté corriendo con el dominio estático
3. ✅ Verificar que `apps/admin/.env.local` tenga la URL correcta
4. ✅ Limpiar caché del navegador (Ctrl+Shift+R)

---

## 📝 Notas Importantes

1. **NO cierres las ventanas de PowerShell** donde corren el backend y Ngrok
2. **El dominio estático es permanente** - no necesitas reconfigurarlo
3. **El authtoken se guarda automáticamente** - solo configúralo una vez
4. **Si cambias de PC**, necesitas volver a configurar el authtoken

---

## 🔄 Migración a Railway (Futuro)

Cuando migres a Railway:
1. Cambiar `NEXT_PUBLIC_API_URL` en Vercel a la URL de Railway
2. Cambiar `EXPO_PUBLIC_API_URL` en mobile a la URL de Railway
3. Ya no necesitarás Ngrok
4. El código ya está preparado (header `ngrok-skip-browser-warning` se ignora en Railway)

---

**Última actualización:** 04-Feb-2026
