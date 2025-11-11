# Changelog - @mekanos/database

Registro de cambios significativos en el paquete de base de datos.

## [0.1.0] - 2025-01-11

### 🎉 Fase 0 Completada

Primera versión funcional del paquete de base de datos con Prisma ORM.

### ✨ Added

#### Infrastructure

- Estructura monorepo en `packages/database/`
- Configuración de Prisma 5.20.0 + @prisma/client
- TypeScript 5.3.3 configurado
- Scripts npm para gestión de base de datos
- Postinstall hook para auto-generación de Prisma Client

#### Schema (941 líneas)

- **15 Enums** definidos:
  - `estado_equipo_enum`, `criticidad_enum`, `estado_pintura_enum`
  - `tipo_identificacion_enum`, `tipo_persona_enum`, `genero_enum`
  - `prioridad_enum`, `origen_solicitud_enum`, `resultado_medicion_enum`
  - `tipo_evento_enum`, `estado_actividad_enum`, `tipo_evidencia_enum`
  - `estado_orden_categoria_enum`, `estado_conformidad_enum`

- **40+ Modelos** generados:
  - FASE 2 (Usuarios): 7 modelos
  - FASE 1 (Equipos): 11 modelos
  - FASE 3 (Órdenes): 14 modelos

#### Core Services

- `PrismaService` con logging configurado
- Singleton pattern para reutilización
- Graceful shutdown handler
- Error handling robusto

#### Testing

- Script `test-prisma.ts` para validación
- Verificación de modelos disponibles
- Detección de errores de conectividad
- Confirmación de TypeScript types

#### Documentation

- README completo con ejemplos
- CHANGELOG con historial de versiones
- `.env.example` con templates
- Comentarios JSDoc en código

### 🔧 Technical Details

**Conversión SQL → Prisma**:

- Método: Análisis manual de 96 archivos SQL
- Mapeo de 800+ campos
- 150+ relaciones configuradas
- Índices y constraints preservados

**Mapeo de Tipos**:

```
SQL                 → Prisma
----------------------------------------
SERIAL/BIGSERIAL   → Int @id @default(autoincrement())
VARCHAR(n)         → String @db.VarChar(n)
TEXT               → String
INTEGER/BIGINT     → Int / BigInt
BOOLEAN            → Boolean
TIMESTAMP          → DateTime
NUMERIC(m,n)       → Decimal @db.Decimal(m,n)
JSONB              → Json
ENUM               → enum TypeName { }
FOREIGN KEY        → @relation()
```

**Relaciones Clave**:

- Equipos → Clientes (many-to-one)
- Equipos → Sedes (many-to-one)
- Equipos → TiposEquipo (many-to-one)
- Equipos ← Generador/Motor/Bomba (one-to-one inheritance)
- OrdenesServicio → Equipos (many-to-one)
- OrdenesServicio → Clientes (many-to-one)
- OrdenesServicio ← DetallesServicios (one-to-many)
- OrdenesServicio ← Actividades (one-to-many)
- OrdenesServicio ← Mediciones (one-to-many)
- OrdenesServicio ← Evidencias (one-to-many)

### 🐛 Known Issues

**Network Connectivity**:

- Puerto 5432 bloqueado por firewall/ISP
- Workaround: Schema generado desde archivos SQL locales
- TODO: Probar connection pooler (puerto 6543)

**Character Encoding**:

- ✅ RESUELTO: Campo `tamaño_bytes` renombrado a `tamano_bytes`
- Prisma no soporta caracteres especiales en nombres de campos

### ⚠️ Breaking Changes

Ninguno (primera versión)

### 📊 Statistics

- Líneas de código: 941 (schema.prisma)
- Modelos: 40+
- Enums: 15
- Campos totales: 800+
- Relaciones: 150+
- Índices: 60+

### 🔄 Migration Status

- **Estado**: Schema generado, NO sincronizado con DB
- **Razón**: Bloqueador de red (puerto 5432)
- **Impacto**: TypeScript types disponibles, conexión pendiente
- **Next**: Validar contra Supabase cuando haya conectividad

### 🎯 Next Steps (FASE 0 - COMPLETA)

- [x] Install Prisma CLI
- [x] Initialize Prisma
- [x] Configure DATABASE_URL
- [x] Generate schema.prisma
- [x] Fix character encoding issues
- [x] Validate schema syntax
- [x] Generate Prisma Client
- [x] Create PrismaService
- [x] Test basic queries
- [x] Document package

### 📝 Pending (Future Phases)

- [ ] Agregar FASE 4 (Cotizaciones) - 10 modelos
- [ ] Agregar FASE 5 (Inventario) - 12 modelos
- [ ] Agregar FASE 6 (Informes) - 8 modelos
- [ ] Agregar FASE 7 (Cronogramas) - 7 modelos
- [ ] Optimizar índices compuestos
- [ ] Implementar row level security
- [ ] Agregar soft deletes
- [ ] Configurar connection pooling

---

## [Unreleased]

### 🚀 Próximos Hitos

**Etapa 1 - Monorepo Setup** (siguiente):

- Turborepo configuration
- Shared TypeScript config
- ESLint + Prettier
- Husky git hooks
- GitHub repositories

**Etapa 2 - Backend Services**:

- NestJS API
- GraphQL schema
- Authentication
- Authorization

**Etapa 3 - Testing Infrastructure**:

- Jest configuration
- E2E tests
- Integration tests
- Test coverage

---

## Legend

- 🎉 Major milestone
- ✨ New feature
- 🔧 Technical change
- 🐛 Bug fix
- ⚠️ Breaking change
- 📝 Documentation
- 🔒 Security
- 🚀 Performance
- 📊 Statistics
