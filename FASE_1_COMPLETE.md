# FASE 1: AuthService - COMPLETADA ✅

**Fecha**: 2025-11-13  
**Duración**: ~2 horas  
**Estado**: 100% FUNCIONAL

---

## 🎯 Objetivo

Corregir AuthService para que funcione con el schema real de Supabase, reemplazando MockPrismaService por conexión real.

---

## ✅ Correcciones Aplicadas

### 1. Schema Mismatches (apps/api/src/auth/auth.service.ts)

| Componente | Antes (Mock) | Después (Real) |
|------------|--------------|----------------|
| **Service** | `MockPrismaService` | `PrismaService` |
| **PK Field** | `id` | `id_usuario` |
| **State Field** | `activo` (boolean) | `estado` (enum) |
| **State Check** | `!usuario.activo` | `usuario.estado !== 'ACTIVO'` |
| **Password** | `passwordHash` | `password_hash` |
| **Relation** | `include: { personas: true }` | `include: { persona: true }` |
| **Access** | `usuario.personas?.nombre` | `usuario.persona?.nombre_completo` |

### 2. Dependency Injection (apps/api/src/auth/auth.module.ts)

```typescript
// ANTES:
providers: [AuthService, JwtStrategy, MockPrismaService]

// DESPUÉS:
imports: [PrismaModule],  // ← PrismaService provided by module
providers: [AuthService, JwtStrategy]
```

### 3. PrismaService Connection (apps/api/src/database/prisma.service.ts)

```typescript
// ANTES:
async onModuleInit() {
  // await this.$connect();  // ← Comentado
  console.log('⚠️  PrismaService: Conexión desactivada (red bloqueada)');
}

// DESPUÉS:
async onModuleInit() {
  await this.$connect();  // ✅ REACTIVADO
  console.log('✅ PrismaService: Conexión establecida con Supabase');
}
```

### 4. Environment Variables (apps/api/src/app.module.ts)

```typescript
// ANTES:
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: join(__dirname, '../../.env'),  // ❌ Ruta incorrecta
})

// DESPUÉS:
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: join(__dirname, '../.env'),  // ✅ CORREGIDO (dist/ → apps/api/.env)
})
```

**Razón**: `__dirname` en código compilado apunta a `dist/`, por lo que `../../.env` buscaba en `monorepo/.env` (no existe). La ruta correcta desde `dist/` es `../.env` → `apps/api/.env`.

### 5. JWT Secret Configuration (apps/api/src/auth/auth.service.ts)

```typescript
// ANTES:
this.jwtService.signAsync(payload, {
  secret: this.configService.get<string>('JWT_SECRET'),  // ❌ Sobrescribía config del módulo
  expiresIn: '15m',
})

// DESPUÉS:
this.jwtService.signAsync(payload, {
  expiresIn: '15m',  // ✅ Usa secret del JwtModule.registerAsync()
})
```

**Razón**: JwtModule ya está configurado con el secret en `auth.module.ts`. Pasar `secret` explícitamente en `signAsync()` sobrescribía la configuración del módulo. Para el **access_token**, no se pasa secret (usa el del módulo). Para el **refresh_token**, sí se pasa `JWT_REFRESH_SECRET` para usar un secret diferente.

### 6. Module Reactivation (apps/api/src/app.module.ts + tsconfig.json)

**tsconfig.json**:
```json
{
  "exclude": [
    // "src/auth/**",  ← ELIMINADO - AuthModule ahora compila
    "src/actividades-orden/**",
    // ... 57 other modules
  ]
}
```

**app.module.ts**:
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({...}),
    PrismaModule,
    HealthModule,
    AuthModule,  // ✅ REACTIVADO
  ],
})
```

### 7. Controller Cleanup (apps/api/src/auth/auth.controller.ts)

**Eliminado**:
```typescript
@Get('mock-users')  // ← Endpoint que llamaba a getMockUsers() (no existe)
async getMockUsers() {
  return { users: this.authService.getMockUsers() };
}
```

---

## 📦 Seed User Created

**Archivo**: `packages/database/prisma/seed.ts`

**Credenciales de Admin**:
```
Email: admin@mekanos.com
Password: Admin123!
Username: admin
Estado: ACTIVO
```

**Ejecución**:
```bash
cd packages/database
pnpm db:seed
```

**Output**:
```
✅ Persona creada: Admin Mekanos (ID: 1)
✅ Usuario creado: admin@mekanos.com (ID: 1)
🎉 Seed completado exitosamente!
```

---

## 🧪 Testing Results

### Login Endpoint - 100% FUNCIONAL ✅

**Request**:
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@mekanos.com",
  "password": "Admin123!"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@mekanos.com",
    "nombre": "Admin Mekanos",
    "rol": "USER"
  }
}
```

### Validation Tests ✅

| Test | Status | Details |
|------|--------|---------|
| User exists in DB | ✅ | check-user.ts confirmed |
| Estado = ACTIVO | ✅ | Enum value validated |
| Password hash valid | ✅ | bcrypt.compare() passed |
| JWT secrets loaded | ✅ | test-jwt.ts confirmed |
| Persona relation | ✅ | nombre_completo retrieved |
| Access token generated | ✅ | 15min expiration |
| Refresh token generated | ✅ | 7d expiration |

---

## 📊 Compilation Status

```bash
$ pnpm --filter @mekanos/api build

> @mekanos/api@0.1.0 build
> nest build

webpack 5.97.1 compiled successfully in 6033 ms
```

**TypeScript Errors**: 0 ❌  
**Modules Excluded**: 57 (sin Auth)

---

## 🚀 Server Status

```bash
$ pnpm --filter @mekanos/api dev

[Nest] 5692  - 13/11/2025, 10:53:28 a.m.   LOG [NestFactory] Starting Nest application...
[Nest] 5692  - 13/11/2025, 10:53:28 a.m.   LOG [InstanceLoader] AuthModule dependencies initialized +2ms
✅ PrismaService: Conexión establecida con Supabase
[Nest] 5692  - 13/11/2025, 10:53:28 a.m.   LOG [NestApplication] Nest application successfully started +1174ms
[Nest] 5692  - 13/11/2025, 10:53:28 a.m.   LOG [Bootstrap] 🚀 Mekanos API running on: http://localhost:3000/api
```

---

## 🐛 Issues Resolved

### Issue 1: Connection Disabled
**Error**: `⚠️ PrismaService: Conexión desactivada (red bloqueada)`  
**Root Cause**: `$connect()` comentado en `onModuleInit()`  
**Solution**: Descomentado `await this.$connect()`

### Issue 2: JWT Secret Undefined
**Error**: `Error: secretOrPrivateKey must have a value`  
**Root Cause**: 
1. `.env` path incorrecto (`../../.env` instead of `../.env`)
2. Sobrescritura del secret en `signAsync()` con `configService.get()` que retornaba `undefined`

**Solution**: 
1. Corregido `envFilePath` en ConfigModule
2. Removido `secret` parameter de `signAsync()` para access_token (usa el del módulo)

### Issue 3: Relation Name Mismatch
**Error**: `Property 'personas' does not exist on type 'usuarios'`  
**Root Cause**: Schema define relación como `persona` (singular), no `personas`  
**Solution**: Cambiado a `include: { persona: true }`

---

## 📝 Lessons Learned

1. **Environment Path**: En código compilado, `__dirname` apunta a `dist/`, no a `src/`
2. **JwtModule Config**: No sobrescribir el `secret` en `signAsync()` si ya está en `JwtModule.registerAsync()`
3. **Relation Names**: En Prisma, el nombre de la relación (`persona`) puede diferir del nombre de la tabla (`personas`)
4. **Connection Lifecycle**: `onModuleInit()` debe ejecutar `$connect()` explícitamente
5. **Debugging Strategy**: Logs detallados paso a paso identifican el punto exacto de falla

---

## 🎯 Next Phase

**FASE 2: Equipos Module** - Corrección de schema mismatches y activación de CRUD endpoints.

---

## 📚 Files Modified (Total: 8)

1. `apps/api/src/auth/auth.service.ts` - Schema corrections + JWT fix
2. `apps/api/src/auth/auth.module.ts` - Dependency injection
3. `apps/api/src/auth/auth.controller.ts` - Removed mock endpoint
4. `apps/api/src/app.module.ts` - envFilePath correction + AuthModule reactivation
5. `apps/api/src/database/prisma.service.ts` - Connection activation
6. `apps/api/tsconfig.json` - Removed Auth exclusion
7. `packages/database/prisma/seed.ts` - Admin user creation
8. `packages/database/package.json` - Seed script configuration

---

**Autor**: GitHub Copilot (Claude Sonnet 4.5)  
**Validado**: ✅ 200 OK response con tokens JWT válidos
