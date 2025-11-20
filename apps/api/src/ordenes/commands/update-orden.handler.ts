import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateOrdenCommand } from './update-orden.command';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { permiteEdicion } from '../domain/workflow-estados';

/**
 * Handler: Actualizar orden de servicio
 * 
 * LÓGICA DE NEGOCIO:
 * 1. Verificar que la orden existe
 * 2. Validar que el estado actual permite edición (no finales)
 * 3. Actualizar solo campos no críticos del workflow
 * 4. Retornar orden actualizada
 */
@CommandHandler(UpdateOrdenCommand)
export class UpdateOrdenHandler implements ICommandHandler<UpdateOrdenCommand> {
  constructor(
    private readonly repository: PrismaOrdenServicioRepository,
  ) {}

  async execute(command: UpdateOrdenCommand): Promise<any> {
    const { ordenId, dto, userId } = command;

    // 1. Verificar existencia
    const ordenExistente = await this.repository.findById(ordenId);
    if (!ordenExistente) {
      throw new NotFoundException(`Orden de servicio ${ordenId} no encontrada`);
    }

    // 2. Validar que el estado permite edición
    const estadoCodigo = ordenExistente.estado.codigo_estado;
    if (!permiteEdicion(estadoCodigo)) {
      throw new BadRequestException(
        `No se puede editar la orden en estado ${estadoCodigo}. ` +
        `Los estados finales (APROBADA, CANCELADA) no permiten modificaciones.`,
      );
    }

    // 3. Actualizar orden (solo campos permitidos)
    return await this.repository.save({
      id_orden_servicio: ordenId,
      id_sede: dto.id_sede !== undefined ? dto.id_sede : ordenExistente.id_sede,
      id_tipo_servicio: dto.id_tipo_servicio !== undefined ? dto.id_tipo_servicio : ordenExistente.id_tipo_servicio,
      fecha_programada: dto.fecha_programada !== undefined ? dto.fecha_programada : ordenExistente.fecha_programada,
      hora_programada: dto.hora_programada !== undefined ? dto.hora_programada : ordenExistente.hora_programada,
      prioridad: dto.prioridad || ordenExistente.prioridad,
      origen_solicitud: dto.origen_solicitud || ordenExistente.origen_solicitud,
      descripcion_inicial: dto.descripcion_inicial !== undefined ? dto.descripcion_inicial : ordenExistente.descripcion_inicial,
      trabajo_realizado: dto.trabajo_realizado !== undefined ? dto.trabajo_realizado : ordenExistente.trabajo_realizado,
      observaciones_tecnico: dto.observaciones_tecnico !== undefined ? dto.observaciones_tecnico : ordenExistente.observaciones_tecnico,
      requiere_firma_cliente: dto.requiere_firma_cliente !== undefined ? dto.requiere_firma_cliente : ordenExistente.requiere_firma_cliente,
      modificado_por: userId,
    });
  }
}
