# ESTADO DEBUGGING BLOQUE 2 - equipos_motor/generador/bomba

## 📊 RESUMEN ESTADO ACTUAL

**Fecha:** 2025-11-19
**Fase:** Debugging ERROR 500 en POST /equipos-motor

### ✅ LO QUE FUNCIONA (100%)

- ✅ tipos_componente: POST + GET + GET_BY_ID
- ✅ catalogo_sistemas: POST + GET + GET_BY_ID
- ✅ equipos: POST + GET + GET_BY_ID (prerequisito de BLOQUE 2)

###  ❌ LO QUE FALLA

- ❌ tipos_equipo: ERROR 500 (pendiente investigación después de BLOQUE 2)
- ❌ equipos_motor: ERROR 500 persistente
- ❌ equipos_generador: No probado aún (probablemente mismo problema)
- ❌ equipos_bomba: No probado aún (probablemente mismo problema)

---

## 🔧 FIXES APLICADOS (en orden cronológico)

### 1. Corrección PK en Services

**Archivos modificados:**
- `equipos-motor/equipos-motor.service.ts`
- `equipos-generador/equipos-generador.service.ts`
- `equipos-bomba/equipos-bomba.service.ts`

**Cambio:** `id_equipo_motor` → `id_equipo` en:
- `findAll()` - orderBy
- `findOne()` - where
- `update()` - where
- `remove()` - where

**Razón:** Schema Prisma usa `id_equipo Int @id` como PK, no `id_equipo_motor`

### 2. Corrección año_fabricacion en Domain Interfaces

**Archivo modificado:**
- `equipos-motor/domain/equipos-motor.repository.ts`

**Cambio:** `año_fabricacion?: number` → `a_o_fabricacion?: number`

**Razón:** Prisma genera tipos con `a_o_fabricacion` (underscored) que mapea a columna DB `año_fabricacion`

**Ubicaciones:**
- `CrearEquipoMotorData` interface
- `ActualizarEquipoMotorData` interface

### 3. Mapeo Manual en Repository

**Archivo modificado:**
- `equipos-motor/infrastructure/persistence/prisma-equipos-motor.repository.ts`

**Cambio:** De `create({ data })` a mapeo campo por campo:

```typescript
await this.prisma.equipos_motor.create({
  data: {
    id_equipo: data.id_equipo,
    tipo_motor: data.tipo_motor as any,
    marca_motor: data.marca_motor,
    // ... resto de campos mapeados explícitamente
    a_o_fabricacion: data.a_o_fabricacion, // <- mapeo explícito
    creado_por: data.creado_por || 1,
  },
});
```

**Razón:** Prisma no infiere correctamente tipos con enums cuando se pasa objeto completo. Pattern usado por tipos_componente (que SÍ funciona).

### 4. Versión Simplificada para Debug

**Última versión del repository** (líneas 40-68):
```typescript
const result = await this.prisma.equipos_motor.create({
  data: {
    id_equipo: data.id_equipo,
    tipo_motor: data.tipo_motor as any,
    marca_motor: data.marca_motor,
    creado_por: data.creado_por || 1,
  },
});
```

**Logging agregado:**
- `console.log('=== CREAR EQUIPO_MOTOR ===')`
- `console.log('Data recibida:', JSON.stringify(data, null, 2))`
- `console.error('❌ ERROR en Prisma create:', error)`
- `console.error('Tipo de error:', error.constructor.name)`
- `console.error('Mensaje:', (error as any).message)`
- `console.error('Meta:', JSON.stringify((error as any).meta, null, 2))`

---

## 🧪 PRUEBAS EJECUTADAS

### Test 1: POST con campos mínimos (primera versión)
```powershell
$body = @{ id_equipo = 15; tipo_motor = "COMBUSTION"; marca_motor = "CATERPILLAR" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/equipos-motor" -Method POST -Body $body
```
**Resultado:** ERROR 500

### Test 2: POST con creado_por explícito
```powershell
$body = @{ id_equipo = 15; tipo_motor = "COMBUSTION"; marca_motor = "CATERPILLAR"; creado_por = 1 }
```
**Resultado:** ERROR 400 - "property creado_por should not exist" (correcto - DTO no debe incluirlo)

### Test 3: POST después de mapeo manual
**Resultado:** ERROR 500 (persiste)

### Test 4: POST con versión simplificada (solo 3 campos)
**Resultado:** ERROR 500 (persiste)

---

## 🔍 HIPÓTESIS DE CAUSA RAÍZ

### Hipótesis 1: Hot-reload no funciona ✅ PROBABLE
- `typeCheck: false` en nest-cli.json puede impedir recompilación
- Cambios en repository no se reflejan en servidor corriendo
- **Solución:** Reiniciar servidor manualmente (Ctrl+C → `npm run start:dev`)

### Hipótesis 2: Problema con creado_por ✅ POSIBLE
- Controller agrega `creado_por: req.user?.userId || 1`
- Con `@Public()`, `req.user` es undefined
- `undefined || 1` debería dar 1, pero puede fallar en el command
- **Verificación:** Logs del servidor mostrarán valor recibido

### Hipótesis 3: Enum no se convierte correctamente ⚠️ MENOS PROBABLE
- Envío "COMBUSTION" (string) pero Prisma espera enum
- Sin embargo, uso `as any` para bypassear type checking
- **Verificación:** Error de Prisma mencionaría "invalid enum value"

### Hipótesis 4: Constraint FK falla ❌ DESCARTADA
- Verifiqué que equipo ID=15 existe
- Repository valida existencia antes de crear
- Si fallara FK, error sería más específico

---

## 📋 PRÓXIMOS PASOS

### PASO 1: OBTENER ERROR EXACTO DEL SERVIDOR ⭐ CRÍTICO

**USUARIO DEBE HACER:**
1. Ir a la ventana donde corre el servidor (`npm run start:dev`)
2. Ejecutar test: `.\test-bloque2-CORRECTO.ps1` O comando manual
3. Copiar TODO el output que aparece en consola del servidor, especialmente:
   - "=== CREAR EQUIPO_MOTOR ==="
   - "Data recibida: ..."
   - "❌ ERROR en Prisma create: ..."
   - Stack trace completo

**Este error dirá EXACTAMENTE qué está fallando.**

### PASO 2: REINICIAR SERVIDOR (si hot-reload falla)

```powershell
# En la ventana del servidor:
# Presionar Ctrl+C para detener
cd monorepo
npm run start:dev
```

Esperar a que compile completamente, luego ejecutar test de nuevo.

### PASO 3: APLICAR FIX DEFINITIVO

Dependiendo del error exacto:

**Si es problema de creado_por:**
```typescript
// Opción A: Default en repository
creado_por: data.creado_por ?? 1

// Opción B: Default en domain interface
creado_por?: number; // hacer opcional
```

**Si es problema de enum:**
```typescript
// Importar enum de Prisma
import { tipo_motor_enum } from '@prisma/client';

// Convertir explícitamente
tipo_motor: data.tipo_motor as tipo_motor_enum
```

**Si es otro constraint:**
- Revisar schema Prisma para constraints adicionales
- Verificar FK a usuarios tabla

### PASO 4: REPLICAR FIX A GENERADOR Y BOMBA

Una vez equipos_motor funcione:
1. Aplicar mismo pattern a equipos_generador
2. Aplicar mismo pattern a equipos_bomba
3. Ejecutar `test-bloque2-CORRECTO.ps1` completo

### PASO 5: INVESTIGAR tipos_equipo

Aplicar fix similar a tipos_equipo (probablemente mismo problema de mapeo)

---

## 📝 ARCHIVOS CLAVE

### Controllers
- `apps/api/src/equipos-motor/equipos-motor.controller.ts` - Agrega creado_por, usa CQRS
- `apps/api/src/equipos-generador/equipos-generador.controller.ts`
- `apps/api/src/equipos-bomba/equipos-bomba.controller.ts`

### Commands/Handlers
- `apps/api/src/equipos-motor/application/commands/crear-equipo-motor.command.ts`

### Domain
- `apps/api/src/equipos-motor/domain/equipos-motor.repository.ts` - Interface con a_o_fabricacion

### Repository (Implementación)
- `apps/api/src/equipos-motor/infrastructure/persistence/prisma-equipos-motor.repository.ts` - CON LOGGING

### DTOs
- `apps/api/src/equipos-motor/dto/create-equipo-motor.dto.ts` - NO incluye creado_por

### Services (no usado por CQRS, pero corregido)
- `apps/api/src/equipos-motor/equipos-motor.service.ts`

### Schema
- `packages/database/prisma/schema.prisma`:
  - Línea 559: `model equipos_motor`
  - Línea 515: `model equipos_generador`
  - Línea 611: `model equipos_bomba`

---

## 🎯 OBJETIVO FINAL

**BLOQUE 1:** 100% (3/3) - Falta solo tipos_equipo
**BLOQUE 2:** 100% (3/3) - Falta todo, depende de resolver ERROR 500
**TOTAL:** 100% (6/6 tablas + equipos prerequisito)

Una vez logrado:
1. ✅ Documentar en ETAPA_CRUD_69_TABLAS.MD
2. ✅ Actualizar REPORTE_PRUEBAS_FUNCIONALES_COMPLETO.md
3. ✅ Proceder a BLOQUE 3

---

## ⚡ COMANDO RÁPIDO PARA TESTING

```powershell
# Test simple equipos_motor
$body = @{ id_equipo = 15; tipo_motor = "COMBUSTION"; marca_motor = "CAT" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/equipos-motor" -Method POST -Body $body -Headers @{"Content-Type"="application/json"}

# Ver registros
Invoke-RestMethod -Uri "http://localhost:3000/api/equipos-motor" -Method GET
```

---

## 💡 LECCIONES APRENDIDAS

1. **Prisma client types != Domain types:** Siempre verificar nombres de campos generados por Prisma
2. **Mapeo explícito es mejor:** No usar `create({ data })` con objetos complejos
3. **Enums necesitan `as any`:** TypeScript no infiere correctamente tipos de enum de Prisma
4. **Hot-reload puede fallar:** Con `typeCheck: false`, reiniciar servidor manualmente
5. **DTOs ≠ Repository data:** Controller transforma DTO → Data con campos adicionales (creado_por)
6. **Logging es esencial:** Sin acceso directo a logs, console.log/error son vitales

---

**ESTADO:** ⏸️ BLOQUEADO esperando logs del servidor para identificar causa exacta del ERROR 500

**PRÓXIMA ACCIÓN:** Usuario debe copiar output completo de la consola del servidor después de ejecutar POST /equipos-motor
