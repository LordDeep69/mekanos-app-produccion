import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { UpdateMedicionCommand } from './update-medicion.command';
import { PrismaMedicionesRepository } from '../../infrastructure/prisma-mediciones.repository';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Handler para actualizar medición con RECÁLCULO AUTOMÁTICO DE RANGOS
 * FASE 4.2 - Si cambia valor_numerico, recalcula fuera_de_rango + nivel_alerta
 */

@CommandHandler(UpdateMedicionCommand)
export class UpdateMedicionHandler
  implements ICommandHandler<UpdateMedicionCommand>
{
  constructor(
    @Inject('IMedicionesRepository')
    private readonly repository: PrismaMedicionesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: UpdateMedicionCommand): Promise<any> {
    const { dto } = command;

    // 1. Verificar que medición exista
    const medicionExistente = await this.repository.findById(dto.id_medicion);
    if (!medicionExistente) {
      throw new NotFoundException(
        `Medición ID ${dto.id_medicion} no encontrada`,
      );
    }

    // 2. Obtener parámetro para recalcular rangos
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

    // 3. Determinar si recalcular (si cambia valor_numerico)
    const valorNumericoFinal =
      dto.valor_numerico !== undefined
        ? dto.valor_numerico
        : medicionExistente.valor_numerico;

    let fueraDeRango = medicionExistente.fuera_de_rango;
    let nivelAlerta = medicionExistente.nivel_alerta;
    let mensajeAlerta = medicionExistente.mensaje_alerta;

    // 4. RECÁLCULO si cambia valor o si es actualización de otro campo numérico
    if (
      valorNumericoFinal !== null &&
      valorNumericoFinal !== undefined &&
      parametro.tipo_dato === 'NUMERICO'
    ) {
      const valor = Number(valorNumericoFinal);
      fueraDeRango = false;
      nivelAlerta = 'OK';
      mensajeAlerta = `Valor ${valor} dentro de rango normal`;

      // Validar rangos críticos
      if (
        parametro.valor_minimo_critico !== null &&
        valor < Number(parametro.valor_minimo_critico)
      ) {
        fueraDeRango = true;
        nivelAlerta = 'CRITICO';
        mensajeAlerta = `Valor ${valor} por debajo del mínimo crítico ${parametro.valor_minimo_critico} ${parametro.unidad_medida}`;
      } else if (
        parametro.valor_maximo_critico !== null &&
        valor > Number(parametro.valor_maximo_critico)
      ) {
        fueraDeRango = true;
        nivelAlerta = 'CRITICO';
        mensajeAlerta = `Valor ${valor} por encima del máximo crítico ${parametro.valor_maximo_critico} ${parametro.unidad_medida}`;
      }
      // Validar rangos normales
      else if (
        parametro.valor_minimo_normal !== null &&
        valor < Number(parametro.valor_minimo_normal)
      ) {
        fueraDeRango = true;
        nivelAlerta = 'ADVERTENCIA';
        mensajeAlerta = `Valor ${valor} por debajo del mínimo normal ${parametro.valor_minimo_normal} ${parametro.unidad_medida}`;
      } else if (
        parametro.valor_maximo_normal !== null &&
        valor > Number(parametro.valor_maximo_normal)
      ) {
        fueraDeRango = true;
        nivelAlerta = 'ADVERTENCIA';
        mensajeAlerta = `Valor ${valor} por encima del máximo normal ${parametro.valor_maximo_normal} ${parametro.unidad_medida}`;
      }
    }

    // 5. Si se elimina valor numérico, cambiar a INFORMATIVO
    if (valorNumericoFinal === null || valorNumericoFinal === undefined) {
      nivelAlerta = 'INFORMATIVO';
      mensajeAlerta = dto.valor_texto
        ? `Medición texto: ${dto.valor_texto}`
        : 'Medición sin valor numérico';
    }

    // 6. Actualizar medición (preservar medido_por original)
    const medicionActualizada = await this.repository.save({
      id_medicion: dto.id_medicion,
      id_orden_servicio: medicionExistente.id_orden_servicio, // Inmutable
      id_parametro_medicion: medicionExistente.id_parametro_medicion, // Inmutable
      valor_numerico: valorNumericoFinal,
      valor_texto: dto.valor_texto ?? medicionExistente.valor_texto,
      unidad_medida: dto.unidad_medida ?? medicionExistente.unidad_medida,
      fuera_de_rango: fueraDeRango,
      nivel_alerta: nivelAlerta,
      mensaje_alerta: mensajeAlerta,
      observaciones: dto.observaciones ?? medicionExistente.observaciones,
      temperatura_ambiente:
        dto.temperatura_ambiente ?? medicionExistente.temperatura_ambiente,
      humedad_relativa:
        dto.humedad_relativa ?? medicionExistente.humedad_relativa,
      fecha_medicion:
        dto.fecha_medicion !== undefined
          ? new Date(dto.fecha_medicion)
          : medicionExistente.fecha_medicion,
      medido_por: medicionExistente.medido_por, // Preservar original
      instrumento_medicion:
        dto.instrumento_medicion ?? medicionExistente.instrumento_medicion,
    });

    return medicionActualizada;
  }
}
