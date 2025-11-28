import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../database/prisma.service';
import { IDetalleServiciosOrdenRepository } from '../../domain/detalle-servicios-orden.repository.interface';
import { CrearDetalleServiciosOrdenCommand } from '../commands/crear-detalle-servicios-orden.command';
import { DetalleServiciosOrdenResponseDto } from '../dto/detalle-servicios-orden-response.dto';

@CommandHandler(CrearDetalleServiciosOrdenCommand)
export class CrearDetalleServiciosOrdenHandler implements ICommandHandler<CrearDetalleServiciosOrdenCommand> {
  constructor(
    @Inject('IDetalleServiciosOrdenRepository')
    private readonly repository: IDetalleServiciosOrdenRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CrearDetalleServiciosOrdenCommand): Promise<DetalleServiciosOrdenResponseDto> {
    const { dto } = command;

    // ✅ Validación FK REQUERIDO: id_orden_servicio
    const ordenExists = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: dto.idOrdenServicio },
    });
    if (!ordenExists) {
      throw new NotFoundException(`Orden de servicio con ID ${dto.idOrdenServicio} no encontrada`);
    }

    // ✅ Validación FK REQUERIDO: id_servicio
    const servicioExists = await this.prisma.catalogo_servicios.findUnique({
      where: { id_servicio: dto.idServicio },
    });
    if (!servicioExists) {
      throw new NotFoundException(`Servicio con ID ${dto.idServicio} no encontrado`);
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

    // ✅ Validación FK OPCIONAL: registrado_por
    if (dto.registradoPor) {
      const usuarioExists = await this.prisma.usuarios.findUnique({
        where: { id_usuario: dto.registradoPor },
      });
      if (!usuarioExists) {
        throw new NotFoundException(`Usuario con ID ${dto.registradoPor} no encontrado`);
      }
    }

    // ✅ Validación CHECK: cantidad > 0
    if (dto.cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    // ✅ Validación CHECK: precio_unitario >= 0
    if (dto.precioUnitario < 0) {
      throw new BadRequestException('El precio unitario no puede ser negativo');
    }

    // ✅ Validación CHECK: descuento_porcentaje BETWEEN 0 AND 100
    if (dto.descuentoPorcentaje !== undefined && (dto.descuentoPorcentaje < 0 || dto.descuentoPorcentaje > 100)) {
      throw new BadRequestException('El descuento debe estar entre 0 y 100');
    }

    // ✅ Validación CHECK: duracion_servicio_minutos > 0
    if (dto.duracionServicioMinutos !== undefined && dto.duracionServicioMinutos <= 0) {
      throw new BadRequestException('La duración debe ser mayor a 0 minutos');
    }

    // ✅ Validación CHECK: fecha_fin >= fecha_inicio
    if (dto.fechaInicioServicio && dto.fechaFinServicio && dto.fechaFinServicio < dto.fechaInicioServicio) {
      throw new BadRequestException('La fecha de fin debe ser posterior o igual a la fecha de inicio');
    }

    // ✅ Validación NEGOCIO: Garantía coherente
    if (dto.tieneGarantiaServicio && (!dto.mesesGarantiaServicio || dto.mesesGarantiaServicio <= 0)) {
      throw new BadRequestException('Si tiene garantía, debe especificar los meses de garantía (mayor a 0)');
    }

    // ✅ Calcular subtotal si no viene: (precio_unitario * cantidad) * (1 - descuento/100)
    let subtotalCalculado = dto.subtotal;
    if (subtotalCalculado === undefined) {
      const descuento = dto.descuentoPorcentaje ?? 0;
      subtotalCalculado = Number((dto.precioUnitario * dto.cantidad * (1 - descuento / 100)).toFixed(2));
    }

    // Crear detalle
    const detalle = await this.repository.crear({
      id_orden_servicio: dto.idOrdenServicio,
      id_servicio: dto.idServicio,
      cantidad: dto.cantidad,
      id_tecnico_ejecutor: dto.idTecnicoEjecutor,
      fecha_inicio_servicio: dto.fechaInicioServicio,
      fecha_fin_servicio: dto.fechaFinServicio,
      duracion_servicio_minutos: dto.duracionServicioMinutos,
      precio_unitario: dto.precioUnitario,
      descuento_porcentaje: dto.descuentoPorcentaje ?? 0,
      subtotal: subtotalCalculado,
      tiene_garantia_servicio: dto.tieneGarantiaServicio ?? false,
      meses_garantia_servicio: dto.mesesGarantiaServicio,
      observaciones: dto.observaciones,
      justificacion_precio: dto.justificacionPrecio,
      estado_servicio: dto.estadoServicio ?? 'PENDIENTE',
      registrado_por: dto.registradoPor,
    });

    return detalle;
  }
}
