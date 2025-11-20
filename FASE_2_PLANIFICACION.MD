# 📋 PLANIFICACIÓN FASE 2: USUARIOS Y AUTENTICACIÓN

**Fecha:** 19 de Noviembre de 2025 - 9:30 PM  
**Estado:** 🚀 EN DESARROLLO  
**Prerrequisito:** ✅ FASE 1 COMPLETADA AL 100% (8 Tablas - CRUD Validado)

---

## ⚠️ BLOQUEANTES CRÍTICOS A EVITAR (Lecciones FASE 1)

### 🔴 BLOQUEANTE #1: Servidor Detenido Durante Desarrollo

**Causa:** Ejecutar comandos en terminal donde corre el servidor  
**Prevención:**  

- ✅ Minimizar terminal del servidor (NO cerrar)
- ✅ Usar terminal alternativa para todos los comandos
- ✅ Verificar `netstat -ano | Select-String ":3000"` antes de cada operación

### 🔴 BLOQUEANTE #2: Enums DTO ≠ Base de Datos

**Causa:** DTOs con valores enum que no existen en schema.prisma  
**Prevención:**  

- ✅ SIEMPRE leer `SUPABASE.MD` o schema.prisma ANTES de crear DTOs
- ✅ Copiar enums EXACTAMENTE como están en la base de datos
- ✅ Validar con error 400 si hay discrepancia (el error lista valores correctos)

### 🔴 BLOQUEANTE #3: Decorator @Public() Desactiva JWT

**Causa:** `@Public()` anula `JwtAuthGuard`, campos creado_por quedan NULL  
**Prevención:**  

- ✅ NO usar `@Public()` en controllers que requieren autenticación
- ✅ SIEMPRE agregar `@UseGuards(JwtAuthGuard, RolesGuard)`
- ✅ SIEMPRE agregar `@CurrentUser('id') userId: number` en POST/PUT

### 🔴 BLOQUEANTE #4: Nombres de Campos DTO ≠ Schema

**Causa:** Request body usa nombres diferentes a los definidos en Prisma  
**Prevención:**  

- ✅ Leer schema.prisma línea por línea ANTES de crear DTO
- ✅ Copiar nombres de campos EXACTAMENTE como aparecen
- ✅ Ejemplo: `potencia_kw` (correcto) vs `potencia_activa_kw` (incorrecto)

### 🔴 BLOQUEANTE #5: Check Constraints No Validados

**Causa:** Request body no cumple constraints de base de datos (PostgreSQL error 23514)  
**Prevención:**  

- ✅ Identificar ALL check constraints en schema ANTES de implementar
- ✅ Validar en DTOs o repositorios ANTES de enviar a Prisma
- ✅ Ejemplos comunes: precios, unicidad, campos mutuamente excluyentes

### 🔴 BLOQUEANTE #6: Token JWT Expirado

**Causa:** Token válido por 15 minutos, desarrollo largo sin renovar  
**Prevención:**  

- ✅ Renovar token cada 10 minutos durante desarrollo
- ✅ Guardar token en `$global:token` para reuso
- ✅ Manejar error 401 con renovación automática

### 🔴 BLOQUEANTE #7: Foreign Keys No Validadas

**Causa:** Intentar crear registro con FK a ID inexistente  
**Prevención:**  

- ✅ GET endpoint relacionado ANTES de POST (validar IDs existen)
- ✅ Usar IDs de registros creados en FASE 1 cuando sea posible
- ✅ Crear registros dependientes en orden lógico (personas → usuarios)

### 🟡 PRÁCTICA RECOMENDADA: Validación Exhaustiva Pre-Ejecución

**Checklist antes de cada POST:**

1. ✅ Leer schema.prisma para tabla objetivo
2. ✅ Identificar campos requeridos (non-nullable)
3. ✅ Identificar enums y copiar valores exactos
4. ✅ Identificar check constraints
5. ✅ Identificar foreign keys y validar IDs
6. ✅ Crear DTO con validaciones class-validator
7. ✅ Verificar servidor corriendo (`netstat`)
8. ✅ Verificar token válido (renovar si es necesario)

---

## 🎯 OBJETIVO FASE 2

Implementar el sistema completo de gestión de usuarios, roles, permisos y autenticación JWT, integrando con las 16 tablas de la fase de usuarios.

---

## 📊 ESTRUCTURA DE TABLAS FASE 2 (16 tablas)

### Grupo 1: Core Usuarios (4 tablas)

1. **personas** - Datos base de personas (físicas/jurídicas)
2. **usuarios** - Cuentas de acceso al sistema
3. **empleados** - Personal de la empresa
4. **contactos_adicionales** - Contactos secundarios

### Grupo 2: Entidades Externas (3 tablas)

5. **clientes** - Empresas que contratan servicios
6. **sedes_cliente** - Ubicaciones de clientes
7. **proveedores** - Empresas que suministran productos/servicios

### Grupo 3: Certificaciones y Firmas (3 tablas)

8. **certificaciones_tecnicas** - Certificaciones de técnicos
9. **firmas_administrativas** - Firmas para documentos administrativos
10. **firmas_digitales** - Firmas digitales para documentos técnicos

### Grupo 4: Seguridad y Roles (6 tablas)

11. **roles** - Roles del sistema (ADMIN, TECNICO, etc.)
12. **permisos** - Permisos granulares (crear_equipo, editar_orden, etc.)
13. **roles_permiso** - Relación N:M roles-permisos
14. **usuarios_roles** - Relación N:M usuarios-roles
15. **tipos_enums** (compartido) - Enums para tipos de persona, identificación, etc.
16. **sesiones_usuario** (si existe) - Control de sesiones activas

---

## 🔍 ANÁLISIS PRELIMINAR

### Tablas Ya Implementadas

- ✅ **usuarios** - Ya tiene endpoint POST /api/auth/login (validado)
- ✅ **roles** - Probablemente implementado parcialmente
- ✅ **permisos** - Probablemente implementado parcialmente

### Tablas Por Implementar

- ⏭️ **personas** - Base fundamental para usuarios, empleados, clientes
- ⏭️ **empleados** - Extiende personas, vincula con certificaciones
- ⏭️ **clientes** - Gestión de clientes empresariales
- ⏭️ **sedes_cliente** - Ubicaciones donde hay equipos
- ⏭️ **proveedores** - Para órdenes de compra e inventario
- ⏭️ **contactos_adicionales** - Personas asociadas a clientes/sedes
- ⏭️ **certificaciones_tecnicas** - Acreditaciones de técnicos
- ⏭️ **firmas_administrativas** - Para cotizaciones y facturas
- ⏭️ **firmas_digitales** - Para informes técnicos
- ⏭️ **roles_permiso** - Configuración flexible de permisos
- ⏭️ **usuarios_roles** - Asignación de roles a usuarios

---

## 🎯 PRIORIDADES DE IMPLEMENTACIÓN

### PRIORIDAD ALTA (Core)

1. **personas** - Tabla base, requerida por todas las entidades
2. **empleados** - Necesario para asociar usuarios con personal técnico
3. **clientes** - Requerido para equipos (FK id_cliente)
4. **sedes_cliente** - Requerido para equipos (FK id_sede)

### PRIORIDAD MEDIA (Seguridad)

5. **roles_permiso** - Completar sistema de permisos
6. **usuarios_roles** - Asignación flexible de roles
7. **contactos_adicionales** - Contactos de sedes/clientes

### PRIORIDAD BAJA (Extensiones)

8. **proveedores** - Para FASE 5 (Inventario)
9. **certificaciones_tecnicas** - Validación de técnicos
10. **firmas_administrativas** - Para cotizaciones
11. **firmas_digitales** - Para informes técnicos

---

## 📝 ENDPOINTS REQUERIDOS POR TABLA

### 1. Personas (PRIORIDAD ALTA)

**Modelo:**

- id_persona (PK)
- tipo_persona (ENUM: FISICA, JURIDICA)
- numero_identificacion, tipo_identificacion
- nombre_completo, nombre_comercial
- telefono, email, direccion
- activo, creado_por, fecha_creacion

**Endpoints:**

- `GET /api/personas` - Listar con filtros (tipo, activo, búsqueda)
- `GET /api/personas/:id` - Detalle persona
- `POST /api/personas` - Crear persona (creado_por desde JWT)
- `PUT /api/personas/:id` - Actualizar (modificado_por desde JWT)
- `DELETE /api/personas/:id` - Desactivar (soft delete)

**Relaciones:**

- 1:N con usuarios, empleados, clientes, proveedores

---

### 2. Empleados (PRIORIDAD ALTA)

**Modelo:**

- id_empleado (PK)
- id_persona (FK → personas)
- id_usuario (FK → usuarios, nullable)
- cargo, area
- fecha_ingreso, fecha_salida
- activo, creado_por, fecha_creacion

**Endpoints:**

- `GET /api/empleados` - Listar con filtros
- `GET /api/empleados/:id` - Detalle empleado con persona y usuario
- `POST /api/empleados` - Crear empleado
- `PUT /api/empleados/:id` - Actualizar
- `DELETE /api/empleados/:id` - Desactivar

**Casos de Uso:**

- Vincular usuario con empleado para firma de informes
- Asignar técnicos a órdenes de servicio
- Consultar certificaciones de técnicos

---

### 3. Clientes (PRIORIDAD ALTA)

**Modelo:**

- id_cliente (PK)
- id_persona (FK → personas)
- razon_social, nit
- sector_economico
- condiciones_pago, dias_credito
- activo, creado_por, fecha_creacion

**Endpoints:**

- `GET /api/clientes` - Listar con filtros
- `GET /api/clientes/:id` - Detalle cliente con persona y sedes
- `POST /api/clientes` - Crear cliente
- `PUT /api/clientes/:id` - Actualizar
- `DELETE /api/clientes/:id` - Desactivar

**Relaciones:**

- 1:N con sedes_cliente
- 1:N con equipos (FK: id_cliente)
- 1:N con ordenes_servicio

---

### 4. Sedes Cliente (PRIORIDAD ALTA)

**Modelo:**

- id_sede (PK)
- id_cliente (FK → clientes)
- nombre_sede, codigo_sede
- direccion, ciudad, pais
- telefono, email_contacto
- activo, creado_por, fecha_creacion

**Endpoints:**

- `GET /api/sedes` - Listar con filtros
- `GET /api/sedes/:id` - Detalle sede
- `GET /api/clientes/:id_cliente/sedes` - Sedes de un cliente
- `POST /api/sedes` - Crear sede
- `PUT /api/sedes/:id` - Actualizar
- `DELETE /api/sedes/:id` - Desactivar

**Relaciones:**

- 1:N con equipos (FK: id_sede)
- 1:N con ordenes_servicio

---

### 5. Roles y Permisos (PRIORIDAD MEDIA)

**Modelo Roles:**

- id_rol (PK)
- codigo_rol (ej: ADMIN, TECNICO)
- nombre_rol
- descripcion
- activo

**Modelo Permisos:**

- id_permiso (PK)
- codigo_permiso (ej: equipos.crear)
- modulo (ej: EQUIPOS, ORDENES)
- accion (ej: CREATE, READ, UPDATE)
- descripcion

**Modelo Roles_Permiso:**

- id_rol (FK)
- id_permiso (FK)
- activo

**Modelo Usuarios_Roles:**

- id_usuario (FK)
- id_rol (FK)
- fecha_asignacion, fecha_revocacion
- activo

**Endpoints:**

- `GET /api/roles` - Listar roles
- `GET /api/roles/:id/permisos` - Permisos de un rol
- `POST /api/roles` - Crear rol
- `PUT /api/roles/:id` - Actualizar rol
- `POST /api/roles/:id/permisos` - Asignar permisos
- `DELETE /api/roles/:id/permisos/:id_permiso` - Revocar permiso
- `GET /api/usuarios/:id/roles` - Roles de un usuario
- `POST /api/usuarios/:id/roles` - Asignar rol
- `DELETE /api/usuarios/:id/roles/:id_rol` - Revocar rol

---

## 🔐 CONSIDERACIONES DE SEGURIDAD

### JWT y Autenticación

- ✅ Ya implementado en FASE 1
- Todos los endpoints POST/PUT/DELETE requieren JWT
- Campo `creado_por` extraído de JWT en todos los POST
- Campo `modificado_por` extraído de JWT en todos los PUT

### Guards y Decoradores

- `@UseGuards(JwtAuthGuard)` - Requerido en todos los controladores
- `@UseGuards(RolesGuard)` - Para endpoints con permisos específicos
- `@Roles('ADMIN', 'TECNICO')` - Restricción por rol
- `@CurrentUser('id')` - Extrae userId del JWT
- **NO usar** `@Public()` - Desactiva autenticación

### Validaciones

- DTOs con class-validator para todos los endpoints
- Enums para campos con valores predefinidos
- Unique constraints en códigos y identificaciones
- Foreign keys validadas en repositorios

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Por cada tabla

- [ ] Crear módulo NestJS con CQRS
- [ ] Definir DTOs (create, update, query)
- [ ] Implementar comandos (crear, actualizar, eliminar)
- [ ] Implementar queries (obtener, listar)
- [ ] Crear handlers para comandos y queries
- [ ] Implementar repositorio Prisma
- [ ] Crear controlador con guards JWT
- [ ] Agregar validaciones con class-validator
- [ ] Probar POST con JWT (creado_por)
- [ ] Probar PUT con JWT (modificado_por)
- [ ] Probar GET con filtros
- [ ] Documentar en CRUD_ENDPOINTS_EXITOSOS.MD

---

## 🚀 PLAN DE EJECUCIÓN

### Semana 1: Core Personas y Clientes

- Día 1-2: Implementar tabla `personas`
- Día 3-4: Implementar tabla `clientes`
- Día 5: Implementar tabla `sedes_cliente`

### Semana 2: Empleados y Contactos

- Día 1-2: Implementar tabla `empleados`
- Día 3: Implementar tabla `contactos_adicionales`
- Día 4-5: Probar integración con equipos

### Semana 3: Roles y Permisos

- Día 1-2: Completar tabla `roles_permiso`
- Día 3-4: Completar tabla `usuarios_roles`
- Día 5: Probar sistema de permisos end-to-end

### Semana 4: Extensiones y Validación

- Día 1: Implementar `proveedores`
- Día 2: Implementar `certificaciones_tecnicas`
- Día 3: Implementar `firmas_administrativas` y `firmas_digitales`
- Día 4-5: Testing completo FASE 2

---

## 🎯 CRITERIOS DE ÉXITO FASE 2

- ✅ Todas las 16 tablas implementadas
- ✅ JWT funcionando en todos los endpoints
- ✅ Sistema de roles y permisos operativo
- ✅ Clientes y sedes vinculados con equipos
- ✅ Empleados vinculados con usuarios
- ✅ Documentación completa en archivo maestro
- ✅ Zero bugs críticos pendientes

---

## 📚 REFERENCIAS

- Schema SQL: `BASE_DATOS/FASE 2 - USUARIOS/*.sql`
- Patrones validados: `monorepo/CRUD_ENDPOINTS_EXITOSOS.MD`
- Bugs conocidos: Sección "BUGS CRÍTICOS RESUELTOS" en documentación

---

**Siguiente Paso:** Iniciar implementación de tabla `personas` como fundamento de FASE 2.
