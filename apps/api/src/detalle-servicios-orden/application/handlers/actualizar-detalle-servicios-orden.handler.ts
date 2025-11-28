import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../database/prisma.service';
import { IDetalleServiciosOrdenRepository } from '../../domain/detalle-servicios-orden.repository.interface';
import { ActualizarDetalleServiciosOrdenCommand } from '../commands/actualizar-detalle-servicios-orden.command';
import { DetalleServiciosOrdenResponseDto } from '../dto/detalle-servicios-orden-response.dto';

@CommandHandler(ActualizarDetalleServiciosOrdenCommand)
export class ActualizarDetalleServiciosOrdenHandler implements ICommandHandler<ActualizarDetalleServiciosOrdenCommand> {
  constructor(
    @Inject('IDetalleServiciosOrdenRepository')
    private readonly repository: IDetalleServiciosOrdenRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: ActualizarDetalleServiciosOrdenCommand): Promise<DetalleServiciosOrdenResponseDto> {
    const { id, dto } = command;

    // Validar existencia
    const detalleExistente = await this.repository.encontrarPorId(id);
    if (!detalleExistente) {
      throw new NotFoundException(`Detalle de servicio con ID ${id} no encontrado`);
    }

    // ✅ Validación FK OPCIONAL: id_tecnico_ejecutor
    if (dto.idTecnicoEjecutor) {
      const tecnicoExists = await this.prisma.empleados.findUnique({
        where: { id_empleado: dto.idTecnicoEjecutor },
      });
      if (!tecnicoExists) {
        throw new NotFoundException(`Técnico con ID ${dto.idTecnicoEjecutor} no encontrado`);
      }
    }

    // ✅ Validación FK OPCIONAL: modificado_por
    if (dto.modificadoPor) {
      const usuarioExists = await this.prisma.usuarios.findUnique({
        where: { id_usuario: dto.modificadoPor },
      });
      if (!usuarioExists) {
        throw new NotFoundException(`Usuario con ID ${dto.modificadoPor} no encontrado`);
      }
    }

    // ✅ Validaciones CHECK si se proveen
    if (dto.cantidad !== undefined && dto.cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    if (dto.precioUnitario !== undefined && dto.precioUnitario < 0) {
      throw new BadRequestException('El precio unitario no puede ser negativo');
    }

    if (dto.descuentoPorcentaje !== undefined && (dto.descuentoPorcentaje < 0 || dto.descuentoPorcentaje > 100)) {
      throw new BadRequestException('El descuento debe estar entre 0 y 100');
    }

    if (dto.duracionServicioMinutos !== undefined && dto.duracionServicioMinutos <= 0) {
      throw new BadRequestException('La duración debe ser mayor a 0 minutos');
    }

    // ✅ Validación CHECK: fechas coherentes
    const fechaInicio = dto.fechaInicioServicio ?? detalleExistente.fechaInicioServicio;
    const fechaFin = dto.fechaFinServicio ?? detalleExistente.fechaFinServicio;
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      throw new BadRequestException('La fecha de fin debe ser posterior o igual a la fecha de inicio');
    }

    // ✅ Validación NEGOCIO: Garantía coherente
    const tieneGarantia = dto.tieneGarantiaServicio ?? detalleExistente.tieneGarantiaServicio;
    const mesesGarantia = dto.mesesGarantiaServicio ?? detalleExistente.mesesGarantiaServicio;
    if (tieneGarantia && (!mesesGarantia || mesesGarantia <= 0)) {
      throw new BadRequestException('Si tiene garantía, debe especificar los meses de garantía (mayor a 0)');
    }

    // ✅ Recalcular subtotal si cambian cantidad, precio o descuento
    let subtotalCalculado = dto.subtotal;
    if ((dto.cantidad !== undefined || dto.precioUnitario !== undefined || dto.descuentoPorcentaje !== undefined) && subtotalCalculado === undefined) {
      const cantidad = dto.cantidad ?? detalleExistente.cantidad;
      const precioUnitario = dto.precioUnitario ?? detalleExistente.precioUnitario;
      const descuento = dto.descuentoPorcentaje ?? detalleExistente.descuentoPorcentaje ?? 0;
      subtotalCalculado = Number((Number(precioUnitario) * Number(cantidad) * (1 - Number(descuento) / 100)).toFixed(2));
    }

    // Preparar datos actualización
    const dataActualizacion: any = {
      modificado_por: dto.modificadoPor,
      fecha_modificacion: new Date(),
    };

    if (dto.cantidad !== undefined) dataActualizacion.cantidad = dto.cantidad;
    if (dto.idTecnicoEjecutor !== undefined) dataActualizacion.id_tecnico_ejecutor = dto.idTecnicoEjecutor;
    if (dto.fechaInicioServicio !== undefined) dataActualizacion.fecha_inicio_servicio = dto.fechaInicioServicio;
    if (dto.fechaFinServicio !== undefined) dataActualizacion.fecha_fin_servicio = dto.fechaFinServicio;
    if (dto.duracionServicioMinutos !== undefined) dataActualizacion.duracion_servicio_minutos = dto.duracionServicioMinutos;
    if (dto.precioUnitario !== undefined) dataActualizacion.precio_unitario = dto.precioUnitario;
    if (dto.descuentoPorcentaje !== undefined) dataActualizacion.descuento_porcentaje = dto.descuentoPorcentaje;
    if (subtotalCalculado !== undefined) dataActualizacion.subtotal = subtotalCalculado;
    if (dto.tieneGarantiaServicio !== undefined) dataActualizacion.tiene_garantia_servicio = dto.tieneGarantiaServicio;
    if (dto.mesesGarantiaServicio !== undefined) dataActualizacion.meses_garantia_servicio = dto.mesesGarantiaServicio;
    if (dto.observaciones !== undefined) dataActualizacion.observaciones = dto.observaciones;
    if (dto.justificacionPrecio !== undefined) dataActualizacion.justificacion_precio = dto.justificacionPrecio;
    if (dto.estadoServicio !== undefined) dataActualizacion.estado_servicio = dto.estadoServicio;

    const detalleActualizado = await this.repository.actualizar(id, dataActualizacion);
    return detalleActualizado;
  }
}
