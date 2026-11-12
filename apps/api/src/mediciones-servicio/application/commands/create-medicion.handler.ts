import { BadRequestException, Inject } from '@nestjs/common';
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
import { CreateMedicionCommand } from './create-medicion.command';

/**
 * Handler para crear medición con DETECCIÓN AUTOMÁTICA DE RANGOS - REFACTORIZADO
 * Tabla 10/14 - FASE 3 - camelCase
 * Lógica core: fueraDeRango (trigger BD) + nivelAlerta + mensajeAlerta (backend)
 */

@CommandHandler(CreateMedicionCommand)
export class CreateMedicionHandler
  implements ICommandHandler<CreateMedicionCommand, ResponseMedicionDto>
{
  constructor(
    @Inject('IMedicionesRepository')
    private readonly repository: PrismaMedicionesRepository,
    private readonly prisma: PrismaService,
    private readonly mapper: MedicionMapper,
  ) {}

  async execute(command: CreateMedicionCommand): Promise<any> {
    const { dto, userId } = command;

    // 1. Validar que exista al menos valorNumerico O valorTexto
    if (!dto.valorNumerico && !dto.valorTexto) {
      throw new BadRequestException(
        'Debe proporcionar valorNumerico o valorTexto (al menos uno requerido)',
      );
    }

    // 2. Obtener parámetro y orden/equipo para resolver overrides del activo
    const [parametro, orden] = await Promise.all([
      this.prisma.parametros_medicion.findUnique({
        where: { id_parametro_medicion: dto.idParametroMedicion },
      }),
      this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: dto.idOrdenServicio },
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
      throw new BadRequestException(
        `Parámetro de medición ID ${dto.idParametroMedicion} no existe`,
      );
    }

    const { configEquipo, configPlantilla } = extraerConfigEquipoDeOrden(orden, null);
    const resolved = resolverParametroConConfig(parametro, configEquipo, configPlantilla);

    // 3. Evaluar nivel alerta, fuera_de_rango y mensaje contra rango efectivo del equipo
    let nivelAlerta: NivelAlertaEnum = NivelAlertaEnum.OK;
    let mensajeAlerta: string | null = null;
    let fueraDeRango = false;

    if (
      dto.valorNumerico !== null &&
      dto.valorNumerico !== undefined &&
      parametro.tipo_dato === 'NUMERICO'
    ) {
      const ev = evaluarValorContraRangos(
        Number(dto.valorNumerico),
        resolved,
        resolved.unidadMedida,
        'OK',
      );
      nivelAlerta = ev.nivelAlerta as NivelAlertaEnum;
      mensajeAlerta = ev.mensajeAlerta;
      fueraDeRango = ev.fueraDeRango;
    }

    // 4. Si no es numérico, nivel INFORMATIVO
    if (
      parametro.tipo_dato !== 'NUMERICO' ||
      dto.valorNumerico === null ||
      dto.valorNumerico === undefined
    ) {
      nivelAlerta = NivelAlertaEnum.INFORMATIVO;
      fueraDeRango = false;
      mensajeAlerta = dto.valorTexto
        ? `Medición texto: ${dto.valorTexto}`
        : 'Medición registrada sin valor numérico';
    }

    // 5. Guardar medición con unidad y rangos efectivos resueltos
    const medicion = await this.repository.save({
      idOrdenServicio: dto.idOrdenServicio,
      idParametroMedicion: dto.idParametroMedicion,
      valorNumerico: dto.valorNumerico,
      valorTexto: dto.valorTexto,
      unidadMedida: resolved.unidadMedida,
      fueraDeRango,
      nivelAlerta: nivelAlerta,
      mensajeAlerta: mensajeAlerta ?? undefined,
      observaciones: dto.observaciones,
      temperaturaAmbiente: dto.temperaturaAmbiente,
      humedadRelativa: dto.humedadRelativa,
      fechaMedicion: dto.fechaMedicion ? new Date(dto.fechaMedicion) : new Date(),
      medidoPor: userId, // Usuario desde JWT
      instrumentoMedicion: dto.instrumentoMedicion,
    });

    return this.mapper.toDto(medicion);
  }
}
