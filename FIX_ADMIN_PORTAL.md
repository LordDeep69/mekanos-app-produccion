# 🔧 FIX ADMIN PORTAL - Radix UI Module Not Found

## Problema
Next.js/Turbopack no detecta `@radix-ui/react-dropdown-menu` aunque está instalado en package.json.

## Solución

### Paso 1: Detener servidor Next.js
En la terminal donde está corriendo `pnpm dev`, presiona **Ctrl+C**

### Paso 2: Limpiar cache de pnpm
```bash
cd apps/admin
pnpm store prune
```

### Paso 3: Reinstalar dependencias
```bash
pnpm install --force
```

### Paso 4: Reiniciar servidor
```bash
pnpm dev
```

### Paso 5: Verificar
Abre http://localhost:3001/configuracion/usuarios

Debería cargar sin errores de módulo.

---

## Alternativa (si persiste el error)

Si después de los pasos anteriores sigue fallando:

```bash
# Detener servidor (Ctrl+C)
cd apps/admin

# Eliminar node_modules local
Remove-Item -Recurse -Force node_modules

# Reinstalar
pnpm install

# Reiniciar
pnpm dev
```

---

## Verificación de Conexión a Render

Una vez que el admin cargue correctamente:

1. Abrir DevTools (F12) → Network tab
2. Intentar login o navegar a cualquier página
3. Verificar que las requests van a: `https://mekanos-api.onrender.com/api/...`
4. Si ves error de CORS, agregar en Render:
   - Dashboard → mekanos-api → Environment
   - `CORS_ORIGIN` debe incluir: `http://localhost:3001`

---

**Última actualización:** 21 Enero 2026
