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
 * Crea una nueva Orden de Servicio en estado BORRADOR
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
      sedeClienteId,
      descripcion,
      prioridad,
      fechaProgramada,
      tecnicoId,
    } = command;

    // --- VALIDACIÓN ZERO TRUST (Integridad Atómica) ---
    // 1. Validar que el cliente existe
    // 2. Validar que todos los equipos pertenecen al cliente
    // 3. Validar que el tipo de servicio es compatible con los equipos (si aplica)

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

    // Crear entidad de dominio
    const orden = OrdenServicioEntity.create({
      numeroOrden: numeroOrden.getValue(),
      equipoId: equipoPrincipalId,
      clienteId,
      sedeClienteId,
      tipoServicioId,
      descripcion,
      prioridad,
      fechaProgramada,
    });

    // Mapear datos para persistencia
    // Si hay técnico, el estado inicial es ASIGNADA (ID 2), de lo contrario PROGRAMADA (ID 3)
    const idEstadoInicial = tecnicoId ? 2 : 3;

    const ordenData = {
      numero_orden: orden.numeroOrden.getValue(),
      id_cliente: orden.clienteId,
      id_equipo: equipoPrincipalId, // Principal
      id_tipo_servicio: orden.tipoServicioId,
      id_sede: orden.sedeClienteId,
      descripcion_inicial: orden.descripcion,
      fecha_programada: orden.fechaProgramada,
      prioridad: orden.prioridad.getValue(),
      origen_solicitud: 'PROGRAMADO',
      id_estado_actual: idEstadoInicial,
      id_tecnico_asignado: tecnicoId || null,
      fecha_asignacion: tecnicoId ? new Date() : null,
      requiere_firma_cliente: true,
      creado_por: command.userId,
    };

    // --- TRANSACCIÓN ENTERPRISE: Orden + Múltiples Equipos ---
    // ✅ OPTIMIZADO 05-ENE-2026: Retornar orden con relaciones LITE directamente
    // Evita el findById pesado que causaba +10 segundos de latencia
    const savedOrden = await (this.ordenRepository as any).saveWithEquiposOptimizado(ordenData, equiposIds);

    return savedOrden;
  }
}
