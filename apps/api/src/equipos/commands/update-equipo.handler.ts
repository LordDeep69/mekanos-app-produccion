import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaEquipoRepository } from '../infrastructure/prisma-equipo.repository';
import { UpdateEquipoCommand } from './update-equipo.command';

/**
 * Handler para el comando UpdateEquipo
 * ✅ FASE 2: Usa PrismaEquipoRepository con schema real
 */
@CommandHandler(UpdateEquipoCommand)
export class UpdateEquipoHandler implements ICommandHandler<UpdateEquipoCommand> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: PrismaEquipoRepository
  ) { }

  async execute(command: UpdateEquipoCommand): Promise<any> {
    const { equipoId, dto, userId } = command;

    // Obtener equipo existente
    const equipo = await this.equipoRepository.findById(equipoId);
    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${equipoId} no encontrado`);
    }

    // ✅ 23-FEB-2026: Actualizar con TODOS los campos base del equipo
    return await this.equipoRepository.save({
      id_equipo: equipoId,
      codigo_equipo: dto.codigo_equipo || equipo.codigo_equipo,
      id_cliente: dto.id_cliente || equipo.id_cliente,
      id_tipo_equipo: dto.id_tipo_equipo || equipo.id_tipo_equipo,
      ubicacion_texto: dto.ubicacion_texto || equipo.ubicacion_texto,
      id_sede: dto.id_sede !== undefined ? dto.id_sede : equipo.id_sede,
      nombre_equipo: dto.nombre_equipo !== undefined ? dto.nombre_equipo : equipo.nombre_equipo,
      numero_serie_equipo: dto.numero_serie_equipo !== undefined ? dto.numero_serie_equipo : equipo.numero_serie_equipo,
      estado_equipo: dto.estado_equipo || (equipo.estado_equipo as string),
      criticidad: dto.criticidad || (equipo.criticidad as string),
      criticidad_justificacion: dto.criticidad_justificacion !== undefined ? dto.criticidad_justificacion : (equipo.criticidad_justificacion as string | null),
      fecha_instalacion: dto.fecha_instalacion !== undefined ? (dto.fecha_instalacion ? new Date(dto.fecha_instalacion) : null) : (equipo.fecha_instalacion as Date | null),
      fecha_inicio_servicio_mekanos: dto.fecha_inicio_servicio_mekanos !== undefined ? (dto.fecha_inicio_servicio_mekanos ? new Date(dto.fecha_inicio_servicio_mekanos) : null) : (equipo.fecha_inicio_servicio_mekanos as Date | null),
      en_garantia: dto.en_garantia !== undefined ? dto.en_garantia : (equipo.en_garantia as boolean),
      fecha_inicio_garantia: dto.fecha_inicio_garantia !== undefined ? (dto.fecha_inicio_garantia ? new Date(dto.fecha_inicio_garantia) : null) : (equipo.fecha_inicio_garantia as Date | null),
      fecha_fin_garantia: dto.fecha_fin_garantia !== undefined ? (dto.fecha_fin_garantia ? new Date(dto.fecha_fin_garantia) : null) : (equipo.fecha_fin_garantia as Date | null),
      proveedor_garantia: dto.proveedor_garantia !== undefined ? dto.proveedor_garantia : (equipo.proveedor_garantia as string | null),
      estado_pintura: dto.estado_pintura !== undefined ? dto.estado_pintura : (equipo.estado_pintura as string | null),
      requiere_pintura: dto.requiere_pintura !== undefined ? dto.requiere_pintura : (equipo.requiere_pintura as boolean),
      tipo_contrato: dto.tipo_contrato !== undefined ? dto.tipo_contrato : (equipo.tipo_contrato as string | null),
      intervalo_tipo_a_dias_override: dto.intervalo_tipo_a_dias_override !== undefined ? dto.intervalo_tipo_a_dias_override : (equipo.intervalo_tipo_a_dias_override as number | null),
      intervalo_tipo_a_horas_override: dto.intervalo_tipo_a_horas_override !== undefined ? dto.intervalo_tipo_a_horas_override : (equipo.intervalo_tipo_a_horas_override as number | null),
      intervalo_tipo_b_dias_override: dto.intervalo_tipo_b_dias_override !== undefined ? dto.intervalo_tipo_b_dias_override : (equipo.intervalo_tipo_b_dias_override as number | null),
      intervalo_tipo_b_horas_override: dto.intervalo_tipo_b_horas_override !== undefined ? dto.intervalo_tipo_b_horas_override : (equipo.intervalo_tipo_b_horas_override as number | null),
      criterio_intervalo_override: dto.criterio_intervalo_override !== undefined ? dto.criterio_intervalo_override : (equipo.criterio_intervalo_override as string | null),
      observaciones_generales: dto.observaciones_generales !== undefined ? dto.observaciones_generales : (equipo.observaciones_generales as string | null),
      configuracion_especial: dto.configuracion_especial !== undefined ? dto.configuracion_especial : (equipo.configuracion_especial as string | null),
      config_parametros: dto.config_parametros !== undefined ? dto.config_parametros : (equipo.config_parametros as Record<string, any> | undefined),
      creado_por: equipo.creado_por,
      modificado_por: userId,
    });
  }
}
