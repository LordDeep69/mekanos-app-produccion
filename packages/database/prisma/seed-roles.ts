/**
 * SEED DE ROLES - MEKANOS S.A.S
 * 
 * Este script verifica e inserta los roles base del sistema.
 * Ejecutar con: npx ts-node prisma/seed-roles.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES_BASE = [
  {
    codigo_rol: 'ADMIN',
    nombre_rol: 'Administrador',
    descripcion: 'Acceso total al sistema. Gestión de usuarios, configuración y reportes.',
    nivel_jerarquia: 10,
    es_rol_sistema: true,
    color_hex: '#DC2626',
    icono: 'Shield',
    permite_acceso_web: true,
    permite_acceso_movil: true,
    permite_acceso_portal_cliente: false,
  },
  {
    codigo_rol: 'GERENTE',
    nombre_rol: 'Gerente',
    descripcion: 'Supervisión de operaciones, aprobaciones y reportes ejecutivos.',
    nivel_jerarquia: 8,
    es_rol_sistema: false,
    color_hex: '#7C3AED',
    icono: 'Briefcase',
    permite_acceso_web: true,
    permite_acceso_movil: true,
    permite_acceso_portal_cliente: false,
  },
  {
    codigo_rol: 'SUPERVISOR',
    nombre_rol: 'Supervisor Técnico',
    descripcion: 'Asignación de técnicos, seguimiento de órdenes y control de calidad.',
    nivel_jerarquia: 6,
    es_rol_sistema: false,
    color_hex: '#2563EB',
    icono: 'ClipboardCheck',
    permite_acceso_web: true,
    permite_acceso_movil: true,
    permite_acceso_portal_cliente: false,
  },
  {
    codigo_rol: 'TECNICO',
    nombre_rol: 'Técnico de Campo',
    descripcion: 'Ejecución de servicios, registro de mediciones y firmas.',
    nivel_jerarquia: 4,
    es_rol_sistema: false,
    color_hex: '#059669',
    icono: 'Wrench',
    permite_acceso_web: false,
    permite_acceso_movil: true,
    permite_acceso_portal_cliente: false,
  },
  {
    codigo_rol: 'ASESOR',
    nombre_rol: 'Asesor Comercial',
    descripcion: 'Gestión de clientes, cotizaciones y contratos.',
    nivel_jerarquia: 5,
    es_rol_sistema: false,
    color_hex: '#D97706',
    icono: 'Users',
    permite_acceso_web: true,
    permite_acceso_movil: true,
    permite_acceso_portal_cliente: false,
  },
  {
    codigo_rol: 'AUXILIAR',
    nombre_rol: 'Auxiliar Administrativo',
    descripcion: 'Apoyo administrativo, ingreso de datos y documentación.',
    nivel_jerarquia: 3,
    es_rol_sistema: false,
    color_hex: '#6B7280',
    icono: 'FileText',
    permite_acceso_web: true,
    permite_acceso_movil: false,
    permite_acceso_portal_cliente: false,
  },
  {
    codigo_rol: 'CLIENTE_PORTAL',
    nombre_rol: 'Cliente Portal',
    descripcion: 'Acceso al portal de clientes para ver equipos y servicios.',
    nivel_jerarquia: 1,
    es_rol_sistema: true,
    color_hex: '#0891B2',
    icono: 'Building',
    permite_acceso_web: false,
    permite_acceso_movil: false,
    permite_acceso_portal_cliente: true,
  },
];

async function main() {
  console.log('🔍 Verificando roles existentes...\n');

  for (const rolData of ROLES_BASE) {
    const existente = await prisma.roles.findUnique({
      where: { codigo_rol: rolData.codigo_rol },
    });

    if (existente) {
      console.log(`✓ Rol ${rolData.codigo_rol} ya existe (ID: ${existente.id_rol}). Actualizando datos...`);
      await prisma.roles.update({
        where: { id_rol: existente.id_rol },
        data: {
          ...rolData,
          activo: true,
        },
      });
    } else {
      const nuevo = await prisma.roles.create({
        data: {
          ...rolData,
          activo: true,
        },
      });
      console.log(`✚ Rol ${rolData.codigo_rol} CREADO (ID: ${nuevo.id_rol})`);
    }
  }

  const totalRoles = await prisma.roles.count();
  console.log(`\n✅ Total de roles en BD: ${totalRoles}`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
