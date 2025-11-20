import { PrismaClient } from '@mekanos/database';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    console.log('🔐 [TEST] Iniciando prueba de login...\n');
    
    const email = 'admin@mekanos.com';
    const password = 'Admin123!';
    
    console.log('1️⃣ Buscando usuario:', email);
    const usuario = await prisma.usuarios.findUnique({
      where: { email },
      include: { persona: true },
    });
    
    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('✅ Usuario encontrado:', {
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      username: usuario.username,
      estado: usuario.estado,
      persona_nombre: usuario.persona?.nombre_completo,
    });
    
    console.log('\n2️⃣ Validando estado...');
    if (usuario.estado !== 'ACTIVO') {
      console.log('❌ Usuario no activo:', usuario.estado);
      return;
    }
    console.log('✅ Estado: ACTIVO');
    
    console.log('\n3️⃣ Validando contraseña...');
    console.log('   Password hash:', usuario.password_hash);
    console.log('   Password input:', password);
    
    const isValid = await bcrypt.compare(password, usuario.password_hash);
    console.log('✅ Contraseña válida:', isValid);
    
    if (!isValid) {
      console.log('❌ Contraseña incorrecta');
      return;
    }
    
    console.log('\n🎉 TODAS LAS VALIDACIONES PASARON');
    console.log('El error 500 debe estar en generateTokens() o en el DTO response');
    
  } catch (error: any) {
    console.error('\n💥 ERROR EN TEST:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
