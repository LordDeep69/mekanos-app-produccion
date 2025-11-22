import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { PrismaParametrosMedicionRepository } from './infrastructure/prisma-parametros-medicion.repository';
import { ParametrosMedicionController } from './parametros-medicion.controller';

// Command Handlers
import { ActualizarParametrosMedicionHandler } from './application/commands/actualizar-parametros-medicion.handler';
import { CrearParametrosMedicionHandler } from './application/commands/crear-parametros-medicion.handler';
import { EliminarParametrosMedicionHandler } from './application/commands/eliminar-parametros-medicion.handler';

// Query Handlers
import { BuscarParametroMedicionPorCodigoHandler } from './application/queries/buscar-parametro-medicion-por-codigo.handler';
import { ListarParametrosMedicionHandler } from './application/queries/listar-parametros-medicion.handler';
import { ObtenerParametroMedicionPorIdHandler } from './application/queries/obtener-parametro-medicion-por-id.handler';
import { ObtenerParametrosActivosHandler } from './application/queries/obtener-parametros-activos.handler';
import { ObtenerParametrosPorTipoEquipoHandler } from './application/queries/obtener-parametros-por-tipo-equipo.handler';

const CommandHandlers = [
  CrearParametrosMedicionHandler,
  ActualizarParametrosMedicionHandler,
  EliminarParametrosMedicionHandler,
];

const QueryHandlers = [
  ObtenerParametroMedicionPorIdHandler,
  ListarParametrosMedicionHandler,
  BuscarParametroMedicionPorCodigoHandler,
  ObtenerParametrosActivosHandler,
  ObtenerParametrosPorTipoEquipoHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [ParametrosMedicionController],
  providers: [
    PrismaParametrosMedicionRepository,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [PrismaParametrosMedicionRepository],
})
export class ParametrosMedicionModule {}
