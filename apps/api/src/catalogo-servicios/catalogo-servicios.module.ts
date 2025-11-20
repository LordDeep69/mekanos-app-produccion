import { Module } from '@nestjs/common';
import { CatalogoServiciosController } from './catalogo-servicios.controller';
import { CatalogoServiciosService } from './catalogo-servicios.service';

@Module({
  controllers: [CatalogoServiciosController],
  providers: [CatalogoServiciosService],
  exports: [CatalogoServiciosService],
})
export class CatalogoServiciosModule {}
