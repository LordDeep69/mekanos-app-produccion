# CRUD ENDPOINTS TABLA 13 - GASTOS_ORDEN
## ✅ 100% EXITOSO - 8/8 TESTS PASADOS

**Fecha:** 2025-11-25  
**Tabla:** `gastos_orden` (Tabla 13/14 - FASE 3)  
**Estado:** ✅ COMPLETO

---

## 📊 RESUMEN DE TESTS

| # | Test | Endpoint | Estado |
|---|------|----------|--------|
| 1 | GET todos | `GET /api/gastos-orden` | ✅ EXITOSO |
| 2 | POST crear | `POST /api/gastos-orden` | ✅ EXITOSO |
| 3 | GET por ID | `GET /api/gastos-orden/:id` | ✅ EXITOSO |
| 4 | GET por orden | `GET /api/gastos-orden/orden/:idOrden` | ✅ EXITOSO |
| 5 | PUT actualizar | `PUT /api/gastos-orden/:id` | ✅ EXITOSO |
| 6 | Validación valor > 0 | `POST /api/gastos-orden` | ✅ EXITOSO (400) |
| 7 | Lógica requiereAprobacion | `POST /api/gastos-orden` | ✅ EXITOSO |
| 8 | DELETE eliminar | `DELETE /api/gastos-orden/:id` | ✅ EXITOSO (204) |

---

## 📋 ESPECIFICACIÓN DE LA TABLA

### Campos (22 total)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_gasto | SERIAL PK | ID único |
| id_orden_servicio | INT FK | Orden de servicio (CASCADE) |
| tipo_gasto | ENUM | TRANSPORTE, PARQUEADERO, PEAJE, ALIMENTACION, CONSUMIBLE, HERRAMIENTA, OTRO |
| descripcion | VARCHAR(300) | Descripción del gasto |
| justificacion | TEXT | Justificación del gasto |
| valor | DECIMAL(12,2) | Valor del gasto (> 0) |
| tiene_comprobante | BOOLEAN | ¿Tiene comprobante? |
| numero_comprobante | VARCHAR(100) | Número de comprobante |
| proveedor | VARCHAR(200) | Nombre del proveedor |
| ruta_comprobante | VARCHAR(500) | Ruta al archivo de comprobante |
| requiere_aprobacion | BOOLEAN | Automático si valor > 100000 |
| estado_aprobacion | ENUM | PENDIENTE, APROBADO, RECHAZADO |
| observaciones_aprobacion | TEXT | Observaciones del aprobador |
| fecha_gasto | TIMESTAMP | Fecha del gasto |
| generado_por | INT FK | Empleado que genera |
| aprobado_por | INT FK | Usuario que aprueba |
| fecha_aprobacion | TIMESTAMP | Fecha de aprobación |
| observaciones | TEXT | Observaciones generales |
| registrado_por | INT FK | Usuario que registra |
| fecha_registro | TIMESTAMP | Fecha de registro |
| modificado_por | INT FK | Usuario que modifica |
| fecha_modificacion | TIMESTAMP | Fecha de modificación |

### ENUMs
- `tipo_gasto_enum`: TRANSPORTE, PARQUEADERO, PEAJE, ALIMENTACION, CONSUMIBLE, HERRAMIENTA, OTRO
- `estado_aprobacion_gasto_enum`: PENDIENTE, APROBADO, RECHAZADO

### Relaciones (5 FKs)
1. `ordenes_servicio` (CASCADE) - via id_orden_servicio
2. `empleados` - via generado_por
3. `usuarios` (aprobado_por) - relación Prisma: `usuarios_gastos_orden_aprobado_porTousuarios`
4. `usuarios` (registrado_por) - relación Prisma: `usuarios_gastos_orden_registrado_porTousuarios`
5. `usuarios` (modificado_por) - relación Prisma: `usuarios_gastos_orden_modificado_porTousuarios`

---

## 🏗️ ARQUITECTURA

### Estructura de Archivos
```
gastos-orden/
├── dto/
│   ├── create-gasto-orden.dto.ts
│   ├── update-gasto-orden.dto.ts
│   └── response-gasto-orden.dto.ts
├── application/
│   ├── commands/
│   │   ├── create-gasto-orden.command.ts
│   │   ├── create-gasto-orden.handler.ts
│   │   ├── update-gasto-orden.command.ts
│   │   ├── update-gasto-orden.handler.ts
│   │   ├── delete-gasto-orden.command.ts
│   │   └── delete-gasto-orden.handler.ts
│   ├── queries/
│   │   ├── get-all-gastos-orden.query.ts
│   │   ├── get-all-gastos-orden.handler.ts
│   │   ├── get-gasto-orden-by-id.query.ts
│   │   ├── get-gasto-orden-by-id.handler.ts
│   │   ├── get-gastos-orden-by-orden.query.ts
│   │   └── get-gastos-orden-by-orden.handler.ts
│   ├── mappers/
│   │   └── gasto-orden.mapper.ts
│   └── enums/
│       └── tipo-gasto.enum.ts
├── domain/
│   └── gastos-orden.repository.interface.ts
├── infrastructure/
│   └── prisma-gastos-orden.repository.ts
├── gastos-orden.controller.ts
└── gastos-orden.module.ts
```

---

## 🔧 LÓGICA DE NEGOCIO

### 1. Validación valor > 0
```typescript
if (command.valor <= 0) {
  throw new BadRequestException('El valor del gasto debe ser mayor a 0');
}
```

### 2. Validación comprobante
```typescript
if (command.tieneComprobante && !command.numeroComprobante) {
  throw new BadRequestException('Si tiene comprobante, debe proporcionar el número de comprobante');
}
```

### 3. Lógica requiereAprobacion automática
```typescript
// Si valor > 100000, requiere aprobación automática
const requiereAprobacion = command.valor > 100000;
const estadoAprobacion = requiereAprobacion ? 'PENDIENTE' : 'APROBADO';
```

---

## 📡 ENDPOINTS

### POST /api/gastos-orden
Crear nuevo gasto de orden.

**Request:**
```json
{
  "idOrdenServicio": 1,
  "tipoGasto": "TRANSPORTE",
  "descripcion": "Transporte a sede cliente",
  "justificacion": "Desplazamiento para servicio en sitio",
  "valor": 45000,
  "tieneComprobante": true,
  "numeroComprobante": "FAC-2025-001",
  "proveedor": "TransServicios SAS"
}
```

**Response (201):**
```json
{
  "idGasto": 1,
  "idOrdenServicio": 1,
  "tipoGasto": "TRANSPORTE",
  "descripcion": "Transporte a sede cliente",
  "valor": 45000,
  "requiereAprobacion": false,
  "estadoAprobacion": "APROBADO",
  "ordenServicio": {
    "idOrdenServicio": 1,
    "numeroOrden": "OS-2025-001",
    "fechaProgramada": "2025-11-20T00:00:00.000Z"
  }
}
```

### GET /api/gastos-orden
Listar todos los gastos.

### GET /api/gastos-orden/:id
Obtener gasto por ID.

### GET /api/gastos-orden/orden/:idOrden
Obtener gastos de una orden de servicio específica.

### PUT /api/gastos-orden/:id
Actualizar gasto.

### DELETE /api/gastos-orden/:id
Eliminar gasto (Hard Delete).

---

## 🔍 LECCIONES APRENDIDAS

1. **Campo `username` en usuarios**: El modelo `usuarios` no tiene `nombre_usuario`, usa `username`.
2. **Rutas de importación**: PrismaModule está en `../database/prisma.module`, no `../prisma/prisma.module`.
3. **Nombres largos de relaciones Prisma**: Ejemplo: `usuarios_gastos_orden_aprobado_porTousuarios`.
4. **Conversión Decimal a Number**: Usar `instanceof Decimal` para convertir correctamente.

---

## ✅ REGISTRO EN app.module.ts

```typescript
import { GastosOrdenModule } from './gastos-orden/gastos-orden.module';

@Module({
  imports: [
    // ...otros módulos
    GastosOrdenModule, // ✅ FASE 3.13: NUEVO - Gastos Orden CQRS completo (Tabla 13/14)
  ],
})
```

---

## 📈 PROGRESO FASE 3

| # | Tabla | Estado | Tests |
|---|-------|--------|-------|
| 1-9 | Various | ✅ 100% | Complete |
| 10 | mediciones_servicio | 🔄 94% | Pending |
| 11 | evidencias_fotograficas | ✅ 100% | 8/8 |
| 12 | componentes_usados | ✅ 100% | 8/8 |
| **13** | **gastos_orden** | ✅ **100%** | **8/8** |
| 14 | Pending | ⏸️ | - |

---

**Generado automáticamente por GitHub Copilot - Claude Opus 4.5**
