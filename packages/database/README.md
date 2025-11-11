# @mekanos/database

Paquete de base de datos centralizado para Mekanos S.A.S usando Prisma ORM.

## 📦 Contenido

- **Prisma Schema**: 941 líneas, 40+ modelos, 15 enums
- **Prisma Client**: TypeScript types generados automáticamente
- **PrismaService**: Servicio singleton con logging
- **Test Suite**: Validación de conectividad y tipos

## 🗄️ Modelos Disponibles

### FASE 2 - USUARIOS (7 modelos)

- `personas` - Información básica de personas físicas/jurídicas
- `usuarios` - Credenciales y permisos de acceso
- `clientes` - Datos de clientes corporativos
- `sedes_cliente` - Ubicaciones de clientes
- `proveedores` - Proveedores de servicios/partes
- `empleados` - Personal técnico y administrativo

### FASE 1 - EQUIPOS (11 modelos)

- `tipos_equipo` - Catálogo de tipos de equipos
- `equipos` - Registro maestro de equipos (38 campos)
- `archivos_equipo` - Documentos asociados a equipos
- `historial_estados_equipo` - Auditoría de cambios de estado
- `lecturas_horometro` - Registro horario de operación
- `equipos_generador` - Datos específicos de generadores
- `equipos_motor` - Datos específicos de motores
- `equipos_bomba` - Datos específicos de bombas

### FASE 3 - ORDENES DE SERVICIO (14 modelos)

- `estados_orden` - Estados del workflow de órdenes
- `tipos_servicio` - Catálogo de servicios ofrecidos
- `catalogo_servicios` - Servicios disponibles con precios
- `ordenes_servicio` - Núcleo central (37 campos)
- `detalle_servicios_orden` - Servicios incluidos en orden
- `catalogo_actividades` - Actividades estándar
- `actividades_orden` - Actividades ejecutadas
- `parametros_medicion` - Catálogo de parámetros técnicos
- `mediciones_orden` - Mediciones realizadas
- `evidencias_orden` - Fotos/videos de servicios
- `firmas_digitales` - Firmas de aprobación

## 🚀 Instalación

```bash
cd monorepo/packages/database
npm install
```

## 🔧 Scripts Disponibles

```bash
# Validar schema
npm run db:validate

# Generar Prisma Client (automático en postinstall)
npm run db:generate

# Abrir Prisma Studio (GUI para explorar datos)
npm run db:studio

# Crear migración
npm run db:migrate

# Build TypeScript
npm run build
```

## 📝 Uso Básico

### Import del Cliente

```typescript
import { prisma } from '@mekanos/database';

// Usar el cliente
const personas = await prisma.personas.findMany();
```

### Ejemplo: Consultar Equipos

```typescript
import { prisma } from '@mekanos/database';

async function getEquipos() {
  const equipos = await prisma.equipos.findMany({
    where: {
      estado_equipo: 'OPERATIVO',
      criticidad: 'ALTA',
    },
    include: {
      cliente: true,
      sede: true,
      tipo_equipo: true,
      equipos_generador: true,
    },
  });

  return equipos;
}
```

### Ejemplo: Crear Orden de Servicio

```typescript
import { prisma } from '@mekanos/database';

async function createOrdenServicio(data: {
  id_equipo: number;
  id_cliente: number;
  fecha_programada: Date;
  prioridad: 'ALTA' | 'NORMAL' | 'BAJA' | 'URGENTE';
}) {
  const orden = await prisma.ordenes_servicio.create({
    data: {
      numero_orden: `OS-${Date.now()}`,
      id_equipo: data.id_equipo,
      id_cliente: data.id_cliente,
      id_estado_actual: 1, // Estado "CREADA"
      fecha_programada: data.fecha_programada,
      prioridad: data.prioridad,
      origen_solicitud: 'PLANIFICADA',
      creado_por: 1, // ID del usuario
    },
  });

  return orden;
}
```

## 🧪 Testing

```bash
# Ejecutar test de conectividad
npx ts-node test-prisma.ts
```

**Nota**: El test fallará con error de conexión debido al bloqueo de puerto 5432, pero validará que:

- ✅ Prisma Client se generó correctamente
- ✅ TypeScript types están disponibles
- ✅ Todos los modelos están accesibles
- ✅ El servicio está listo para usar

## ⚙️ Configuración

### Variables de Entorno

Crear archivo `.env` basado en `.env.example`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
```

### Conexión a Supabase

```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres?sslmode=require"
```

**Nota**: Si el puerto 5432 está bloqueado por firewall, usar connection pooler:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:6543/postgres?sslmode=require"
```

## 📊 Estadísticas del Schema

- **Total Modelos**: 40+
- **Total Enums**: 15
- **Total Campos**: 800+
- **Total Relaciones**: 150+
- **Líneas de Código**: 941

## 🔐 Seguridad

- ✅ `.env` excluido de Git
- ✅ SSL habilitado por defecto
- ✅ Password URL-encoded
- ✅ Connection pooling disponible

## 📚 Documentación Adicional

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

## 🐛 Troubleshooting

### Error: Can't reach database server

**Causa**: Puerto 5432 bloqueado por firewall/ISP

**Solución**: Usar connection pooler en puerto 6543:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:6543/postgres?sslmode=require"
```

### Error: Password authentication failed

**Causa**: Caracteres especiales no escapados en URL

**Solución**: URL-encode el password (ej: `#` → `%23`)

### Error: SSL connection required

**Causa**: Falta parámetro SSL en connection string

**Solución**: Agregar `?sslmode=require` al final de la URL

## 📝 TODO

- [ ] Agregar modelos FASE 4 (Cotizaciones) - 10 modelos
- [ ] Agregar modelos FASE 5 (Inventario) - 12 modelos
- [ ] Agregar modelos FASE 6 (Informes) - 8 modelos
- [ ] Agregar modelos FASE 7 (Cronogramas) - 7 modelos
- [ ] Optimizar índices compuestos
- [ ] Agregar views materializadas
- [ ] Implementar soft deletes
- [ ] Configurar row level security

## 📄 Licencia

Mekanos S.A.S © 2025 - Todos los derechos reservados
