import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
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

    // 2. Obtener parámetro para validar rangos
    const parametro = await this.prisma.parametros_medicion.findUnique({
      where: { id_parametro_medicion: dto.idParametroMedicion },
    });

    if (!parametro) {
      throw new BadRequestException(
        `Parámetro de medición ID ${dto.idParametroMedicion} no existe`,
      );
    }

    // 3. LÓGICA CORE: Detectar nivel alerta y mensaje
    // ⚠️ Nota: fuera_de_rango lo calcula el trigger BD comparando rangos críticos
    // Backend calcula nivel_alerta (OK, ADVERTENCIA, CRITICO, INFORMATIVO)
    let nivelAlerta: NivelAlertaEnum = NivelAlertaEnum.OK;
    let mensajeAlerta: string | null = null;

    if (
      dto.valorNumerico !== null &&
      dto.valorNumerico !== undefined &&
      parametro.tipo_dato === 'NUMERICO'
    ) {
      const valor = Number(dto.valorNumerico);

      // Validar rangos críticos (priority 1)
      if (
        parametro.valor_minimo_critico !== null &&
        valor < Number(parametro.valor_minimo_critico)
      ) {
        nivelAlerta = NivelAlertaEnum.CRITICO;
        mensajeAlerta = `Valor ${valor} por debajo del mínimo crítico ${parametro.valor_minimo_critico} ${parametro.unidad_medida}`;
      } else if (
        parametro.valor_maximo_critico !== null &&
        valor > Number(parametro.valor_maximo_critico)
      ) {
        nivelAlerta = NivelAlertaEnum.CRITICO;
        mensajeAlerta = `Valor ${valor} por encima del máximo crítico ${parametro.valor_maximo_critico} ${parametro.unidad_medida}`;
      }
      // Validar rangos normales (priority 2)
      else if (
        parametro.valor_minimo_normal !== null &&
        valor < Number(parametro.valor_minimo_normal)
      ) {
        nivelAlerta = NivelAlertaEnum.ADVERTENCIA;
        mensajeAlerta = `Valor ${valor} por debajo del mínimo normal ${parametro.valor_minimo_normal} ${parametro.unidad_medida}`;
      } else if (
        parametro.valor_maximo_normal !== null &&
        valor > Number(parametro.valor_maximo_normal)
      ) {
        nivelAlerta = NivelAlertaEnum.ADVERTENCIA;
        mensajeAlerta = `Valor ${valor} por encima del máximo normal ${parametro.valor_maximo_normal} ${parametro.unidad_medida}`;
      }
      // Dentro de rango normal
      else {
        nivelAlerta = NivelAlertaEnum.OK;
        mensajeAlerta = `Valor ${valor} dentro de rango normal`;
      }
    }

    // 4. Si no es numérico, nivel INFORMATIVO
    if (
      parametro.tipo_dato !== 'NUMERICO' ||
      dto.valorNumerico === null ||
      dto.valorNumerico === undefined
    ) {
      nivelAlerta = NivelAlertaEnum.INFORMATIVO;
      mensajeAlerta = dto.valorTexto
        ? `Medición texto: ${dto.valorTexto}`
        : 'Medición registrada sin valor numérico';
    }

    // 5. Guardar medición con flags calculados
    // ⚠️ Trigger BD establecerá fuera_de_rango y copiará unidad_medida
    const medicion = await this.repository.save({
      idOrdenServicio: dto.idOrdenServicio,
      idParametroMedicion: dto.idParametroMedicion,
      valorNumerico: dto.valorNumerico,
      valorTexto: dto.valorTexto,
      nivelAlerta: nivelAlerta,
      mensajeAlerta: mensajeAlerta ?? undefined,
      observaciones: dto.observaciones,
      temperaturaAmbiente: dto.temperaturaAmbiente,
      humedadRelativa: dto.humedadRelativa,
      fechaMedicion: dto.fechaMedicion
        ? new Date(dto.fechaMedicion)
        : new Date(),
      medidoPor: userId, // Usuario desde JWT
      instrumentoMedicion: dto.instrumentoMedicion,
    });

    return this.mapper.toDto(medicion);
  }
}
