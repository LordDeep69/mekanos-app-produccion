import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  evaluarValorContraRangos,
  extraerConfigEquipoDeOrden,
  resolverParametroConConfig,
} from '../../../config-parametros/parametros-override.helper';
import { PrismaService } from '../../../database/prisma.service';
import { ResponseMedicionDto } from '../../dto/response-medicion.dto';
import { PrismaMedicionesRepository } from '../../infrastructure/prisma-mediciones.repository';
import { NivelAlertaEnum } from '../enums/nivel-alerta.enum';
import { MedicionMapper } from '../mappers/medicion.mapper';
import { UpdateMedicionCommand } from './update-medicion.command';

/**
 * Handler para actualizar medición con RECÁLCULO AUTOMÁTICO DE RANGOS
 * FASE 3 - Refactorizado camelCase - Si cambia valorNumerico, recalcula nivel_alerta
 * ⚠️ Trigger BD recalcula fuera_de_rango automáticamente
 */

@CommandHandler(UpdateMedicionCommand)
export class UpdateMedicionHandler
  implements ICommandHandler<UpdateMedicionCommand, ResponseMedicionDto>
{
  constructor(
    @Inject('IMedicionesRepository')
    private readonly repository: PrismaMedicionesRepository,
    private readonly prisma: PrismaService,
    private readonly mapper: MedicionMapper,
  ) {}

  async execute(command: UpdateMedicionCommand): Promise<any> {
    const { id, dto } = command;

    // 1. Verificar que medición exista
    const medicionExistente = await this.repository.findById(id);
    if (!medicionExistente) {
      throw new NotFoundException(`Medición ID ${id} no encontrada`);
    }

    // 2. Obtener parámetro y contexto orden/equipo para resolver overrides del activo
    const [parametro, orden] = await Promise.all([
      this.prisma.parametros_medicion.findUnique({
        where: {
          id_parametro_medicion: medicionExistente.id_parametro_medicion,
        },
      }),
      this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: medicionExistente.id_orden_servicio },
        select: {
          equipos: { select: { config_parametros: true, plantillas_parametros: true } },
          ordenes_equipos: {
            select: {
              id_orden_equipo: true,
              equipos: { select: { config_parametros: true, plantillas_parametros: true } },
            },
          },
        },
      }),
    ]);

    if (!parametro) {
      throw new NotFoundException(
        `Parámetro de medición ID ${medicionExistente.id_parametro_medicion} no existe`,
      );
    }

    const { configEquipo, configPlantilla } = extraerConfigEquipoDeOrden(
      orden,
      medicionExistente.id_orden_equipo,
    );
    const resolved = resolverParametroConConfig(parametro, configEquipo, configPlantilla);

    // 3. Determinar si recalcular nivel_alerta y fuera_de_rango
    const valorNumericoFinal =
      dto.valorNumerico !== undefined
        ? dto.valorNumerico
        : medicionExistente.valor_numerico !== null &&
            medicionExistente.valor_numerico !== undefined
          ? Number(medicionExistente.valor_numerico)
          : undefined;

    let nivelAlerta = medicionExistente.nivel_alerta;
    let mensajeAlerta = medicionExistente.mensaje_alerta;
    let fueraDeRango = Boolean(medicionExistente.fuera_de_rango);
    const unidadMedidaFinal = medicionExistente.unidad_medida || resolved.unidadMedida;

    // 4. RECÁLCULO contra rangos efectivos (Equipo -> Plantilla -> Catálogo)
    if (
      valorNumericoFinal !== null &&
      valorNumericoFinal !== undefined &&
      parametro.tipo_dato === 'NUMERICO'
    ) {
      const ev = evaluarValorContraRangos(
        Number(valorNumericoFinal),
        resolved,
        unidadMedidaFinal,
        'OK',
      );
      nivelAlerta = ev.nivelAlerta as any;
      mensajeAlerta = ev.mensajeAlerta;
      fueraDeRango = ev.fueraDeRango;
    }

    // 5. Si se elimina valor numérico, cambiar a INFORMATIVO
    if (valorNumericoFinal === null || valorNumericoFinal === undefined) {
      nivelAlerta = NivelAlertaEnum.INFORMATIVO;
      fueraDeRango = false;
      mensajeAlerta = dto.valorTexto
        ? `Medición texto: ${dto.valorTexto}`
        : 'Medición sin valor numérico';
    }

    // 6. Actualizar con repository refactorizado (camelCase)
    const medicionActualizada = await this.repository.update(id, {
      valorNumerico: valorNumericoFinal,
      valorTexto: dto.valorTexto,
      unidadMedida: unidadMedidaFinal,
      fueraDeRango,
      nivelAlerta: nivelAlerta as any,
      mensajeAlerta: mensajeAlerta,
      observaciones: dto.observaciones,
      temperaturaAmbiente: dto.temperaturaAmbiente,
      humedadRelativa: dto.humedadRelativa,
      fechaMedicion: dto.fechaMedicion ? new Date(dto.fechaMedicion) : undefined,
      instrumentoMedicion: dto.instrumentoMedicion,
      // ✅ FIX 04-MAY-2026: Excluir/incluir medición del PDF
      excluidoPdf: dto.excluidoPdf,
    });

    return this.mapper.toDto(medicionActualizada);
  }
}
