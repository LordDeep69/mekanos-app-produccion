import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
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
    // ✅ FIX 09-FEB-2026: Desactivar body-parser interno de NestJS
    // para que nuestro parser custom con límite de 50MB sea el único activo.
    // Sin esto, el parser interno (1MB default) rechaza payloads grandes ANTES
    // de que nuestro middleware los procese → PayloadTooLargeError
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      bodyParser: false,
    });
    console.log('✅ [DEBUG 3/10] NestApplication creada exitosamente');

    // ✅ FIX 09-FEB-2026: Body parser con límite de 50MB
    // Las órdenes con múltiples evidencias en Base64 pueden superar 10MB fácilmente
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    console.log('✅ [DEBUG 3.1] Body parser limit: 50MB (bodyParser interno desactivado)');

    // ✅ AUDITORÍA DE TRÁFICO: Middleware de Logging Global (Después de body-parser)
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      const { method, url, body } = req;
      const timestamp = new Date().toISOString();

      console.log(`[${timestamp}] [REQUEST] ${method} ${url}`);
      if (method !== 'GET' && body && Object.keys(body).length > 0) {
        console.log(`[BODY]`, JSON.stringify(body, null, 2));
      }

      // Capturar el final de la respuesta para loguear el status
      res.on('finish', () => {
        const duration = Date.now() - new Date(timestamp).getTime();
        console.log(`[${new Date().toISOString()}] [RESPONSE] ${method} ${url} - Status: ${res.statusCode} (${duration}ms)`);
      });

      next();
    });

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
      .addTag('FASE 3 - Órdenes de Servicio', 'Órdenes de servicio, workflow y finalización completa')
      .addTag('FASE 4 - Cotizaciones', 'Cotizaciones comerciales y flujo de aprobación')
      .addTag('FASE 4 - Propuestas Correctivo', 'Propuestas de mantenimiento correctivo')
      .addTag('FASE 5 - Inventario', 'Productos, movimientos y alertas de stock')
      .addTag('FASE 5 - Remisiones', 'Remisiones de materiales a técnicos')
      .addTag('FASE 5 - Órdenes de Compra', 'Órdenes de compra a proveedores')
      .addTag('FASE 6 - Informes', 'Informes técnicos, PDFs y bitácoras')
      .addTag('FASE 7 - Cronogramas', 'Programación de mantenimientos preventivos')
      .addTag('Sync', 'Sincronización offline para app móvil')
      .addTag('Dashboard', 'Métricas y estadísticas del sistema')
      .addTag('Email', 'Envío de correos electrónicos')
      .addTag('Notificaciones', 'Sistema de notificaciones push')
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
    // ✅ FIX 04-FEB-2026: Lista de dominios permitidos por defecto
    const defaultOrigins = [
      'https://mekanos-admin-portal.vercel.app',
      'https://mekanos-admin-portal-git-main-lorddeep69s-projects.vercel.app',
      'https://mekanos-admin-portal-ll0loftrq-lorddeep69s-projects.vercel.app',
      'http://localhost:3001',
      'http://localhost:3000',
    ];

    // Convertir CORS_ORIGIN en array si contiene múltiples orígenes
    const corsOrigin = process.env.CORS_ORIGIN;
    let origins: string | string[] | boolean;

    if (corsOrigin === '*') {
      origins = true; // Permitir todos
    } else if (corsOrigin) {
      // Combinar dominios de env con los por defecto
      const envOrigins = corsOrigin.includes(',')
        ? corsOrigin.split(',').map(o => o.trim())
        : [corsOrigin];
      origins = [...new Set([...defaultOrigins, ...envOrigins])];
    } else {
      origins = defaultOrigins;
    }

    console.log('📋 [DEBUG 6.1] CORS origins:', origins);
    app.enableCors({
      origin: origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
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
        // ✅ Mostrar errores detallados de validación (recursivo para nested objects)
        exceptionFactory: (errors) => {
          const extractErrors = (errs: any[], prefix = ''): string[] => {
            const messages: string[] = [];
            for (const err of errs) {
              const prop = prefix ? `${prefix}.${err.property}` : err.property;
              if (err.constraints) {
                messages.push(`${prop}: ${Object.values(err.constraints).join(', ')}`);
              }
              if (err.children && err.children.length > 0) {
                messages.push(...extractErrors(err.children, prop));
              }
            }
            return messages;
          };
          const messages = extractErrors(errors);
          console.log('❌ [ValidationPipe] Errores detallados:', messages);
          return new BadRequestException(messages);
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

// Capturar errores globales NO manejados - loguear pero NO matar el proceso
process.on('unhandledRejection', (reason, _promise) => {
  console.error('❌ [FATAL] Unhandled Promise Rejection:', reason);
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
