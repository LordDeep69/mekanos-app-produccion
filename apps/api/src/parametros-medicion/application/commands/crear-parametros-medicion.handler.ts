import { PrismaService } from '@mekanos/database';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaParametrosMedicionRepository } from '../../infrastructure/prisma-parametros-medicion.repository';
import { CrearParametrosMedicionCommand } from './crear-parametros-medicion.command';

/**
 * Handler: Crear nuevo parámetro de medición
 * 
 * Validaciones críticas:
 * 1. Código único (normalizado UPPER TRIM)
 * 2. Rangos coherentes (mínimo < máximo para normal y crítico)
 * 3. Rangos anidados válidos (crítico ≤ normal ≤ crítico)
 * 4. Crítico seguridad requiere rangos definidos
 * 5. Decimales precisión entre 0-4
 * 6. FK válidas (tipo_equipo, usuario creador)
 */
@Injectable()
@CommandHandler(CrearParametrosMedicionCommand)
export class CrearParametrosMedicionHandler
  implements ICommandHandler<CrearParametrosMedicionCommand>
{
  constructor(
    private readonly repository: PrismaParametrosMedicionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CrearParametrosMedicionCommand): Promise<any> {
    // 1. Normalizar código a UPPER TRIM
    const codigoNormalizado = command.codigoParametro.toUpperCase().trim();

    // 2. Validar unicidad de código
    const existente = await this.repository.findByCodigo(codigoNormalizado);
    if (existente) {
      throw new ConflictException(
        `Ya existe un parámetro con código '${codigoNormalizado}'`,
      );
    }

    // 3. Validar FK tipo_equipo si se proporciona
    if (command.tipoEquipoId !== undefined) {
      const tipoEquipo = await this.prisma.tipos_equipo.findUnique({
        where: { id_tipo_equipo: command.tipoEquipoId },
      });
      if (!tipoEquipo) {
        throw new NotFoundException(
          `Tipo de equipo con ID ${command.tipoEquipoId} no existe`,
        );
      }
    }

    // 4. Validar FK usuario creador si se proporciona
    if (command.creadoPor !== undefined) {
      const usuario = await this.prisma.usuarios.findUnique({
        where: { id_usuario: command.creadoPor },
      });
      if (!usuario) {
        throw new NotFoundException(
          `Usuario creador con ID ${command.creadoPor} no existe`,
        );
      }
    }

    // 5. Validar decimales_precision entre 0-4
    if (
      command.decimalesPrecision !== undefined &&
      (command.decimalesPrecision < 0 || command.decimalesPrecision > 4)
    ) {
      throw new BadRequestException(
        'decimales_precision debe estar entre 0 y 4',
      );
    }

    // 6. Validar rangos para tipo NUMERICO
    const tipoDato = command.tipoDato ?? 'NUMERICO';
    if (tipoDato === 'NUMERICO') {
      // Validar rango normal coherente
      if (
        command.valorMinimoNormal !== undefined &&
        command.valorMaximoNormal !== undefined &&
        command.valorMinimoNormal >= command.valorMaximoNormal
      ) {
        throw new BadRequestException(
          `valor_minimo_normal (${command.valorMinimoNormal}) debe ser menor que valor_maximo_normal (${command.valorMaximoNormal})`,
        );
      }

      // Validar rango crítico coherente
      if (
        command.valorMinimoCritico !== undefined &&
        command.valorMaximoCritico !== undefined &&
        command.valorMinimoCritico >= command.valorMaximoCritico
      ) {
        throw new BadRequestException(
          `valor_minimo_critico (${command.valorMinimoCritico}) debe ser menor que valor_maximo_critico (${command.valorMaximoCritico})`,
        );
      }

      // Validar rangos anidados: crítico ≤ normal ≤ crítico
      // Validación backend (delegada desde constraints SQL v2.0)
      if (
        command.valorMinimoNormal !== undefined &&
        command.valorMinimoCritico !== undefined &&
        command.valorMinimoNormal < command.valorMinimoCritico
      ) {
        throw new BadRequestException(
          `valor_minimo_normal (${command.valorMinimoNormal}) no puede ser menor que valor_minimo_critico (${command.valorMinimoCritico})`,
        );
      }

      if (
        command.valorMaximoNormal !== undefined &&
        command.valorMaximoCritico !== undefined &&
        command.valorMaximoNormal > command.valorMaximoCritico
      ) {
        throw new BadRequestException(
          `valor_maximo_normal (${command.valorMaximoNormal}) no puede ser mayor que valor_maximo_critico (${command.valorMaximoCritico})`,
        );
      }
    }

    // 7. Validar crítico seguridad requiere rangos críticos
    if (command.esCriticoSeguridad === true) {
      if (
        tipoDato === 'NUMERICO' &&
        (command.valorMinimoCritico === undefined ||
          command.valorMaximoCritico === undefined)
      ) {
        throw new BadRequestException(
          'Un parámetro crítico de seguridad tipo NUMERICO debe tener rangos críticos definidos',
        );
      }
    }

    // 8. Crear parámetro con relaciones FK
    return this.repository.create({
      codigo_parametro: codigoNormalizado,
      nombre_parametro: command.nombreParametro,
      unidad_medida: command.unidadMedida,
      categoria: command.categoria as any,
      descripcion: command.descripcion,
      tipo_dato: (command.tipoDato as any) ?? 'NUMERICO',
      valor_minimo_normal: command.valorMinimoNormal,
      valor_maximo_normal: command.valorMaximoNormal,
      valor_minimo_critico: command.valorMinimoCritico,
      valor_maximo_critico: command.valorMaximoCritico,
      valor_ideal: command.valorIdeal,
      es_critico_seguridad: command.esCriticoSeguridad ?? false,
      es_obligatorio: command.esObligatorio ?? false,
      decimales_precision: command.decimalesPrecision ?? 2,
      activo: command.activo ?? true,
      observaciones: command.observaciones,
      // FK con connect SOLO si tiene valor (sin undefined para evitar errores Prisma)
      ...(command.tipoEquipoId && {
        tipos_equipo: { connect: { id_tipo_equipo: command.tipoEquipoId } },
      }),
      ...(command.creadoPor && {
        usuarios_parametros_medicion_creado_porTousuarios: {
          connect: { id_usuario: command.creadoPor },
        },
      }),
    });
  }
}
