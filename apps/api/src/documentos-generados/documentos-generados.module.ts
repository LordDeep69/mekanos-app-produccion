import { Module } from '@nestjs/common';
import { DocumentosGeneradosController } from './documentos-generados.controller';
import { DocumentosGeneradosService } from './documentos-generados.service';

@Module({
  controllers: [DocumentosGeneradosController],
  providers: [DocumentosGeneradosService],
  exports: [DocumentosGeneradosService],
})
export class DocumentosGeneradosModule {}
