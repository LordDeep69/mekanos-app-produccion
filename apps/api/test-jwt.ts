import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env manualmente
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testJWT() {
  try {
    console.log('🔑 [TEST] Iniciando prueba de JWT...\n');
    
    // Verificar variables de entorno
    console.log('1️⃣ Variables de entorno:');
    console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ NO configurado');
    console.log('   JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? '✅ Configurado' : '❌ NO configurado');
    console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurado' : '❌ NO configurado');
    
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.error('\n❌ ERROR: Secretos JWT no configurados en .env');
      return;
    }
    
    // Crear instancia de JwtService
    console.log('\n2️⃣ Creando JwtService...');
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET,
    });
    
    // Payload de prueba
    const payload = {
      sub: 1,
      email: 'admin@mekanos.com',
      rol: 'USER',
      personaId: 1,
    };
    
    console.log('\n3️⃣ Generando access token...');
    const accessToken = await jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });
    console.log('✅ Access token generado:', accessToken.substring(0, 50) + '...');
    
    console.log('\n4️⃣ Generando refresh token...');
    const refreshToken = await jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
    console.log('✅ Refresh token generado:', refreshToken.substring(0, 50) + '...');
    
    console.log('\n🎉 PRUEBA JWT EXITOSA - Los tokens se generan correctamente');
    
  } catch (error: any) {
    console.error('\n💥 ERROR EN PRUEBA JWT:', error.message);
    console.error(error.stack);
  }
}

testJWT();
