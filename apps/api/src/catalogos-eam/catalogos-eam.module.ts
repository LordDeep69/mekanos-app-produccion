import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { EquiposModule } from '../equipos/equipos.module';
import { CatalogosEamService } from './catalogos-eam.service';
import { ArquetiposController } from './controllers/arquetipos.controller';
import { AtributosTecnicosController } from './controllers/atributos-tecnicos.controller';
import { MagnitudesController } from './controllers/magnitudes.controller';
import { ModelosEquipoController } from './controllers/modelos-equipo.controller';
import { ModulosTecnicosController } from './controllers/modulos-tecnicos.controller';
import { UnidadesController } from './controllers/unidades.controller';

@Module({
  imports: [
    PrismaModule,
    EquiposModule,
  ],
  controllers: [
    MagnitudesController,
    UnidadesController,
    AtributosTecnicosController,
    ModulosTecnicosController,
    ArquetiposController,
    ModelosEquipoController,
  ],
  providers: [
    CatalogosEamService,
  ],
  exports: [
    CatalogosEamService,
  ],
})
export class CatalogosEamModule {}
