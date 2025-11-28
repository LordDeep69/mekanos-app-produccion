import { PrismaClient } from '@prisma/client';

// Usar el pooler (6543) que funciona correctamente
process.env.DATABASE_URL = "postgresql://postgres.nemrrkaobdlwehfnetxs:Mekanos2025%23sas@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=30";

const prisma = new PrismaClient({ log: ['error', 'warn'] });

/**
 * Seed Roles y Permisos - Sistema RBAC MEKANOS
 * 
 * Este script crea:
 * - 4 Roles base del sistema
 * - 46 Permisos granulares organizados por módulo
 * - Asignación inicial de permisos a roles
 * 
 * Ejecutar: npx ts-node src/database/seeds/seed-rbac.ts
 */

async function main() {
  console.log('🚀 Iniciando seed de Roles y Permisos...\n');

  // 1. Crear Roles Base
  console.log('📋 Creando Roles Base...');
  
  const roles = await Promise.all([
    prisma.roles.upsert({
      where: { codigo_rol: 'ADMIN' },
      update: {},
      create: {
        codigo_rol: 'ADMIN',
        nombre_rol: 'Administrador',
        descripcion: 'Acceso completo al sistema - Gestión total',
        nivel_jerarquia: 10,
        es_rol_sistema: true,
        activo: true,
        creado_por: 1, // Usuario admin
      },
    }),
    prisma.roles.upsert({
      where: { codigo_rol: 'TECNICO_SENIOR' },
      update: {},
      create: {
        codigo_rol: 'TECNICO_SENIOR',
        nombre_rol: 'Técnico Senior',
        descripcion: 'Técnico con permisos avanzados de gestión de órdenes',
        nivel_jerarquia: 7,
        es_rol_sistema: true,
        activo: true,
        creado_por: 1,
      },
    }),
    prisma.roles.upsert({
      where: { codigo_rol: 'ASESOR_COMERCIAL' },
      update: {},
      create: {
        codigo_rol: 'ASESOR_COMERCIAL',
        nombre_rol: 'Asesor Comercial',
        descripcion: 'Gestión de cotizaciones, clientes y propuestas comerciales',
        nivel_jerarquia: 5,
        es_rol_sistema: true,
        activo: true,
        creado_por: 1,
      },
    }),
    prisma.roles.upsert({
      where: { codigo_rol: 'CLIENTE' },
      update: {},
      create: {
        codigo_rol: 'CLIENTE',
        nombre_rol: 'Cliente',
        descripcion: 'Acceso limitado a portal del cliente - Solo lectura',
        nivel_jerarquia: 1,
        es_rol_sistema: true,
        activo: true,
        creado_por: 1,
      },
    }),
  ]);

  console.log(`✅ ${roles.length} roles creados\n`);

  // 2. Crear Permisos Granulares (46 permisos)
  console.log('🔐 Creando Permisos Granulares...');

  const permisos = [
    // MÓDULO: EQUIPOS (8 permisos)
    { codigo: 'EQUIPOS_READ', nombre: 'Ver Equipos', modulo: 'EQUIPOS', descripcion: 'Visualizar información de equipos' },
    { codigo: 'EQUIPOS_CREATE', nombre: 'Crear Equipos', modulo: 'EQUIPOS', descripcion: 'Registrar nuevos equipos' },
    { codigo: 'EQUIPOS_UPDATE', nombre: 'Modificar Equipos', modulo: 'EQUIPOS', descripcion: 'Editar información de equipos' },
    { codigo: 'EQUIPOS_DELETE', nombre: 'Eliminar Equipos', modulo: 'EQUIPOS', descripcion: 'Desactivar equipos' },
    { codigo: 'EQUIPOS_EXPORT', nombre: 'Exportar Equipos', modulo: 'EQUIPOS', descripcion: 'Exportar listados de equipos' },
    { codigo: 'EQUIPOS_IMPORT', nombre: 'Importar Equipos', modulo: 'EQUIPOS', descripcion: 'Importar equipos masivamente' },
    { codigo: 'EQUIPOS_HISTORY', nombre: 'Historial Equipos', modulo: 'EQUIPOS', descripcion: 'Ver historial de cambios' },
    { codigo: 'EQUIPOS_FILES', nombre: 'Archivos Equipos', modulo: 'EQUIPOS', descripcion: 'Gestionar documentos de equipos' },

    // MÓDULO: ORDENES (10 permisos)
    { codigo: 'ORDENES_READ', nombre: 'Ver Órdenes', modulo: 'ORDENES', descripcion: 'Visualizar órdenes de servicio' },
    { codigo: 'ORDENES_CREATE', nombre: 'Crear Órdenes', modulo: 'ORDENES', descripcion: 'Generar nuevas órdenes' },
    { codigo: 'ORDENES_UPDATE', nombre: 'Modificar Órdenes', modulo: 'ORDENES', descripcion: 'Editar órdenes' },
    { codigo: 'ORDENES_DELETE', nombre: 'Cancelar Órdenes', modulo: 'ORDENES', descripcion: 'Cancelar órdenes de servicio' },
    { codigo: 'ORDENES_ASSIGN', nombre: 'Asignar Órdenes', modulo: 'ORDENES', descripcion: 'Asignar técnicos a órdenes' },
    { codigo: 'ORDENES_APPROVE', nombre: 'Aprobar Órdenes', modulo: 'ORDENES', descripcion: 'Aprobar órdenes completadas' },
    { codigo: 'ORDENES_EXECUTE', nombre: 'Ejecutar Órdenes', modulo: 'ORDENES', descripcion: 'Ejecutar órdenes en campo' },
    { codigo: 'ORDENES_REPORT', nombre: 'Reportar Actividades', modulo: 'ORDENES', descripcion: 'Registrar actividades ejecutadas' },
    { codigo: 'ORDENES_EVIDENCE', nombre: 'Subir Evidencias', modulo: 'ORDENES', descripcion: 'Subir fotos y evidencias' },
    { codigo: 'ORDENES_SIGNATURE', nombre: 'Firmar Órdenes', modulo: 'ORDENES', descripcion: 'Firmar digitalmente órdenes' },

    // MÓDULO: CLIENTES (6 permisos)
    { codigo: 'CLIENTES_READ', nombre: 'Ver Clientes', modulo: 'CLIENTES', descripcion: 'Visualizar información de clientes' },
    { codigo: 'CLIENTES_CREATE', nombre: 'Crear Clientes', modulo: 'CLIENTES', descripcion: 'Registrar nuevos clientes' },
    { codigo: 'CLIENTES_UPDATE', nombre: 'Modificar Clientes', modulo: 'CLIENTES', descripcion: 'Editar datos de clientes' },
    { codigo: 'CLIENTES_DELETE', nombre: 'Desactivar Clientes', modulo: 'CLIENTES', descripcion: 'Desactivar clientes' },
    { codigo: 'CLIENTES_CREDIT', nombre: 'Gestionar Crédito', modulo: 'CLIENTES', descripcion: 'Gestionar límites de crédito' },
    { codigo: 'CLIENTES_PORTAL', nombre: 'Gestionar Portal', modulo: 'CLIENTES', descripcion: 'Activar acceso a portal' },

    // MÓDULO: COTIZACIONES (8 permisos)
    { codigo: 'COTIZACIONES_READ', nombre: 'Ver Cotizaciones', modulo: 'COTIZACIONES', descripcion: 'Visualizar cotizaciones' },
    { codigo: 'COTIZACIONES_CREATE', nombre: 'Crear Cotizaciones', modulo: 'COTIZACIONES', descripcion: 'Generar cotizaciones' },
    { codigo: 'COTIZACIONES_UPDATE', nombre: 'Modificar Cotizaciones', modulo: 'COTIZACIONES', descripcion: 'Editar cotizaciones' },
    { codigo: 'COTIZACIONES_DELETE', nombre: 'Eliminar Cotizaciones', modulo: 'COTIZACIONES', descripcion: 'Eliminar borradores' },
    { codigo: 'COTIZACIONES_SEND', nombre: 'Enviar Cotizaciones', modulo: 'COTIZACIONES', descripcion: 'Enviar al cliente' },
    { codigo: 'COTIZACIONES_APPROVE', nombre: 'Aprobar Cotizaciones', modulo: 'COTIZACIONES', descripcion: 'Aprobar internamente' },
    { codigo: 'COTIZACIONES_CONVERT', nombre: 'Convertir Cotizaciones', modulo: 'COTIZACIONES', descripcion: 'Convertir a orden' },
    { codigo: 'COTIZACIONES_VERSION', nombre: 'Versionar Cotizaciones', modulo: 'COTIZACIONES', descripcion: 'Crear versiones' },

    // MÓDULO: INVENTARIO (6 permisos)
    { codigo: 'INVENTARIO_READ', nombre: 'Ver Inventario', modulo: 'INVENTARIO', descripcion: 'Consultar stock' },
    { codigo: 'INVENTARIO_CREATE', nombre: 'Crear Movimientos', modulo: 'INVENTARIO', descripcion: 'Registrar movimientos' },
    { codigo: 'INVENTARIO_ADJUST', nombre: 'Ajustar Inventario', modulo: 'INVENTARIO', descripcion: 'Realizar ajustes' },
    { codigo: 'INVENTARIO_TRANSFER', nombre: 'Transferir Stock', modulo: 'INVENTARIO', descripcion: 'Transferir entre bodegas' },
    { codigo: 'INVENTARIO_REPORTS', nombre: 'Reportes Inventario', modulo: 'INVENTARIO', descripcion: 'Generar reportes' },
    { codigo: 'INVENTARIO_PURCHASE', nombre: 'Órdenes de Compra', modulo: 'INVENTARIO', descripcion: 'Gestionar órdenes de compra' },

    // MÓDULO: INFORMES (4 permisos)
    { codigo: 'INFORMES_READ', nombre: 'Ver Informes', modulo: 'INFORMES', descripcion: 'Visualizar informes técnicos' },
    { codigo: 'INFORMES_CREATE', nombre: 'Crear Informes', modulo: 'INFORMES', descripcion: 'Generar informes técnicos' },
    { codigo: 'INFORMES_APPROVE', nombre: 'Aprobar Informes', modulo: 'INFORMES', descripcion: 'Aprobar y cerrar informes' },
    { codigo: 'INFORMES_EXPORT', nombre: 'Exportar Informes', modulo: 'INFORMES', descripcion: 'Exportar PDF y enviar' },

    // MÓDULO: CONFIGURACIÓN (4 permisos)
    { codigo: 'CONFIG_USERS', nombre: 'Gestionar Usuarios', modulo: 'CONFIGURACION', descripcion: 'Crear y editar usuarios' },
    { codigo: 'CONFIG_ROLES', nombre: 'Gestionar Roles', modulo: 'CONFIGURACION', descripcion: 'Gestionar roles y permisos' },
    { codigo: 'CONFIG_SYSTEM', nombre: 'Configuración Sistema', modulo: 'CONFIGURACION', descripcion: 'Configurar parámetros del sistema' },
    { codigo: 'CONFIG_BACKUP', nombre: 'Backups', modulo: 'CONFIGURACION', descripcion: 'Gestionar respaldos' },
  ];

  // Crear permisos en batches de 10 para evitar saturar el pooler
  const permisosCreados = [];
  const batchSize = 10;
  for (let i = 0; i < permisos.length; i += batchSize) {
    const batch = permisos.slice(i, i + batchSize);
    console.log(`  Procesando permisos ${i + 1}-${Math.min(i + batchSize, permisos.length)}...`);
    
    const batchResults = await Promise.all(
      batch.map((p) =>
        prisma.permisos.upsert({
          where: { codigo_permiso: p.codigo },
          update: {},
          create: {
            codigo_permiso: p.codigo,
            nombre_permiso: p.nombre,
            descripcion: p.descripcion,
            modulo: p.modulo,
            activo: true,
            creado_por: 1,
          },
        })
      )
    );
    permisosCreados.push(...batchResults);
  }

  console.log(`✅ ${permisosCreados.length} permisos creados\n`);

  // 3. Asignar permisos a roles
  console.log('🔗 Asignando permisos a roles...');

  const tecnicoRole = await prisma.roles.findUnique({ where: { codigo_rol: 'TECNICO_SENIOR' } });
  const asesorRole = await prisma.roles.findUnique({ where: { codigo_rol: 'ASESOR_COMERCIAL' } });
  const clienteRole = await prisma.roles.findUnique({ where: { codigo_rol: 'CLIENTE' } });

  if (!tecnicoRole || !asesorRole || !clienteRole) {
    throw new Error('Error: No se pudieron encontrar los roles creados');
  }

  // Admin: TODOS los permisos (wildcard ya asignado)
  // No necesita asignación explícita

  // Técnico Senior: Equipos, Órdenes, Inventario (lectura)
  const tecnicoPermisos = await prisma.permisos.findMany({
    where: {
      OR: [
        { modulo: 'EQUIPOS' },
        { modulo: 'ORDENES' },
        { codigo_permiso: 'INVENTARIO_READ' },
      ],
    },
  });

  await Promise.all(
    tecnicoPermisos.map((p) =>
      prisma.roles_permisos.upsert({
        where: {
          id_rol_id_permiso: {
            id_rol: tecnicoRole.id_rol,
            id_permiso: p.id_permiso,
          },
        },
        update: {},
        create: {
          id_rol: tecnicoRole.id_rol,
          id_permiso: p.id_permiso,
          asignado_por: 1,
        },
      })
    )
  );

  // Asesor Comercial: Clientes, Cotizaciones, Órdenes (read)
  const asesorPermisos = await prisma.permisos.findMany({
    where: {
      OR: [
        { modulo: 'CLIENTES' },
        { modulo: 'COTIZACIONES' },
        { codigo_permiso: 'ORDENES_READ' },
        { codigo_permiso: 'EQUIPOS_READ' },
      ],
    },
  });

  await Promise.all(
    asesorPermisos.map((p) =>
      prisma.roles_permisos.upsert({
        where: {
          id_rol_id_permiso: {
            id_rol: asesorRole.id_rol,
            id_permiso: p.id_permiso,
          },
        },
        update: {},
        create: {
          id_rol: asesorRole.id_rol,
          id_permiso: p.id_permiso,
          asignado_por: 1,
        },
      })
    )
  );

  // Cliente: Solo lectura de sus equipos, órdenes e informes
  const clientePermisos = await prisma.permisos.findMany({
    where: {
      codigo_permiso: {
        in: ['EQUIPOS_READ', 'ORDENES_READ', 'INFORMES_READ'],
      },
    },
  });

  await Promise.all(
    clientePermisos.map((p) =>
      prisma.roles_permisos.upsert({
        where: {
          id_rol_id_permiso: {
            id_rol: clienteRole.id_rol,
            id_permiso: p.id_permiso,
          },
        },
        update: {},
        create: {
          id_rol: clienteRole.id_rol,
          id_permiso: p.id_permiso,
          asignado_por: 1,
        },
      })
    )
  );

  console.log('✅ Permisos asignados a roles\n');

  console.log('🎉 Seed RBAC completado exitosamente!');
  console.log('\n📊 Resumen:');
  console.log(`   - 4 roles creados`);
  console.log(`   - 46 permisos creados`);
  console.log(`   - Permisos asignados por rol:`);
  console.log(`     • ADMIN: * (todos)`);
  console.log(`     • TECNICO_SENIOR: ${tecnicoPermisos.length} permisos`);
  console.log(`     • ASESOR_COMERCIAL: ${asesorPermisos.length} permisos`);
  console.log(`     • CLIENTE: ${clientePermisos.length} permisos`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
