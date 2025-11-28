import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { DocumentosGeneradosController } from './documentos-generados.controller';
import { DocumentosGeneradosService } from './documentos-generados.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DocumentosGeneradosController],
  providers: [DocumentosGeneradosService],
  exports: [DocumentosGeneradosService],
})
export class DocumentosGeneradosModule {}
