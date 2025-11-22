import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

// ✅ FIX: Serialización de BigInt para JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  
  try {
    console.log('🔧 [DEBUG 1/10] Iniciando bootstrap... ');
    
    console.log('🔧 [DEBUG 2/10] Creando NestApplication...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    console.log('✅ [DEBUG 3/10] NestApplication creada exitosamente');

    console.log('🔧 [DEBUG 4/10] Configurando GlobalPrefix...');
    app.setGlobalPrefix('api');
    console.log('✅ [DEBUG 5/10] GlobalPrefix configurado');

    console.log('🔧 [DEBUG 6/10] Configurando CORS...');
    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    });
    console.log('✅ [DEBUG 7/10] CORS habilitado');

    console.log('🔧 [DEBUG 8/10] Configurando ValidationPipe...');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: false, // ← TEMPORAL: Permitir campos no decorados para MVP/Bootstrapping
        forbidNonWhitelisted: false, // ← TEMPORAL: No rechazar campos extras
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    console.log('✅ [DEBUG 9/10] ValidationPipe configurado');

    // Global exception filter
    app.useGlobalFilters(new AllExceptionsFilter());

    const port = process.env.PORT || 3000;
    console.log(`🔧 [DEBUG 10/10] Iniciando listener puerto ${port} en 0.0.0.0 (todas las interfaces)...`);
    
    // ✅ FIX Windows: Usar 0.0.0.0 para aceptar IPv4 e IPv6
    await app.listen(port, '0.0.0.0');
    
    const address = app.getHttpServer().address();
    console.log('✅ [BOOTSTRAP COMPLETO] Server address:', JSON.stringify(address));
    console.log('✅ [BOOTSTRAP COMPLETO] Proceso Node PID:', process.pid);

    logger.log(`🚀 Mekanos API running on: http://localhost:${port}/api`);
    logger.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
    logger.log(`❤️  Health check: http://localhost:${port}/api/health`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    console.log('✅ [SERVIDOR ACTIVO] Proceso manteniéndose vivo indefinidamente...');
    
    // ✅ DEBUG Windows: Keep-alive explícito
    setInterval(() => {
      console.log(`[KEEPALIVE] ${new Date().toISOString()} - Server still running (PID: ${process.pid})`);
    }, 30000); // Log cada 30 segundos
    
  } catch (error) {
    console.error('❌ [FATAL] Error en bootstrap:', error);
    console.error('❌ [FATAL] Stack trace:', (error as Error)?.stack);
    process.exit(1);
  }
}

// Capturar errores globales NO manejados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [FATAL] Unhandled Promise Rejection:', reason);
  console.error('❌ [FATAL] Promise:', promise);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ [FATAL] Uncaught Exception:', error);
  console.error('❌ [FATAL] Stack trace:', error.stack);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error('❌ [FATAL] Bootstrap catch:', error);
  console.error('❌ [FATAL] Stack trace:', (error as Error)?.stack);
  process.exit(1);
});
