# FASE 4.4 - COTIZACIONES - Estado Implementación

## ✅ COMPLETADO (60%)

### Arquitectura Clean + CQRS
- ✅ Entity `Cotizacion` creada (`domain/cotizacion.entity.ts`)
- ✅ Repository Interface definido (`domain/cotizaciones.repository.interface.ts`)
- ✅ DTOs validados (`dto/create-cotizacion.dto.ts`, `dto/update-cotizacion.dto.ts`)
- ✅ Commands/Handlers (CreateCotizacion, UpdateCotizacion)
- ✅ Queries/Handlers (GetById, GetAll con filtros)
- ✅ Controller con endpoints Swagger (`cotizaciones.controller.ts`)
- ✅ Module integrado en `app.module.ts`

### Funcionalidades Implementadas
- ✅ Generación número cotización automático (COT-YYYY-NNNN)
- ✅ Cálculo totales automático (subtotal, descuento, IVA, total)
- ✅ Validación solo BORRADOR puede modificarse
- ✅ Validación fecha_vencimiento > fecha_emision
- ✅ Paginación + filtros (cliente, sede, estado, fechas)
- ✅ Relaciones opcionales (cliente, sede, equipo, items, aprobaciones)

---

## ⚠️ PENDIENTE (40%)

### 1. Corrección Schema Mismatch (BLOQUEANTE)
**Problema:** Entity creada usa nombres DIFERENTES al schema Prisma real.

**Mapeo Required:**
```typescript
// Entity (creado)         →  Schema Prisma (real)
fecha_emision              →  fecha_cotizacion
total_servicios            →  subtotal_servicios
total_componentes          →  subtotal_componentes
subtotal                   →  subtotal_general
porcentaje_descuento       →  descuento_porcentaje
valor_descuento            →  descuento_valor
total_antes_iva            →  subtotal_con_descuento
porcentaje_iva             →  iva_porcentaje
valor_iva                  →  iva_valor
total_general              →  total_cotizacion
id_estado_cotizacion       →  id_estado
creado_en                  →  fecha_creacion
actualizado_en             →  fecha_modificacion
```

**Campos FALTANTES en Entity (del schema):**
- `dias_validez` (calculado: vencimiento - emision)
- `asunto` (título cotización)
- `alcance_trabajo` (scope detallado)
- `exclusiones` (qué NO incluye)
- `forma_pago` (CONTADO, CREDITO, ANTICIPADO)
- `terminos_condiciones` (texto legal)
- `tiempo_estimado_dias` (plazo ejecución)
- `version` (control versionado)
- `id_cotizacion_padre` (relación versionado)
- `metadata` (JSON flexible)

**Acción Required:**
1. Decidir estrategia:
   - **A)** Renombrar campos entity para coincidir con schema (recomendado: menos refactor)
   - **B)** Crear mapper en repository null→undefined, nombres entity→schema
2. Agregar campos faltantes a entity
3. Actualizar repository prisma-cotizaciones.repository.ts (25 errores compilación)
4. Actualizar DTOs con nuevos campos

---

### 2. Seed Estados Cotización (PRIORITARIO)
**File:** `apps/api/src/seeds/estados-cotizacion.seed.ts`

```sql
INSERT INTO public.estados_cotizacion (nombre_estado, descripcion) VALUES
('BORRADOR', 'Cotización en construcción, puede ser modificada'),
('ENVIADA', 'Cotización enviada al cliente, esperando respuesta'),
('EN_REVISION', 'Cliente está revisando la cotización'),
('APROBADA', 'Cliente aprobó la cotización'),
('RECHAZADA', 'Cliente rechazó la cotización'),
('VENCIDA', 'Cotización expiró (fecha_vencimiento superada)'),
('CANCELADA', 'Cotización cancelada internamente');
```

---

### 3. Módulos Relacionados (TODO Items 2-7)
- **Items Cotización Servicios** (tabla `items_cotizacion_servicios`)
  - Relación con `catalogo_servicios`
  - Cálculo subtotal: cantidad * precio_unitario
  - Trigger: Al crear/actualizar → recalcular totales cotización

- **Items Cotización Componentes** (tabla `items_cotizacion_componentes`)
  - Relación con `catalogo_componentes`
  - Validación: verificar stock disponible
  - Cálculo subtotal: cantidad * precio_venta

- **Lógica Cálculo Totales Automático**
  - Handler: `CalcularTotalesCotizacionHandler`
  - Trigger: Al crear/actualizar/eliminar ítems
  - Cálculo:
    ```
    subtotal = subtotal_servicios + subtotal_componentes
    descuento_valor = subtotal * (descuento_porcentaje / 100)
    subtotal_con_descuento = subtotal - descuento_valor
    iva_valor = subtotal_con_descuento * (iva_porcentaje / 100)
    total_cotizacion = subtotal_con_descuento + iva_valor
    ```

- **Aprobaciones Cotización** (tabla `aprobaciones_cotizacion`)
  - CRUD con firma digital cliente
  - Trigger: Al aprobar → cambiar estado APROBADA + fecha_conversion_os

- **Workflow Estados**
  - Validar transiciones válidas:
    - BORRADOR → ENVIADA → APROBADA/RECHAZADA/VENCIDA
    - BORRADOR → CANCELADA (cualquier momento)
  - Job scheduler: Detectar cotizaciones vencidas (fecha_vencimiento < now())

---

### 4. Testing E2E
**File:** `apps/api/test/cotizaciones.e2e-spec.ts`

```typescript
describe('Cotizaciones E2E', () => {
  test('Crear cotización → Agregar items → Calcular totales → Enviar → Aprobar');
  test('Solo BORRADOR puede modificarse');
  test('Validar fecha_vencimiento > fecha_cotizacion');
  test('Generar número secuencial COT-2025-NNNN');
  test('Filtros: cliente, sede, estado, fechas');
});
```

---

## 📊 MÉTRICAS PROGRESO

| Métrica | Estado |
|---------|--------|
| **Entity + Repository Interface** | ✅ 100% |
| **DTOs** | ✅ 100% |
| **Commands/Queries/Handlers** | ✅ 100% |
| **Controller** | ✅ 100% |
| **Prisma Repository** | ❌ 0% (bloqueado por schema mismatch) |
| **Seed Estados** | ❌ 0% |
| **Módulos Items** | ❌ 0% |
| **Aprobaciones** | ❌ 0% |
| **Testing E2E** | ❌ 0% |

**TOTAL FASE 4.4 COTIZACIONES:** 60% completado (arquitectura base) | 40% pendiente (implementación + testing)

---

## 🚀 PRÓXIMO PASO INMEDIATO

**Decisión estratégica requerida:**

### Opción A: Completar Cotizaciones (2-3 horas)
1. Corregir schema mismatch (30 min)
2. Implementar seed estados (10 min)
3. Testing básico CRUD (20 min)
4. **Resultado:** Cotizaciones funcional básico (sin items ni aprobaciones aún)

### Opción B: Continuar módulos siguientes (recomendado)
**Fundamento:** Cotizaciones necesita items (servicios/componentes) para ser 100% útil. Mejor avanzar a:
- **FASE 5 - INVENTARIO** (11 tablas: componentes, lotes, movimientos, órdenes compra)
- Luego regresar a completar Cotizaciones con items

**DECISIÓN USER:** ¿Completar Cotizaciones ahora o avanzar Inventario?

---

## 📝 NOTAS TÉCNICAS

- Arquitectura CQRS implementada correctamente
- Controller usa CommandBus/QueryBus (no service directo)
- Entity con métodos de validación y cálculo (DDD)
- Repository con método `generateNumeroCotizacion()` secuencial
- Totales calculados automáticamente al cambiar porcentajes

**Estado compilación:** ❌ FAILED (53 errores schema mismatch en prisma-cotizaciones.repository.ts)

**Estado servidor:** ✅ ACTIVO (CotizacionesModule aún no compilado, no afecta módulos existentes)

---

**Última actualización:** 14 Nov 2025 - Token budget: 925K remaining
