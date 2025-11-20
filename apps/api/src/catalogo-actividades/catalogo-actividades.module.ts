import { Module } from '@nestjs/common';
import { CatalogoActividadesController } from './catalogo-actividades.controller';
import { CatalogoActividadesService } from './catalogo-actividades.service';

@Module({
  controllers: [CatalogoActividadesController],
  providers: [CatalogoActividadesService],
  exports: [CatalogoActividadesService],
})
export class CatalogoActividadesModule {}
