/**
 * Script: crear-usuario-test.ts
 * Crea usuario test para endpoints protegidos JWT
 * Ejecutar: npx tsx crear-usuario-test.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('   CREAR USUARIO TEST');
  console.log('========================================\n');

  const email = 'test@mekanos.com';
  const password = 'Test123456';
  const username = 'test_user';

  try {
    // PASO 1: Eliminar usuario test existente (idempotente)
    console.log('PASO 1: Eliminando usuario test existente...');
    const existingUser = await prisma.usuarios.findUnique({
      where: { email },
    });

    if (existingUser) {
      await prisma.usuarios.delete({ where: { id_usuario: existingUser.id_usuario } });
      console.log('✅ Usuario existente eliminado');
    } else {
      console.log('ℹ️  No existe usuario previo');
    }

    // PASO 2: Crear persona NATURAL test
    console.log('\nPASO 2: Creando persona test...');
    const persona = await prisma.personas.create({
      data: {
        tipo_identificacion: 'CC',
        numero_identificacion: '1234567890',
        tipo_persona: 'NATURAL',
        primer_nombre: 'Usuario',
        primer_apellido: 'Test',
        email_principal: email,
        telefono_principal: '3001234567',
        celular: '3001234567',
        direccion_principal: 'Calle Test 123',
        ciudad: 'CARTAGENA',
        departamento: 'BOLÍVAR',
        pais: 'COLOMBIA',
        es_empleado: true,
        activo: true,
      },
    });
    console.log(`✅ Persona creada - ID: ${persona.id_persona}`);

    // PASO 3: Hashear password
    console.log('\nPASO 3: Hasheando password...');
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    console.log('✅ Password hasheado con BCrypt (salt rounds: 10)');

    // PASO 4: Crear usuario
    console.log('\nPASO 4: Creando usuario...');
    const usuario = await prisma.usuarios.create({
      data: {
        id_persona: persona.id_persona,
        username,
        email,
        password_hash,
        debe_cambiar_password: false,
        estado: 'ACTIVO',
      },
    });
    console.log(`✅ Usuario creado - ID: ${usuario.id_usuario}`);

    // PASO 5: Verificar creación
    console.log('\nPASO 5: Verificando usuario creado...');
    const usuarioVerificado = await prisma.usuarios.findUnique({
      where: { email },
      include: {
        persona: {
          select: {
            primer_nombre: true,
            primer_apellido: true,
            numero_identificacion: true,
          },
        },
      },
    });

    if (!usuarioVerificado) {
      throw new Error('Usuario no encontrado después de creación');
    }

    console.log('\n========================================');
    console.log('   ✅ USUARIO TEST CREADO');
    console.log('========================================');
    console.log('ID Usuario:', usuarioVerificado.id_usuario);
    console.log('Username:', usuarioVerificado.username);
    console.log('Email:', usuarioVerificado.email);
    console.log('Password:', password);
    console.log('Nombre:', `${usuarioVerificado.persona.primer_nombre} ${usuarioVerificado.persona.primer_apellido}`);
    console.log('Estado:', usuarioVerificado.estado);
    console.log('\nCredenciales para login:');
    console.log(`  email: "${email}"`);
    console.log(`  password: "${password}"`);
    console.log('\n');
  } catch (error) {
    console.error('❌ ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('✅ Script completado exitosamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falló:', error.message);
    process.exit(1);
  });
