const { NestFactory } = require('@nestjs/core');
const { Module, Controller, Get } = require('@nestjs/common');

@Controller()
class TestController {
  @Get('health')
  health() {
    return { status: 'OK' };
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

async function bootstrap() {
  console.log('[1] Creating app...');
  const app = await NestFactory.create(TestModule);
  console.log('[2] Listen 3000...');
  await app.listen(3000);
  console.log('[3] OK!');
}
bootstrap().catch(e => { console.error('FATAL:', e); process.exit(1); });
