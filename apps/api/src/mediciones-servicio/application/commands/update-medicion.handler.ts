import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
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

    // 2. Obtener parámetro para recalcular rangos si cambia valorNumerico
    const parametro = await this.prisma.parametros_medicion.findUnique({
      where: {
        id_parametro_medicion: medicionExistente.id_parametro_medicion,
      },
    });

    if (!parametro) {
      throw new NotFoundException(
        `Parámetro de medición ID ${medicionExistente.id_parametro_medicion} no existe`,
      );
    }

    // 3. Determinar si recalcular nivel_alerta (si cambia valorNumerico)
    const valorNumericoFinal =
      dto.valorNumerico !== undefined
        ? dto.valorNumerico
        : Number(medicionExistente.valor_numerico);

    let nivelAlerta = medicionExistente.nivel_alerta;
    let mensajeAlerta = medicionExistente.mensaje_alerta;

    // 4. RECÁLCULO si cambia valor numérico
    if (
      valorNumericoFinal !== null &&
      valorNumericoFinal !== undefined &&
      parametro.tipo_dato === 'NUMERICO'
    ) {
      const valor = Number(valorNumericoFinal);
      nivelAlerta = NivelAlertaEnum.OK;
      mensajeAlerta = `Valor ${valor} dentro de rango normal`;

      // Validar rangos críticos (PRIORITY 1)
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
      // Validar rangos normales (PRIORITY 2)
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
    }

    // 5. Si se elimina valor numérico, cambiar a INFORMATIVO
    if (valorNumericoFinal === null || valorNumericoFinal === undefined) {
      nivelAlerta = NivelAlertaEnum.INFORMATIVO;
      mensajeAlerta = dto.valorTexto
        ? `Medición texto: ${dto.valorTexto}`
        : 'Medición sin valor numérico';
    }

    // 6. Actualizar con repository refactorizado (camelCase)
    const medicionActualizada = await this.repository.update(id, {
      valorNumerico: valorNumericoFinal,
      valorTexto: dto.valorTexto,
      nivelAlerta: nivelAlerta as any,
      mensajeAlerta: mensajeAlerta,
      observaciones: dto.observaciones,
      temperaturaAmbiente: dto.temperaturaAmbiente,
      humedadRelativa: dto.humedadRelativa,
      fechaMedicion: dto.fechaMedicion
        ? new Date(dto.fechaMedicion)
        : undefined,
      instrumentoMedicion: dto.instrumentoMedicion,
    });

    return this.mapper.toDto(medicionActualizada);
  }
}
