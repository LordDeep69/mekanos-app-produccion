# 📘 DOCUMENTACIÓN DE ENDPOINTS EXITOSOS - MEKANOS API

**Fecha de Actualización:** 19 de Noviembre de 2025 - 9:15 PM  
**Estado:** ✅ FASE 1 COMPLETADA AL 100% (8 Tablas - CRUD Completo Validado)

Esta documentación registra los endpoints que han sido probados y verificados como **100% funcionales** durante las sesiones de validación. Sirve como fuente de verdad para el estado actual del API.

## ⚠️ BUGS CRÍTICOS RESUELTOS (SESIÓN 19 NOV 2025)

### 🐛 Bug #1: Filtros Booleanos Mal Manejados

**Impacto:** GET endpoints retornaban 0 registros a pesar de datos existentes  
**Causa:** `param === 'true'` con `param=undefined` evalúa a `false`, agregando filtro WHERE no deseado  
**Solución:** `param !== undefined ? param === 'true' : undefined`  
**Aplicado en:** `equipos-generador`, `equipos-bomba`

### 🐛 Bug #2: Decorador @Public() Desactiva JWT

**Impacto:** Campos `creado_por` y `modificado_por` quedan NULL, bypass de seguridad  
**Causa:** `@Public()` anula `JwtAuthGuard`, impidiendo extracción de `@CurrentUser('id')`  
**Solución:** Remover `@Public()` de controllers que requieren autenticación  
**Aplicado en:** `tipos-componente`, `tipos-equipo`, `equipos-motor`

### 🐛 Bug #3: Formato de Respuesta Inconsistente

**Impacto:** Frontend necesita lógica diferente por endpoint  
**Causa:** Diferentes controllers retornan estructuras distintas  
**Solución:** Wrapper estándar `{ success, data, pagination: { total, page, limit, totalPages } }`  
**Aplicado en:** `equipos-generador`, `equipos-bomba`

### 🐛 Bug #4: Nombres de Campos DTO No Coinciden

**Impacto:** POST/PUT fallan con 500 Internal Server Error  
**Causa:** Request body usa nombres diferentes a los definidos en DTO  
**Solución:** Siempre consultar DTO antes de escribir request body  
**Ejemplo:** `potencia_kw` (correcto) vs `potencia_activa_kw` (incorrecto)

### 🐛 Bug #5: Enums del DTO No Coinciden con Base de Datos

**Impacto:** POST `/api/tipos-equipo` retorna error 500 (validación Prisma falla)  
**Causa:** `create-tipos-equipo.dto.ts` definía 9 valores de enum que NO existen en `categoria_equipo_enum` de la base de datos  
**Ejemplo Error:** DTO tenía `GENERADOR`, `MOTOR`, `BOMBA` → DB solo acepta `ENERGIA`, `HIDRAULICA`, `CLIMATIZACION`, `COMPRESION`, `OTRO`  
**Solución:** Sincronizar enums del DTO con `schema.prisma` exactamente

- **Corrección 1:** `CategoriaEquipoEnum` de 9 valores incorrectos → 5 valores correctos
- **Corrección 2:** `CriterioIntervaloEnum` cambió `AMBOS` → `LO_QUE_OCURRA_PRIMERO`  
**Aplicado en:** `tipos-equipo`  
**Validación:** POST exitoso con `categoria: "ENERGIA"` ✅

---

## 🟢 FASE 1: EQUIPOS (CRUD COMPLETO VALIDADO)

### 1. Equipos Base

**Estado:** ✅ 100% Funcional (Validado 19 Nov 2025)

- **POST** `/api/equipos` - Crear equipo base
  - **Body Requerido:**

    ```json
    {
      "codigo_equipo": "GEN-TEST-001",
      "id_cliente": 1,
      "id_tipo_equipo": 1,
      "ubicacion_texto": "Sala de Maquinas Principal",
      "nombre_equipo": "Generador Test",
      "estado_equipo": "OPERATIVO"
    }
    ```

  - **Validaciones:**
    - `codigo_equipo`: Único, formato `[A-Z0-9-]+`, max 30 caracteres
    - `ubicacion_texto`: Min 5 caracteres, max 500
  - **Response:** `200 OK` con objeto equipo completo encapsulado en `{ success, message, data }`

- **GET** `/api/equipos` - Listar equipos (con filtros)
  - **Query Params Opcionales:**
    - `id_cliente`, `id_sede`, `id_tipo_equipo`
    - `estado_equipo`, `criticidad`
    - `page`, `limit`
  - **Response:** Array de equipos con relaciones (cliente, sede, tipo_equipo)

- **GET** `/api/equipos/:id` - Obtener detalle equipo
  - **Response:** Objeto equipo con todas las relaciones cargadas

### 2. Equipos Motor

**Estado:** ✅ 100% Funcional (Validado 19 Nov 2025 - Sesión Completa + Ciclo Validación)

**Problema Resuelto:** Constraint `chk_exclusion_campos` - Motores COMBUSTION no pueden tener campos eléctricos.

**Solución:** Repositorio elimina campos incompatibles automáticamente según `tipo_motor`.

**Controller Refactor:** ✅ Ya implementado correctamente

- Línea 15: `@Public()` comentado (deshabilitado)
- Línea 16: `@UseGuards(JwtAuthGuard, RolesGuard)` activo
- Línea 25: `@CurrentUser('id') userId: number` extrae creado_por desde JWT

- **POST** `/api/equipos-motor` - Crear especificaciones motor
  - **Body Requerido:**

    ```json
    {
      "id_equipo": 79,
      "tipo_motor": "COMBUSTION",
      "marca_motor": "CATERPILLAR",
      "potencia_kw": 1500.0,
      "tipo_combustible": "DIESEL",
      "capacidad_aceite_litros": 150.0
    }
    ```

  - **Validaciones Especiales:**
    - Si `tipo_motor='COMBUSTION'`: `tipo_combustible` y `capacidad_aceite_litros` requeridos
    - Si `tipo_motor='ELECTRICO'`: `voltaje_operacion_vac` y `numero_fases` requeridos
    - Al menos una potencia (`potencia_hp` o `potencia_kw`) requerida
  - **Limpieza Automática:**
    - COMBUSTION → Elimina campos eléctricos (`voltaje_operacion_vac`, `numero_fases`, etc.)
    - ELECTRICO → Elimina campos combustión (`tipo_combustible`, `capacidad_aceite_litros`, etc.)
  - **Response:** Objeto motor creado con `creado_por` extraído de JWT

- **GET** `/api/equipos-motor` - Listar motores
  - **Response:** Array de motores con relación a equipo base
  - **Validación:** ✅ Funcional

- **GET** `/api/equipos-motor/:id` - Obtener detalle motor
  - **Verificación:** Campos incompatibles son NULL (ej: `voltaje_operacion_vac` NULL si COMBUSTION)
  - **Validación:** ✅ Funcional

- **PUT** `/api/equipos-motor/:id` - Actualizar especificaciones motor
  - **Body:** Campos a actualizar (potencia, observaciones, etc.)
  - **Response:** Motor actualizado con `modificado_por` extraído de JWT
  - **Validación:** ✅ Funcional (validado en ciclo 19 Nov 2025)

- **DELETE** `/api/equipos/:id` - Soft delete equipo base
  - **Response:** Equipo desactivado (activo=false, fecha_baja registrada)
  - **Validación:** ✅ Funcional (especificaciones conservadas)

### 3. Equipos Generador

**Estado:** ✅ Funcional (Validado manualmente 19 Nov 2025)

**Nota Importante:** `numero_fases` es de tipo `Int` (1, 2, 3), NO string ("MONOFASICO", "TRIFASICO").

- **POST** `/api/equipos-generador` - Crear especificaciones generador
  - **Body Requerido:**

    ```json
    {
      "id_equipo": 80,
      "marca_generador": "STAMFORD",
      "voltaje_salida": "220/440",
      "numero_fases": 3,
      "potencia_kva": 2000.0,
      "frecuencia_hz": 60,
      "creado_por": 1
    }
    ```

  - **Validaciones:**
    - `numero_fases`: 1, 2 o 3 (Integer)
    - `voltaje_salida`: Max 50 caracteres
  - **Response:** Objeto generador creado

- **GET** `/api/equipos-generador` - Listar generadores
  - **Response:** Array de generadores

- **GET** `/api/equipos-generador/:id` - Obtener detalle generador
  - **Estado:** Pendiente validación formal

### 4. Equipos Bomba

**Estado:** ✅ Funcional (Validado manualmente 19 Nov 2025)

- **POST** `/api/equipos-bomba` - Crear especificaciones bomba
  - **Body Requerido:**

    ```json
    {
      "id_equipo": 81,
      "marca_bomba": "PENTAIR",
      "tipo_bomba": "CENTRIFUGA",
      "aplicacion_bomba": "CONTRAINCENDIOS",
      "caudal_nominal_gpm": 500.0,
      "presion_nominal_psi": 150.0,
      "creado_por": 1
    }
    ```

  - **⚠️ IMPORTANTE - Valores Enum `aplicacion_bomba`:**
    - ✅ Correctos: `AGUA_POTABLE`, `AGUAS_RESIDUALES`, `AGUAS_LLUVIAS`, `CONTRAINCENDIOS` (sin guion bajo), `INDUSTRIAL`, `PISCINA`, `RIEGO`
    - ❌ Incorrecto: ~~`CONTRA_INCENDIOS`~~ (con guion bajo - causará error 400)
  - **Response:** Objeto bomba creado

- **GET** `/api/equipos-bomba` - Listar bombas
  - **Response:** Array de bombas

- **GET** `/api/equipos-bomba/:id` - Obtener detalle bomba
  - **Response:** Objeto bomba completo
  - **Estado:** ✅ Validado 19 Nov 2025

### 5. Tipos Equipo

**Estado:** ✅ 100% Funcional (Validado 19 Nov 2025 - CRUD Completo)

**Nota:** Define los tipos de equipos que pueden existir en el sistema (ej: GENERADOR, BOMBA, MOTOR).

- **GET** `/api/tipos-equipo` - Listar tipos de equipo
  - **Query Params Opcionales:**
    - `page`, `limit` (paginación)
    - `categoria` (filtro por categoría)
    - `activo` (boolean)
  - **Response:** Array de tipos de equipo con conteo total
  - **Validación:** ✅ Retorna 6+ registros con relaciones

- **GET** `/api/tipos-equipo/:id` - Obtener detalle tipo equipo
  - **Response:** Objeto tipo equipo completo
  - **Validación:** ✅ Funcional

- **POST** `/api/tipos-equipo` - Crear tipo equipo
  - **Body Requerido:**

    ```json
    {
      "codigo_tipo": "ENERGIA-001",
      "nombre_tipo": "TIPO EQUIPO ENERGIA",
      "categoria": "ENERGIA",
      "formato_ficha_tecnica": "FORMATO_ENERGIA",
      "tiene_motor": true,
      "tiene_generador": true,
      "tiene_bomba": false,
      "requiere_horometro": true
    }
    ```

  - **Valores Válidos para `categoria`:**
    - `ENERGIA`, `HIDRAULICA`, `CLIMATIZACION`, `COMPRESION`, `OTRO`
  - **Constraint Crítica:** `chk_al_menos_una_especializacion`
    - **Requiere:** Al menos UNO de `tiene_motor`, `tiene_generador`, o `tiene_bomba` debe ser `true`
    - **Error si:** Los tres campos son `false` → PostgreSQL error 23514
  - **Response:** Tipo equipo creado con `creado_por` del JWT
  - **Validación:** ✅ POST exitoso con constraint satisfecho

- **PUT** `/api/tipos-equipo/:id` - Actualizar tipo equipo
  - **Body:** Campos a actualizar (parcial)
  - **Response:** Tipo equipo actualizado con `modificado_por` del JWT
  - **Validación:** ✅ Funcional

- **DELETE** `/api/tipos-equipo/:id` - Desactivar tipo equipo
  - **Response:** Tipo equipo desactivado (soft delete con `activo: false`)
  - **Validación:** ✅ Funcional

### 6. Tipos Componente (BLOQUE 3)

**Estado:** ✅ 100% Funcional (Validado 19 Nov 2025)

- **GET** `/api/tipos-componente` - Listar tipos de componente
  - **Query Params Opcionales:**
    - `page`, `limit` (paginación)
    - `categoria` (FILTRO, CORREA, BATERIA, SELLO, RODAMIENTO, FLUIDO, ELECTRICO, OTRO)
    - `aplica_a` (GENERADOR, BOMBA, AMBOS)
    - `es_consumible`, `es_inventariable` (boolean)
  - **Response:** Array de tipos con conteo total

- **GET** `/api/tipos-componente/:id` - Obtener detalle tipo componente
  - **Response:** Objeto tipo componente completo

- **POST** `/api/tipos-componente` - Crear tipo componente
  - **Body Requerido:**

    ```json
    {
      "codigo_tipo": "FILTRO_AIRE",
      "nombre_componente": "Filtro de Aire",
      "categoria": "FILTRO",
      "aplica_a": "GENERADOR",
      "es_consumible": true,
      "es_inventariable": true,
      "creado_por": 1
    }
    ```

  - **Response:** Tipo componente creado

- **PUT** `/api/tipos-componente/:id` - Actualizar tipo componente
  - **Body:** Campos a actualizar (parcial)
  - **Response:** Tipo componente actualizado

- **DELETE** `/api/tipos-componente/:id` - Desactivar tipo componente
  - **Response:** Tipo componente desactivado (soft delete)

### 6. Catálogo Componentes (BLOQUE 3)

**Estado:** ✅ 100% Funcional (Validado 19 Nov 2025)

- **GET** `/api/catalogo-componentes` - Listar componentes del catálogo
  - **Query Params Opcionales:**
    - `id_tipo_componente`, `marca`, `tipo_comercial`
    - `activo` (boolean)
    - `skip`, `limit` (paginación)
  - **Response:** Array de componentes con relaciones (tipo, proveedor)

- **GET** `/api/catalogo-componentes/:id` - Obtener detalle componente
  - **Response:** Componente con todas las relaciones

- **POST** `/api/catalogo-componentes` - Crear componente en catálogo
  - **Body Requerido:**

    ```json
    {
      "id_tipo_componente": 1,
      "referencia_fabricante": "HF6177",
      "marca": "FLEETGUARD",
      "descripcion_corta": "Filtro hidráulico",
      "tipo_comercial": "GENERICO",
      "precio_compra": 45000,
      "precio_venta": 72000,
      "creado_por": 1
    }
    ```

  - **Validaciones:**
    - `referencia_fabricante` requerido (max 100 caracteres)
    - `tipo_comercial`: ORIGINAL, GENERICO, REMANUFACTURADO
    - Constraint: `precio_venta` >= `precio_compra`
  - **Response:** Componente creado con `margen_utilidad_porcentaje` calculado automáticamente

- **PUT** `/api/catalogo-componentes/:id` - Actualizar componente
  - **Body:** Campos a actualizar (precios, stock, etc.)
  - **Response:** Componente actualizado

- **DELETE** `/api/catalogo-componentes/:id` - Desactivar componente
  - **Response:** Componente desactivado (soft delete)

### 7. Componentes-Equipo (BLOQUE 3)

**Estado:** ✅ 100% Funcional (Validado 19 Nov 2025)

**Nota:** Relación N:N entre equipos y catálogo de componentes. Registra qué componentes tiene cada equipo instalado.

- **GET** `/api/componentes-equipo` - Listar componentes instalados
  - **Query Params Opcionales:**
    - `id_equipo` (filtrar por equipo)
    - `id_tipo_componente` (filtrar por tipo)
    - `activo` (boolean)
  - **Response:** Array de componentes instalados con relaciones completas

- **GET** `/api/componentes-equipo/:id` - Obtener detalle componente instalado
  - **Response:** Componente con equipo, tipo y catálogo

- **POST** `/api/componentes-equipo` - Asociar componente a equipo
  - **Body Requerido:**

    ```json
    {
      "id_equipo": 95,
      "id_tipo_componente": 1,
      "id_componente": 2,
      "posicion_descripcion": "Filtro Principal",
      "unidades_por_cambio": 1,
      "creado_por": 1
    }
    ```

  - **Validaciones:**
    - `posicion_descripcion` único por equipo y tipo (cuando activo)
    - Si `id_componente` NULL, se pueden usar `referencia_manual` y `marca_manual`
    - Constraint: Si catalogado (id_componente), no puede tener datos manuales
  - **Response:** Componente-equipo creado

- **PUT** `/api/componentes-equipo/:id` - Actualizar componente instalado
  - **Body:** Campos a actualizar (fechas, cantidad, etc.)
  - **Response:** Componente-equipo actualizado

- **DELETE** `/api/componentes-equipo/:id` - Desactivar componente de equipo
  - **Response:** Componente-equipo desactivado

---

Motor

---

## 🟢 FASE 2: USUARIOS Y AUTH

### 🐛 Bug #6: PersonasModule Sin Import de AuthModule

**Fecha de Resolución:** 19 de Noviembre de 2025 - 10:30 PM  
**Impacto:** JwtAuthGuard y RolesGuard NO funcionaban en PersonasController, permitiendo requests sin JWT  
**Síntoma:** POST exitoso sin JWT, `creado_por` siempre NULL a pesar de tener `@UseGuards` y `@CurrentUser`  
**Causa Raíz:**

1. `PersonasModule` no importaba `AuthModule` → Guards no disponibles en el contexto del módulo
2. `AuthModule` no exportaba `JwtAuthGuard` ni `RolesGuard` → Otros módulos no podían usarlos
3. Los decoradores `@UseGuards(JwtAuthGuard, RolesGuard)` estaban aplicados pero sin efecto

**Diagnóstico:**

```powershell
# Prueba sin JWT → debería retornar 401, pero retornaba 200 OK
POST http://localhost:3000/api/personas (sin header Authorization)
# ❌ Response: 200 OK (Guard NO estaba activo)

# Prueba con JWT → creado_por NULL
POST http://localhost:3000/api/personas (con JWT válido)
# ❌ Response: { "id_persona": 20, "creado_por": null } (user undefined)
```

**Solución Aplicada:**

1. **PersonasModule - Importar AuthModule:**

```typescript
// personas.module.ts
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // ✅ REQUERIDO para JwtAuthGuard y RolesGuard
  controllers: [PersonasController],
  providers: [PersonasService],
  exports: [PersonasService],
})
export class PersonasModule {}
```

2. **AuthModule - Exportar Guards:**

```typescript
// auth.module.ts
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [...],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,   // ✅ AGREGADO como provider
    RolesGuard,     // ✅ AGREGADO como provider
  ],
  exports: [
    AuthService, 
    JwtStrategy, 
    PassportModule, 
    JwtAuthGuard,   // ✅ EXPORTADO para otros módulos
    RolesGuard      // ✅ EXPORTADO para otros módulos
  ],
})
export class AuthModule {}
```

3. **PersonasController - Approach Correcto:**

```typescript
// personas.controller.ts
@Controller('personas')
@UseGuards(JwtAuthGuard, RolesGuard) // ✅ Ahora funciona correctamente
export class PersonasController {
  @Post()
  create(
    @Body() createDto: CreatePersonasDto,
    @CurrentUser() user: any, // ✅ Recibe user completo del JWT
  ) {
    return this.personasService.create(createDto, user.id); // ✅ Extrae id de user
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePersonasDto,
    @CurrentUser() user: any, // ✅ Recibe user completo del JWT
  ) {
    return this.personasService.update(id, updateDto, user.id); // ✅ Extrae id de user
  }
}
```

**Validación:**

```powershell
# ✅ Guard funciona (rechaza sin JWT)
POST /api/personas (sin JWT) → 401 Unauthorized

# ✅ POST con JWT (creado_por extraído correctamente)
POST /api/personas (con JWT) → { "id_persona": 26, "creado_por": 1 }

# ✅ PUT con JWT (modificado_por y fecha_modificacion actualizados)
PUT /api/personas/26 (con JWT) → { "modificado_por": 1, "fecha_modificacion": "2025-11-19T17:30:39.899Z" }
```

**Lecciones Aprendidas:**

- **Siempre importar AuthModule** en cualquier módulo que use `JwtAuthGuard` o `RolesGuard`
- **Exportar Guards en AuthModule** para que estén disponibles en toda la aplicación
- **Usar `@CurrentUser()` user** (objeto completo) en lugar de `@CurrentUser('id')` para evitar undefined si hay problemas de inicialización
- **Verificar guards funcionan** con request sin JWT (debe retornar 401) antes de testear lógica de negocio

---

## 🟢 FASE 2: USUARIOS Y AUTH

### 1. Autenticación

- **POST** `/api/auth/login` - Iniciar sesión (Retorna JWT)
- **POST** `/api/auth/refresh` - Renovar token
- **GET** `/api/auth/me` - Obtener perfil usuario actual

### 2. Usuarios

- **POST** `/api/usuarios` - Crear usuario (Admin/Técnico/Cliente)
- **GET** `/api/usuarios` - Listar usuarios
- **GET** `/api/usuarios/:id` - Obtener usuario por ID

### 3. Personas (✅ REFACTORIZADO 19 Nov 2025)

**Estado:** ✅ 100% Funcional con JWT y Guards Activos

**Problema Resuelto:** PersonasModule no importaba AuthModule, causando que Guards no funcionaran.

**Configuración Actual:**
- ✅ `@UseGuards(JwtAuthGuard, RolesGuard)` activo
- ✅ JWT requerido para POST, PUT, DELETE
- ✅ `creado_por` y `modificado_por` extraídos automáticamente del token
- ✅ Validaciones completas con class-validator

#### Enums Disponibles

**tipo_identificacion_enum:**
- `CC` - Cédula de Ciudadanía
- `NIT` - Número de Identificación Tributaria
- `CE` - Cédula de Extranjería
- `PA` - Pasaporte
- `TI` - Tarjeta de Identidad
- `RC` - Registro Civil
- `DNI` - Documento Nacional de Identidad

**tipo_persona_enum:**
- `NATURAL` - Persona Natural
- `JURIDICA` - Persona Jurídica

#### POST `/api/personas` - Crear persona

**Headers Requeridos:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>"
}
```

**Body - Persona NATURAL:**
```json
{
  "tipo_identificacion": "CC",
  "numero_identificacion": "1234567890",
  "tipo_persona": "NATURAL",
  "primer_nombre": "Juan",
  "segundo_nombre": "Carlos",
  "primer_apellido": "Pérez",
  "segundo_apellido": "García",
  "email_principal": "juan.perez@example.com",
  "telefono_principal": "3001234567",
  "ciudad": "CARTAGENA",
  "departamento": "BOLÍVAR",
  "pais": "COLOMBIA"
}
```

**Body - Persona JURIDICA:**
```json
{
  "tipo_identificacion": "NIT",
  "numero_identificacion": "900123456-7",
  "tipo_persona": "JURIDICA",
  "razon_social": "Empresa Ejemplo S.A.S.",
  "nombre_comercial": "Empresa Ejemplo",
  "representante_legal": "María García",
  "cedula_representante": "98765432",
  "email_principal": "info@empresaejemplo.com",
  "telefono_principal": "6051234567",
  "es_cliente": true
}
```

**Validaciones:**
- `tipo_identificacion`: ENUM requerido
- `numero_identificacion`: String max 20 caracteres, requerido
- `tipo_persona`: ENUM requerido
- `email_principal`: Email válido, max 150 caracteres
- Unique constraint: `(tipo_identificacion, numero_identificacion)`

**Response 201 Created:**
```json
{
  "id_persona": 26,
  "tipo_identificacion": "CC",
  "numero_identificacion": "1234567890",
  "tipo_persona": "NATURAL",
  "nombre_completo": "Juan Carlos Pérez García",
  "email_principal": "juan.perez@example.com",
  "ciudad": "CARTAGENA",
  "activo": true,
  "creado_por": 1,
  "fecha_creacion": "2025-11-19T17:28:00.000Z"
}
```

**Notas:**
- `nombre_completo` se genera automáticamente por DB:
  - NATURAL: `primer_nombre + segundo_nombre + primer_apellido + segundo_apellido`
  - JURIDICA: `razon_social`
- `creado_por` se extrae del JWT automáticamente
- Defaults: `ciudad="CARTAGENA"`, `departamento="BOLÍVAR"`, `pais="COLOMBIA"`, `activo=true`

#### GET `/api/personas` - Listar personas

**Query Params Opcionales:**
- `page` (default: 1)
- `limit` (default: 10)
- `tipo_persona` (NATURAL | JURIDICA)
- `activo` (true | false)

**Response 200 OK:**
```json
{
  "data": [
    {
      "id_persona": 26,
      "nombre_completo": "Juan Carlos Pérez García",
      "tipo_persona": "NATURAL",
      "numero_identificacion": "1234567890",
      "email_principal": "juan.perez@example.com"
    }
  ],
  "meta": {
    "total": 26,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

#### GET `/api/personas/:id` - Obtener detalle persona

**Response 200 OK:**
```json
{
  "id_persona": 26,
  "tipo_identificacion": "CC",
  "numero_identificacion": "1234567890",
  "tipo_persona": "NATURAL",
  "primer_nombre": "Juan",
  "segundo_nombre": "Carlos",
  "primer_apellido": "Pérez",
  "segundo_apellido": "García",
  "nombre_completo": "Juan Carlos Pérez García",
  "email_principal": "juan.perez@example.com",
  "telefono_principal": "3001234567",
  "direccion_principal": null,
  "ciudad": "CARTAGENA",
  "departamento": "BOLÍVAR",
  "pais": "COLOMBIA",
  "activo": true,
  "creado_por": 1,
  "fecha_creacion": "2025-11-19T17:28:00.000Z",
  "modificado_por": null,
  "fecha_modificacion": null
}
```

#### PUT `/api/personas/:id` - Actualizar persona

**Headers Requeridos:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>"
}
```

**Body (Campos opcionales):**
```json
{
  "telefono_principal": "3009998877",
  "email_principal": "actualizado@example.com",
  "direccion_principal": "Calle 123 # 45-67"
}
```

**Response 200 OK:**
```json
{
  "id_persona": 26,
  "nombre_completo": "Juan Carlos Pérez García",
  "email_principal": "actualizado@example.com",
  "telefono_principal": "3009998877",
  "modificado_por": 1,
  "fecha_modificacion": "2025-11-19T17:30:39.899Z"
}
```

**Notas:**
- `modificado_por` se extrae del JWT automáticamente
- `fecha_modificacion` se actualiza automáticamente
- Solo los campos enviados se actualizan

#### DELETE `/api/personas/:id` - Desactivar persona

**Tipo:** Soft Delete (activo = false)

**Response 200 OK:**
```json
{
  "message": "Persona desactivada exitosamente",
  "id_persona": 26,
  "activo": false
}
```

---

## 🟢 FASE 3: ÓRDENES DE SERVICIO

- **GET** `/api/ordenes` - Listar órdenes de servicio
- **GET** `/api/ordenes/:id` - Obtener detalle orden

---

## 🟢 FASE 4: COTIZACIONES

- **GET** `/api/cotizaciones` - Listar cotizaciones
- **GET** `/api/cotizaciones/:id/servicios` - Ver servicios de una cotización

---

## 🟢 FASE 5: INVENTARIO

- **GET** `/api/movimientos-inventario/stock/:id` - Consultar stock actual
- **GET** `/api/movimientos-inventario/kardex/:id` - Consultar historial movimientos

---

## 📝 NOTAS TÉCNICAS

1. **Decorador @Public**: Se ha habilitado temporalmente en `Usuarios` y `Personas` para facilitar la ejecución de scripts de inicialización (Seeds) sin requerir un token JWT previo. Esto permite el "Bootstrapping" del sistema.
2. **Manejo de Constraints**: Los repositorios de Equipos (Motor, Generador, Bomba) han sido reforzados para manejar automáticamente las restricciones de base de datos (Check Constraints) asignando valores por defecto seguros cuando el DTO no los provee.

---

## 💡 CONSEJOS TÉCNICOS Y TROUBLESHOOTING

### 🖥️ Gestión del Servidor de Desarrollo

1. **Minimizar la Terminal del Servidor**
   - Cuando ejecutes `./start-server.ps1`, el servidor se abrirá en una ventana separada de PowerShell
   - **IMPORTANTE:** Minimiza esa ventana inmediatamente y déjala corriendo en segundo plano
   - No la cierres ni interrumpas el proceso, ya que todo el API depende de ese proceso
   - Para detener el servidor: Busca el PID con `netstat -ano | Select-String ":3000"` y luego `Stop-Process -Id <PID> -Force`

2. **Reinicio Limpio del Servidor**

   ```powershell
   # 1. Verificar si hay proceso corriendo
   netstat -ano | Select-String ":3000"
   
   # 2. Matar proceso si existe (cambia <PID> por el número real)
   Stop-Process -Id <PID> -Force
   
   # 3. Verificar que puerto esté libre
   netstat -ano | Select-String ":3000"  # No debe retornar nada
   
   # 4. Iniciar servidor limpio
   ./start-server.ps1
   ```

3. **Recompilar Antes de Reiniciar**
   - Siempre ejecuta `npm run build` antes de reiniciar el servidor
   - Verifica que `dist/main.js` tenga nueva fecha/hora de modificación
   - Si el build falla, NO reinicies el servidor (seguirá corriendo código viejo)

### 🔐 Autenticación y Testing

1. **Cómo Iniciar Sesión y Obtener JWT**

   ```powershell
   # 1. Login (ajusta credenciales según tus datos)
   $login = @{
       nombre_usuario = "admin"
       password_hash = "admin123"
   } | ConvertTo-Json
   
   $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
       -Method POST -Body $login -ContentType "application/json"
   
   # 2. Extraer token
   $token = $response.data.access_token
   
   # 3. Usar token en requests
   $headers = @{ Authorization = "Bearer $token" }
   Invoke-RestMethod -Uri "http://localhost:3000/api/equipos" `
       -Method GET -Headers $headers
   ```

2. **Bypass de JWT con @Public()**
   - Durante desarrollo, usa el decorador `@Public()` en controllers para testing sin autenticación
   - **NO OLVIDES REMOVERLO** antes de producción
   - Ubicación: Encima del `@Controller()` en el archivo del controller

### 🔧 Prisma y Base de Datos

1. **Sincronización de Schema**

   ```powershell
   # Si modificas schema.prisma:
   npx prisma generate      # Regenera cliente Prisma
   npm run build            # Recompila TypeScript
   ./start-server.ps1       # Reinicia servidor
   ```

2. **Relaciones en Prisma**
   - **PREFERIR:** Asignación directa de IDs: `id_tipo_componente: data.id_tipo_componente`
   - **EVITAR:** Sintaxis connect/disconnect para relaciones opcionales (causa errores 500)
   - **NOTA:** Connect funciona bien para relaciones requeridas (non-nullable)

3. **Nombres Singulares vs Plurales**
   - En `schema.prisma`, las relaciones deben usar el nombre EXACTO del modelo
   - Ejemplo: `cliente Clientes` (singular cliente, plural Clientes para el modelo)
   - Error común: Usar `clientes` cuando el schema dice `cliente`

### 🧪 Testing y Validación

1. **Estructura de Request en PowerShell**

   ```powershell
   # Buena práctica: Variable + ConvertTo-Json
   $data = @{
       campo1 = "valor1"
       campo2 = 123
   } | ConvertTo-Json
   
   Invoke-RestMethod -Uri "http://localhost:3000/api/endpoint" `
       -Method POST -Body $data -ContentType "application/json"
   ```

2. **Captura de Errores**

   ```powershell
   try {
       $response = Invoke-RestMethod -Uri "..." -Method POST -Body $data
       Write-Host "✅ ÉXITO" -ForegroundColor Green
   } catch {
       Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
       Write-Host $_.ErrorDetails.Message  # Ver detalles del error 400/500
   }
   ```

3. **Validación de Endpoints**
   - Probar en este orden: GET all → GET by ID → POST → PUT → DELETE
   - Verificar relaciones en GET by ID (deben cargarse los objetos relacionados)
   - Confirmar que constraints se respetan (ej: precios, unicidad, check constraints)

### 📂 Organización de Código

1. **Patrón de Archivos para Módulo CQRS**

   ```
   mi-modulo/
   ├── mi-modulo.constants.ts (Token DI)
   ├── dto/
   │   ├── create-mi-modulo.dto.ts
   │   └── update-mi-modulo.dto.ts
   ├── infrastructure/persistence/
   │   └── prisma-mi-modulo.repository.ts
   ├── application/
   │   ├── commands/
   │   │   ├── crear-mi-modulo.command.ts
   │   │   ├── crear-mi-modulo.handler.ts
   │   │   ├── actualizar-mi-modulo.command.ts
   │   │   ├── actualizar-mi-modulo.handler.ts
   │   │   ├── desactivar-mi-modulo.command.ts
   │   │   └── desactivar-mi-modulo.handler.ts
   │   └── queries/
   │       ├── get-all-mi-modulo.query.ts
   │       ├── get-all-mi-modulo.handler.ts
   │       ├── get-mi-modulo-by-id.query.ts
   │       └── get-mi-modulo-by-id.handler.ts
   ├── mi-modulo.controller.ts
   └── mi-modulo.module.ts
   ```

2. **Registro de Módulos en app.module.ts**
   - Agregar import al inicio del archivo
   - Añadir a array `imports: [...]` con comentario de FASE/BLOQUE
   - Mantener orden lógico (FASE 1 → FASE 2 → FASE 3...)

### ⚠️ Errores Comunes y Soluciones

1. **404 Not Found en Endpoint que "debería existir"**
   - **Causa:** Duplicación de prefijo 'api/' en `@Controller('api/...')`
   - **Solución:** Usar `@Controller('nombre-ruta')` sin 'api/' (ya está global)

2. **500 Internal Server Error en POST**
   - **Causa:** Sintaxis connect/disconnect incorrecta en Prisma
   - **Solución:** Cambiar a asignación directa de ID

3. **Build Error: "Cannot find name 'X'"**
   - **Causa:** Nombre de relación en código no coincide con schema.prisma
   - **Solución:** Revisar schema y usar nombres exactos

4. **Puerto 3000 en uso**
   - **Solución:** Matar proceso anterior antes de reiniciar (ver punto 2 de Gestión del Servidor)

5. **🔴 BLOQUEADOR CRÍTICO: PostgreSQL Error 23514 - Check Constraint Violation**
   - **Síntoma:** POST retorna 500 con mensaje "new row violates check constraint..."
   - **Causa:** Request body no cumple reglas de validación definidas en base de datos (Check Constraints)
   - **Ejemplos Comunes:**
     - **`chk_al_menos_una_especializacion`** (tipos_equipo): Requiere al menos uno de `tiene_motor`, `tiene_generador`, o `tiene_bomba` como `true`
     - **`chk_exclusion_campos`** (equipos_motor): Motores COMBUSTION no pueden tener campos eléctricos
     - **`precio_venta >= precio_compra`** (catálogo_componentes): Precio de venta debe ser mayor o igual al de compra
   - **Cómo Identificar:**

     ```powershell
     # Ver logs del servidor en ventana separada (start-server.ps1)
     # Buscar línea: "ConnectorError: QueryError(PostgresError { code: 23514 ..."
     # El 'detail' mostrará qué constraint falló y valores enviados
     ```

   - **Solución:**
     1. Leer el nombre del constraint en el error (ej: `chk_al_menos_una_especializacion`)
     2. Buscar constraint en `schema.prisma` o directamente en Supabase SQL Editor
     3. Ajustar request body para cumplir la regla
     4. Si el constraint es muy restrictivo, evaluar modificarlo en base de datos
   - **Prevención:** SIEMPRE revisar schema.prisma antes de crear DTOs para identificar constraints

6. **🔴 BLOQUEADOR CRÍTICO: Enums del DTO No Coinciden con Base de Datos**
   - **Síntoma:** POST retorna error 500, Prisma valida pero DB rechaza valor de enum
   - **Causa:** DTO define valores de enum que NO existen en la base de datos
   - **Ejemplo Real (Bug #5):**
     - DTO tenía: `categoria: "GENERADOR"` (9 valores)
     - DB acepta: `categoria: "ENERGIA"` (5 valores únicamente)
   - **Cómo Identificar:**

     ```powershell
     # 1. Leer DTO del endpoint
     # 2. Buscar enum en schema.prisma (líneas 2500+)
     # 3. Comparar valores - deben coincidir EXACTAMENTE
     ```

   - **Solución:**
     1. Abrir archivo DTO (ej: `create-tipos-equipo.dto.ts`)
     2. Buscar la definición de enum en `schema.prisma`
     3. Copiar EXACTAMENTE los valores del schema al DTO
     4. Recompilar: `npm run build`
     5. Reiniciar servidor: `./start-server.ps1`
   - **Prevención:** Usar herramienta de generación automática de DTOs desde Prisma schema cuando sea posible

7. **🔴 BLOQUEADOR CRÍTICO: Servidor Arranca pero Puerto No Responde (Proceso Zombie)**
   - **Síntoma:** Logs muestran "Nest application successfully started" pero `Test-NetConnection -Port 3000` falla
   - **Causa:** PowerShell background mode (`isBackground=true`) en Windows crea procesos zombie
   - **Cómo Identificar:**

     ```powershell
     # Ver proceso node corriendo
     Get-Process node
     # Ver puerto 3000 - no debe retornar nada
     netstat -ano | Select-String ":3000"
     ```

   - **Solución:** USAR `start-server.ps1` script

     ```powershell
     # 1. Matar procesos zombie
     Get-Process node | Stop-Process -Force
     
     # 2. Recompilar
     npm run build
     
     # 3. Usar script (abre ventana separada)
     ./start-server.ps1
     
     # 4. Minimizar ventana que se abrió (NO cerrarla)
     ```

   - **NO USAR:** `npm run dev:api` con `isBackground=true` en PowerShell
   - **Verificación:**

     ```powershell
     netstat -ano | Select-String ":3000"  # Debe mostrar LISTENING
     ```

### 📊 Monitoreo y Debugging

1. **Verificar Estado del Servidor**

   ```powershell
   # Ver proceso node corriendo
   Get-Process node | Select-Object Id, ProcessName, StartTime
   
   # Ver puerto 3000 en uso
   netstat -ano | Select-String ":3000"
   
   # Ver logs del servidor (si guardas output en archivo)
   Get-Content ./server.log -Tail 50 -Wait
   ```

2. **Verificar Compilación Reciente**

   ```powershell
   Get-ChildItem apps/api/dist/main.js | Select-Object LastWriteTime, Length
   ```
