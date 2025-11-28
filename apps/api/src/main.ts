import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

    // 🔧 SWAGGER/OPENAPI - Documentación interactiva
    console.log('🔧 [DEBUG 5.1] Configurando Swagger/OpenAPI...');
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MEKANOS API')
      .setDescription(`
        ## Sistema Digital Integrado Mekanos S.A.S
        
        ### API de Backend para:
        - 📱 App Móvil (Técnicos)
        - 🖥️ Portal Admin (Asesoras/Gerencia)
        - 🌐 Portal Cliente (Autoservicio)
        
        ### Módulos disponibles:
        - **FASE 1:** Equipos (8 tablas)
        - **FASE 2:** Usuarios (16 tablas)
        - **FASE 3:** Órdenes de Servicio (18 tablas)
        - **FASE 4:** Cotizaciones (8 tablas)
        - **FASE 5:** Inventario (8 tablas)
        - **FASE 6:** Informes (6 tablas)
        - **FASE 7:** Cronogramas (5 tablas)
        
        ### Autenticación:
        Usar Bearer Token JWT obtenido en \`/api/auth/login\`
      `)
      .setVersion('1.0.0')
      .setContact('Mekanos S.A.S', 'https://mekanos.com', 'info@mekanos.com')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Ingresa tu token JWT',
          in: 'header',
        },
        'JWT-auth', // Nombre de referencia para el esquema de seguridad
      )
      .addTag('Auth', 'Autenticación y autorización')
      .addTag('FASE 1 - Equipos', 'Gestión de equipos, componentes y fichas técnicas')
      .addTag('FASE 2 - Usuarios', 'Clientes, empleados, proveedores y roles')
      .addTag('FASE 3 - Órdenes', 'Órdenes de servicio, visitas y actividades')
      .addTag('FASE 4 - Cotizaciones', 'Cotizaciones y propuestas comerciales')
      .addTag('FASE 5 - Inventario', 'Productos, movimientos y stock')
      .addTag('FASE 6 - Informes', 'Informes técnicos y bitácoras')
      .addTag('FASE 7 - Cronogramas', 'Programación de mantenimientos')
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument, {
      customSiteTitle: 'MEKANOS API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });
    console.log('✅ [DEBUG 5.2] Swagger configurado en /api/docs');

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
    logger.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
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
