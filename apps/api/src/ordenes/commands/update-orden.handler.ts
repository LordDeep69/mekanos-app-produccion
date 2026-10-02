import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { permiteEdicion, validarTransicion } from '../domain/workflow-estados';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { UpdateOrdenCommand } from './update-orden.command';

/**
 * Estados desde los que tiene sentido asignar un técnico por primera vez.
 * Asignar un técnico NO cambia el estado si la orden ya está en curso.
 */
const ESTADOS_PRE_ASIGNACION = ['PROGRAMADA', 'BORRADOR'] as const;

/**
 * Estados que, por definición de la FSM, exigen un técnico responsable.
 * Quitarlo rompería la invariante del dominio.
 */
const ESTADOS_QUE_EXIGEN_TECNICO = ['EN_PROCESO', 'EN_ESPERA_REPUESTO'] as const;

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

    // 🛡️ ZERO TRUST: el estado debe leerse de la relación real (`estados_orden`).
    // No se admite fallback a `''`: un estado vacío haría que `permiteEdicion('')`
    // devolviera true (porque '' no está en la lista de estados finales) y dejaría
    // la FSM sin validar. Si la integridad referencial está rota, se falla explícito.
    const estadoCodigo = ordenExistente.estados_orden?.codigo_estado;

    if (!estadoCodigo) {
      throw new InternalServerErrorException(
        `Orden ${ordenId} tiene id_estado_actual=${ordenExistente.id_estado_actual} ` +
        `sin relación válida en estados_orden. No se puede validar la edición. ` +
        `Verifique integridad referencial de la orden ${ordenExistente.numero_orden}.`,
      );
    }

    // 2. Identificar si es solo actualización de campos de documentación
    // Campos que el Portal Admin puede editar incluso en estados finales.
    // 🛡️ `id_tecnico_asignado` NO es documentación: reasignar un técnico es una
    // transición de workflow. Estaba aquí desde antes, y hacía que un PUT con
    // SOLO `id_tecnico_asignado` se clasificara como "soloDocumentacion" y
    // saltara por completo la validación de la FSM.
    const camposDocumentacion = [
      'observaciones_cierre',
      'trabajo_realizado',
      'observaciones_tecnico',
      'descripcion_inicial',
    ];

    // ⚠️ `soloDocumentacion` se calcula sobre las claves realmente presentes.
    // Un DTO vacío (PUT sin cuerpo) haría que every() devuelva true y borraría
    // la protección de estado, por eso se exige al menos una clave.
    const clavesDto = Object.keys(dto);
    const soloDocumentacion =
      clavesDto.length > 0 && clavesDto.every(key => camposDocumentacion.includes(key));

    // 3. Si es edición de campos de workflow y estado no permite, bloquear
    // EXCEPCIÓN: COMPLETADA permite edición de documentación (para Portal Admin)
    if (!soloDocumentacion && !permiteEdicion(estadoCodigo)) {
      throw new BadRequestException(
        `No se puede editar campos de workflow en estado ${estadoCodigo}. ` +
        `Los estados finales (APROBADA, CANCELADA) no permiten modificaciones de workflow.`,
      );
    }

    // Estados que NO permiten NINGUNA edición (ni siquiera documentación)
    // ✅ FIX 09-ABR-2026: APROBADA NO es estado final, es el estado inicial
    const estadosBloqueados = ['CANCELADA'];
    if (estadosBloqueados.includes(estadoCodigo)) {
      throw new BadRequestException(
        `La orden en estado ${estadoCodigo} no puede ser modificada.`,
      );
    }

    // 4. Manejo inteligente y atómico de asignación/reasignación de técnico
    const tecnicoAnteriorId = ordenExistente.id_tecnico_asignado;
    const cambioTecnico = dto.id_tecnico_asignado !== undefined && dto.id_tecnico_asignado !== tecnicoAnteriorId;

    let nuevoEstadoId = ordenExistente.id_estado_actual;
    let fechaAsignacion = ordenExistente.fecha_asignacion;

    if (cambioTecnico) {
      // 4a. Determinar la transición de estado objetivo y validarla contra la FSM.
      //     Antes el estado se mutaba en silencio sin pasar por `validarTransicion`,
      //     lo que permitía degradar una orden a un estado incoherente.
      let codigoEstadoObjetivo: string | null = null;

      if (dto.id_tecnico_asignado) {
        fechaAsignacion = new Date();
        // Asignar técnico desde un estado previo a la asignación -> ASIGNADA.
        if (ESTADOS_PRE_ASIGNACION.includes(estadoCodigo)) {
          codigoEstadoObjetivo = 'ASIGNADA';
        }
      } else {
        // Desasignado: la orden vuelve a PROGRAMADA (única transición válida).
        fechaAsignacion = null;
        if (estadoCodigo === 'ASIGNADA') {
          codigoEstadoObjetivo = 'PROGRAMADA';
        } else if (ESTADOS_QUE_EXIGEN_TECNICO.includes(estadoCodigo)) {
          // EN_PROCESO / EN_ESPERA_REPUESTO no admiten quedarse sin técnico.
          throw new BadRequestException(
            `No se puede desasignar el técnico: la orden está en estado ${estadoCodigo}, ` +
            `que requiere un técnico responsable. Cancele la orden o reasigne a otro técnico.`,
          );
        }
      }

      if (codigoEstadoObjetivo) {
        // La FSM es la autoridad: si la transición no está permitida, se rechaza.
        validarTransicion(estadoCodigo, codigoEstadoObjetivo);

        const estadoDestino = await this.repository.findEstadoByCodigo(codigoEstadoObjetivo);
        if (!estadoDestino) {
          throw new InternalServerErrorException(
            `El estado '${codigoEstadoObjetivo}' no existe en la tabla estados_orden ` +
            `(o está inactivo). No se puede completar la reasignación de la orden ${ordenId}.`,
          );
        }
        nuevoEstadoId = estadoDestino.id_estado;
      }

      // 4b. Registrar lápida (tombstone) SOLO después de validar la transición,
      //     para no dejar lápidas de reasignaciones que finalmente se rechazaron.
      if (tecnicoAnteriorId) {
        await this.repository.registrarTombstoneReasignacion(
          ordenId,
          ordenExistente.numero_orden,
          tecnicoAnteriorId,
        );
      }

      // 4c. Asentar en historial de estados de orden
      await this.repository.registrarHistorialCambio({
        id_orden_servicio: ordenId,
        id_estado_anterior: ordenExistente.id_estado_actual,
        id_estado_nuevo: nuevoEstadoId,
        motivo_cambio: dto.id_tecnico_asignado ? 'Asignación de técnico' : 'Desasignación de técnico',
        observaciones:
          `Técnico: ${tecnicoAnteriorId ?? 'Ninguno'} → ${dto.id_tecnico_asignado ?? 'Sin asignar'}` +
          (codigoEstadoObjetivo ? ` | Estado: ${estadoCodigo} → ${codigoEstadoObjetivo}` : ''),
        accion: 'REASIGNAR_TECNICO',
        realizado_por: userId,
      });
    }

    // 5. Actualizar orden (campos permitidos + observaciones_cierre)
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
      id_tecnico_asignado: dto.id_tecnico_asignado !== undefined ? dto.id_tecnico_asignado : ordenExistente.id_tecnico_asignado,
      fecha_asignacion: fechaAsignacion,
      id_estado_actual: nuevoEstadoId,
      modificado_por: userId,
    });
  }
}
