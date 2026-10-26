import {
  IOrdenServicioRepository,
  NumeroOrden,
  OrdenServicioEntity,
} from '@mekanos/core';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateOrdenCommand } from './create-orden.command';

/**
 * Handler para CreateOrdenCommand
 * Crea una nueva Orden de Servicio con soporte para Encadenamiento Fractal (Visita 1 -> Visita N)
 */
@CommandHandler(CreateOrdenCommand)
export class CreateOrdenHandler implements ICommandHandler<CreateOrdenCommand> {
  constructor(
    @Inject('IOrdenServicioRepository')
    private readonly ordenRepository: IOrdenServicioRepository
  ) { }

  async execute(command: CreateOrdenCommand): Promise<OrdenServicioEntity> {
    const {
      equiposIds,
      clienteId,
      tipoServicioId,
      serviciosIds,
      sedeClienteId,
      descripcion,
      razonFalla,
      prioridad,
      fechaProgramada,
      tecnicoId,
      idOrdenPadre,
      tipoVisita,
      idsPendientesAResolver,
    } = command;

    // Obtener el primer equipo como principal para la tabla ordenes_servicio (compatibilidad)
    const equipoPrincipalId = equiposIds[0];

    // Obtener el último correlativo del mes para generar número de orden
    const now = new Date();
    const anio = now.getFullYear();
    const mes = now.getMonth() + 1;
    const ultimoCorrelativo = await this.ordenRepository.getUltimoCorrelativoMes(anio, mes);
    const numeroOrden = NumeroOrden.create(ultimoCorrelativo);

    // Verificar que no exista
    const existente = await this.ordenRepository.existsByNumeroOrden(
      numeroOrden.getValue()
    );
    if (existente) {
      throw new Error(`Ya existe una orden con número ${numeroOrden.getValue()}`);
    }

    // Descripción consolidada (si viene razon_falla, se anexa)
    const descripcionFinal = razonFalla
      ? (descripcion ? `${descripcion}\n[Motivo/Falla Reportada]: ${razonFalla}` : `[Motivo/Falla Reportada]: ${razonFalla}`)
      : descripcion;

    // Crear entidad de dominio
    const orden = OrdenServicioEntity.create({
      numeroOrden: numeroOrden.getValue(),
      equipoId: equipoPrincipalId,
      clienteId,
      sedeClienteId,
      tipoServicioId,
      descripcion: descripcionFinal,
      prioridad,
      fechaProgramada,
    });

    // Mapear datos para persistencia
    let idEstadoInicial = 3;
    if (tecnicoId) {
      const estadoAsignada = await (this.ordenRepository as any).findEstadoByCodigo?.('ASIGNADA');
      idEstadoInicial = estadoAsignada?.id_estado ?? 1;
    } else {
      const estadoProgramada = await (this.ordenRepository as any).findEstadoByCodigo?.('PROGRAMADA');
      idEstadoInicial = estadoProgramada?.id_estado ?? 3;
    }

    const ordenData = {
      numero_orden: orden.numeroOrden.getValue(),
      id_cliente: orden.clienteId,
      id_equipo: equipoPrincipalId, // Principal
      id_tipo_servicio: orden.tipoServicioId,
      id_sede: orden.sedeClienteId,
      descripcion_inicial: orden.descripcion,
      fecha_programada: orden.fechaProgramada,
      prioridad: orden.prioridad.getValue(),
      origen_solicitud: tipoVisita === 'GARANTIA' ? 'GARANTIA' : 'PROGRAMADO',
      id_estado_actual: idEstadoInicial,
      id_tecnico_asignado: tecnicoId || null,
      fecha_asignacion: tecnicoId ? new Date() : null,
      requiere_firma_cliente: true,
      creado_por: command.userId,
      id_orden_padre: idOrdenPadre || null,
      tipo_visita: tipoVisita || 'INICIAL',
    };

    const savedOrden = await (this.ordenRepository as any).saveWithEquiposOptimizado(
      ordenData,
      equiposIds,
      serviciosIds,
      idsPendientesAResolver,
    );

    return savedOrden;
  }
}
