import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ActualizarMotivoAjusteHandler } from './application/commands/actualizar-motivo-ajuste.handler';
import { CrearMotivoAjusteHandler } from './application/commands/crear-motivo-ajuste.handler';
import { DesactivarMotivoAjusteHandler } from './application/commands/desactivar-motivo-ajuste.handler';
import { GetMotivoAjusteByIdHandler } from './application/queries/get-motivo-ajuste-by-id.handler';
import { GetMotivosAjusteHandler } from './application/queries/get-motivos-ajuste.handler';
import { PrismaMotivosAjusteRepository } from './infrastructure/prisma-motivos-ajuste.repository';
import { MOTIVOS_AJUSTE_REPOSITORY } from './motivos-ajuste.constants';
import { MotivosAjusteController } from './motivos-ajuste.controller';

const CommandHandlers = [
  CrearMotivoAjusteHandler,
  ActualizarMotivoAjusteHandler,
  DesactivarMotivoAjusteHandler,
];

const QueryHandlers = [GetMotivosAjusteHandler, GetMotivoAjusteByIdHandler];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [MotivosAjusteController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    {
      provide: MOTIVOS_AJUSTE_REPOSITORY,
      useClass: PrismaMotivosAjusteRepository,
    },
  ],
  exports: [MOTIVOS_AJUSTE_REPOSITORY],
})
export class MotivosAjusteModule {}
