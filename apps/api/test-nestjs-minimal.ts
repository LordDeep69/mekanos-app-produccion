// Test mínimo NestJS para aislar problema app.listen()
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get } from '@nestjs/common';

@Controller()
class TestController {
  @Get('health')
  health() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

async function bootstrap() {
  try {
    console.log('[1] Creating NestJS application...');
    const app = await NestFactory.create(TestModule, {
      logger: ['error', 'warn', 'log'],
    });

    console.log('[2] Setting global prefix...');
    app.setGlobalPrefix('api');

    console.log('[3] Attempting to listen on port 3000...');
    await app.listen(3000);
    
    console.log('[4] ✅ Server successfully listening on http://localhost:3000/api');
    console.log('[5] Testing port binding...');
    
    // Keep alive to verify server stays up
    setInterval(() => {
      console.log(`[${new Date().toISOString()}] Server still alive...`);
    }, 5000);

  } catch (error) {
    console.error('[ERROR] Fatal error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

bootstrap();

// Catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]', error);
  process.exit(1);
});
