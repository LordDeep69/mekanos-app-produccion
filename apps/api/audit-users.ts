import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditUsers() {
  console.log('🔍 Iniciando auditoría de integridad de usuarios...');
  
  try {
    const totalPersonas = await prisma.personas.count();
    const totalUsuarios = await prisma.usuarios.count();
    const totalClientes = await prisma.clientes.count();
    const totalEmpleados = await prisma.empleados.count();

    console.log(`📊 Resumen de registros:`);
    console.log(`- Personas: ${totalPersonas}`);
    console.log(`- Usuarios (Logins): ${totalUsuarios}`);
    console.log(`- Clientes: ${totalClientes}`);
    console.log(`- Empleados: ${totalEmpleados}`);

    const usuarios = await prisma.usuarios.findMany({
      select: {
        id_usuario: true,
        email: true,
        id_persona: true,
        persona: {
          select: {
            primer_nombre: true,
            primer_apellido: true,
            razon_social: true
          }
        }
      }
    });

    console.log('\n👤 Listado de Usuarios (Logins):');
    usuarios.forEach(u => {
      const nombre = u.persona.razon_social || `${u.persona.primer_nombre} ${u.persona.primer_apellido}`;
      console.log(`- ID: ${u.id_usuario} | Email: ${u.email} | Persona: ${nombre}`);
    });

  } catch (error) {
    console.error('❌ Error en la auditoría:', error);
  } finally {
    await prisma.$disconnect();
  }
}

auditUsers();
