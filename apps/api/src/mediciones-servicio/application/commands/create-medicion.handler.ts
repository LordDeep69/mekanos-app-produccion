import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, BadRequestException } from '@nestjs/common';
import { CreateMedicionCommand } from './create-medicion.command';
import { PrismaMedicionesRepository } from '../../infrastructure/prisma-mediciones.repository';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Handler para crear medición con DETECCIÓN AUTOMÁTICA DE RANGOS
 * FASE 4.2 - Lógica core: fuera_de_rango + nivel_alerta calculados
 */

@CommandHandler(CreateMedicionCommand)
export class CreateMedicionHandler
  implements ICommandHandler<CreateMedicionCommand>
{
  constructor(
    @Inject('IMedicionesRepository')
    private readonly repository: PrismaMedicionesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CreateMedicionCommand): Promise<any> {
    const { dto, userId } = command;

    // 1. Obtener parámetro para validar rangos
    const parametro = await this.prisma.parametros_medicion.findUnique({
      where: { id_parametro_medicion: dto.id_parametro_medicion },
    });

    if (!parametro) {
      throw new BadRequestException(
        `Parámetro de medición ID ${dto.id_parametro_medicion} no existe`,
      );
    }

    // 2. LÓGICA CORE: Detectar fuera de rango y nivel alerta
    let fueraDeRango = false;
    let nivelAlerta: 'OK' | 'ADVERTENCIA' | 'CRITICO' | 'INFORMATIVO' = 'OK';
    let mensajeAlerta: string | null = null;

    if (
      dto.valor_numerico !== null &&
      dto.valor_numerico !== undefined &&
      parametro.tipo_dato === 'NUMERICO'
    ) {
      const valor = Number(dto.valor_numerico);

      // Validar rangos críticos (priority 1)
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
      // Validar rangos normales (priority 2)
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
      // Dentro de rango normal
      else {
        nivelAlerta = 'OK';
        mensajeAlerta = `Valor ${valor} dentro de rango normal`;
      }
    }

    // 3. Si no es numérico, nivel INFORMATIVO
    if (
      parametro.tipo_dato !== 'NUMERICO' ||
      dto.valor_numerico === null ||
      dto.valor_numerico === undefined
    ) {
      nivelAlerta = 'INFORMATIVO';
      mensajeAlerta = dto.valor_texto
        ? `Medición texto: ${dto.valor_texto}`
        : 'Medición registrada sin valor numérico';
    }

    // 4. Guardar medición con flags calculados
    const medicion = await this.repository.save({
      id_orden_servicio: dto.id_orden_servicio,
      id_parametro_medicion: dto.id_parametro_medicion,
      valor_numerico: dto.valor_numerico,
      valor_texto: dto.valor_texto,
      unidad_medida: dto.unidad_medida || parametro.unidad_medida,
      fuera_de_rango: fueraDeRango,
      nivel_alerta: nivelAlerta,
      mensaje_alerta: mensajeAlerta ?? undefined, // ✅ FIX: Convert null to undefined
      observaciones: dto.observaciones,
      temperatura_ambiente: dto.temperatura_ambiente,
      humedad_relativa: dto.humedad_relativa,
      fecha_medicion: dto.fecha_medicion
        ? new Date(dto.fecha_medicion)
        : new Date(),
      medido_por: userId, // Usuario desde JWT
      instrumento_medicion: dto.instrumento_medicion,
    });

    return medicion;
  }
}
