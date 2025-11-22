import { PrismaService } from '@mekanos/database';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaParametrosMedicionRepository } from '../../infrastructure/prisma-parametros-medicion.repository';
import { ActualizarParametrosMedicionCommand } from './actualizar-parametros-medicion.command';

/**
 * Handler: Actualizar parámetro de medición existente
 * 
 * Validaciones críticas:
 * 1. Parámetro existe
 * 2. Código único si cambió (normalizado UPPER TRIM)
 * 3. Rangos coherentes con valores actuales + nuevos
 * 4. Crítico seguridad requiere rangos
 * 5. FK válidas (tipo_equipo, usuario modificador)
 */
@Injectable()
@CommandHandler(ActualizarParametrosMedicionCommand)
export class ActualizarParametrosMedicionHandler
  implements ICommandHandler<ActualizarParametrosMedicionCommand>
{
  constructor(
    private readonly repository: PrismaParametrosMedicionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: ActualizarParametrosMedicionCommand): Promise<any> {
    // 1. Verificar que el parámetro existe
    const parametroExistente = await this.repository.findById(command.id);
    if (!parametroExistente) {
      throw new NotFoundException(
        `Parámetro de medición con ID ${command.id} no existe`,
      );
    }

    // 2. Normalizar código si se proporciona
    let codigoNormalizado: string | undefined;
    if (command.codigoParametro) {
      codigoNormalizado = command.codigoParametro.toUpperCase().trim();

      // Validar unicidad solo si el código cambió
      if (codigoNormalizado !== parametroExistente.codigo_parametro) {
        const existente = await this.repository.findByCodigo(
          codigoNormalizado,
        );
        if (existente) {
          throw new ConflictException(
            `Ya existe un parámetro con código '${codigoNormalizado}'`,
          );
        }
      }
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

    // 4. Validar FK usuario modificador si se proporciona
    if (command.modificadoPor !== undefined) {
      const usuario = await this.prisma.usuarios.findUnique({
        where: { id_usuario: command.modificadoPor },
      });
      if (!usuario) {
        throw new NotFoundException(
          `Usuario modificador con ID ${command.modificadoPor} no existe`,
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

    // 6. Preparar valores combinados (actuales + nuevos) para validación rangos
    const tipoDato =
      command.tipoDato ?? parametroExistente.tipo_dato ?? 'NUMERICO';
    const valorMinimoNormal =
      command.valorMinimoNormal !== undefined
        ? command.valorMinimoNormal
        : parametroExistente.valor_minimo_normal
        ? Number(parametroExistente.valor_minimo_normal)
        : undefined;
    const valorMaximoNormal =
      command.valorMaximoNormal !== undefined
        ? command.valorMaximoNormal
        : parametroExistente.valor_maximo_normal
        ? Number(parametroExistente.valor_maximo_normal)
        : undefined;
    const valorMinimoCritico =
      command.valorMinimoCritico !== undefined
        ? command.valorMinimoCritico
        : parametroExistente.valor_minimo_critico
        ? Number(parametroExistente.valor_minimo_critico)
        : undefined;
    const valorMaximoCritico =
      command.valorMaximoCritico !== undefined
        ? command.valorMaximoCritico
        : parametroExistente.valor_maximo_critico
        ? Number(parametroExistente.valor_maximo_critico)
        : undefined;
    const esCriticoSeguridad =
      command.esCriticoSeguridad ?? parametroExistente.es_critico_seguridad;

    // 7. Validar rangos para tipo NUMERICO
    if (tipoDato === 'NUMERICO') {
      // Validar rango normal coherente
      if (
        valorMinimoNormal !== undefined &&
        valorMaximoNormal !== undefined &&
        valorMinimoNormal >= valorMaximoNormal
      ) {
        throw new BadRequestException(
          `valor_minimo_normal (${valorMinimoNormal}) debe ser menor que valor_maximo_normal (${valorMaximoNormal})`,
        );
      }

      // Validar rango crítico coherente
      if (
        valorMinimoCritico !== undefined &&
        valorMaximoCritico !== undefined &&
        valorMinimoCritico >= valorMaximoCritico
      ) {
        throw new BadRequestException(
          `valor_minimo_critico (${valorMinimoCritico}) debe ser menor que valor_maximo_critico (${valorMaximoCritico})`,
        );
      }

      // Validar rangos anidados: crítico ≤ normal ≤ crítico
      if (
        valorMinimoNormal !== undefined &&
        valorMinimoCritico !== undefined &&
        valorMinimoNormal < valorMinimoCritico
      ) {
        throw new BadRequestException(
          `valor_minimo_normal (${valorMinimoNormal}) no puede ser menor que valor_minimo_critico (${valorMinimoCritico})`,
        );
      }

      if (
        valorMaximoNormal !== undefined &&
        valorMaximoCritico !== undefined &&
        valorMaximoNormal > valorMaximoCritico
      ) {
        throw new BadRequestException(
          `valor_maximo_normal (${valorMaximoNormal}) no puede ser mayor que valor_maximo_critico (${valorMaximoCritico})`,
        );
      }
    }

    // 8. Validar crítico seguridad requiere rangos críticos
    if (esCriticoSeguridad === true) {
      if (
        tipoDato === 'NUMERICO' &&
        (valorMinimoCritico === undefined || valorMaximoCritico === undefined)
      ) {
        throw new BadRequestException(
          'Un parámetro crítico de seguridad tipo NUMERICO debe tener rangos críticos definidos',
        );
      }
    }

    // 9. Actualizar con relaciones FK (solo campos proporcionados)
    const updateData: any = {};

    if (codigoNormalizado) {
      updateData.codigo_parametro = codigoNormalizado;
    }
    if (command.nombreParametro) {
      updateData.nombre_parametro = command.nombreParametro;
    }
    if (command.unidadMedida) {
      updateData.unidad_medida = command.unidadMedida;
    }
    if (command.categoria) {
      updateData.categoria = command.categoria;
    }
    if (command.descripcion !== undefined) {
      updateData.descripcion = command.descripcion;
    }
    if (command.tipoDato) {
      updateData.tipo_dato = command.tipoDato;
    }
    if (command.valorMinimoNormal !== undefined) {
      updateData.valor_minimo_normal = command.valorMinimoNormal;
    }
    if (command.valorMaximoNormal !== undefined) {
      updateData.valor_maximo_normal = command.valorMaximoNormal;
    }
    if (command.valorMinimoCritico !== undefined) {
      updateData.valor_minimo_critico = command.valorMinimoCritico;
    }
    if (command.valorMaximoCritico !== undefined) {
      updateData.valor_maximo_critico = command.valorMaximoCritico;
    }
    if (command.valorIdeal !== undefined) {
      updateData.valor_ideal = command.valorIdeal;
    }
    if (command.esCriticoSeguridad !== undefined) {
      updateData.es_critico_seguridad = command.esCriticoSeguridad;
    }
    if (command.esObligatorio !== undefined) {
      updateData.es_obligatorio = command.esObligatorio;
    }
    if (command.decimalesPrecision !== undefined) {
      updateData.decimales_precision = command.decimalesPrecision;
    }
    if (command.activo !== undefined) {
      updateData.activo = command.activo;
    }
    if (command.observaciones !== undefined) {
      updateData.observaciones = command.observaciones;
    }

    // FK con connect/disconnect
    if (command.tipoEquipoId !== undefined) {
      updateData.tipos_equipo = command.tipoEquipoId
        ? { connect: { id_tipo_equipo: command.tipoEquipoId } }
        : { disconnect: true };
    }

    // Modificado por: SOLO conectar si tiene valor válido
    if (command.modificadoPor !== undefined && command.modificadoPor !== null) {
      updateData.usuarios_parametros_medicion_modificado_porTousuarios = {
        connect: { id_usuario: command.modificadoPor },
      };
    }

    return this.repository.update(command.id, updateData);
  }
}
