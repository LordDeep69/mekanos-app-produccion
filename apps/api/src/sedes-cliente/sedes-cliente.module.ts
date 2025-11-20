import { Module } from '@nestjs/common';
import { SedesClienteController } from './sedes-cliente.controller';
import { SedesClienteService } from './sedes-cliente.service';

@Module({
  controllers: [SedesClienteController],
  providers: [SedesClienteService],
  exports: [SedesClienteService],
})
export class SedesClienteModule {}
