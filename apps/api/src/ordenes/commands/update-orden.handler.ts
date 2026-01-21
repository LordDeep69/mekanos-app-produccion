import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { permiteEdicion } from '../domain/workflow-estados';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { UpdateOrdenCommand } from './update-orden.command';

/**
 * Handler: Actualizar orden de servicio
 * 
 * LÓGICA DE NEGOCIO:
 * 1. Verificar que la orden existe
 * 2. Para campos de documentación (observaciones_cierre, trabajo_realizado, etc.):
 *    - Permitir edición incluso en estados finales (excepto APROBADA/CANCELADA)
 *    - El Portal Admin necesita poder editar estos campos post-finalización
 * 3. Para campos de workflow (fecha, técnico, prioridad):
 *    - Validar que el estado permite edición
 * 4. Retornar orden actualizada
 * 
 * NOTA: Este handler soporta edición desde Portal Admin
 */
@CommandHandler(UpdateOrdenCommand)
export class UpdateOrdenHandler implements ICommandHandler<UpdateOrdenCommand> {
  constructor(
    private readonly repository: PrismaOrdenServicioRepository,
  ) { }

  async execute(command: UpdateOrdenCommand): Promise<any> {
    const { ordenId, dto, userId } = command;

    // 1. Verificar existencia
    const ordenExistente = await this.repository.findById(ordenId);
    if (!ordenExistente) {
      throw new NotFoundException(`Orden de servicio ${ordenId} no encontrada`);
    }

    const estadoCodigo = ordenExistente.estado.codigo_estado;

    // 2. Identificar si es solo actualización de campos de documentación
    const camposDocumentacion = [
      'observaciones_cierre',
      'trabajo_realizado',
      'observaciones_tecnico',
      'descripcion_inicial',
    ];

    const soloDocumentacion = Object.keys(dto).every(
      key => camposDocumentacion.includes(key)
    );

    // 3. Si es edición de campos de workflow y estado no permite, bloquear
    // EXCEPCIÓN: COMPLETADA permite edición de documentación (para Portal Admin)
    if (!soloDocumentacion && !permiteEdicion(estadoCodigo)) {
      throw new BadRequestException(
        `No se puede editar campos de workflow en estado ${estadoCodigo}. ` +
        `Los estados finales (APROBADA, CANCELADA) no permiten modificaciones de workflow.`,
      );
    }

    // Estados que NO permiten NINGUNA edición (ni siquiera documentación)
    const estadosBloqueados = ['APROBADA', 'CANCELADA'];
    if (estadosBloqueados.includes(estadoCodigo)) {
      throw new BadRequestException(
        `La orden en estado ${estadoCodigo} no puede ser modificada.`,
      );
    }

    // 4. Actualizar orden (campos permitidos + observaciones_cierre)
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
      observaciones_cierre: dto.observaciones_cierre !== undefined ? dto.observaciones_cierre : ordenExistente.observaciones_cierre,
      requiere_firma_cliente: dto.requiere_firma_cliente !== undefined ? dto.requiere_firma_cliente : ordenExistente.requiere_firma_cliente,
      modificado_por: userId,
    });
  }
}
