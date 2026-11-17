import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject, Optional } from '@nestjs/common';
import { CreateEquipoCommand } from './create-equipo.command';
import { PrismaEquipoRepository } from '../infrastructure/prisma-equipo.repository';
import { EquipoFilterProjectionService } from '../services/equipo-filter-projection.service';

/**
 * Handler para el comando CreateEquipo
 * ✅ FASE 2: Usa PrismaEquipoRepository con schema real + proyección EAM
 */
@CommandHandler(CreateEquipoCommand)
export class CreateEquipoHandler implements ICommandHandler<CreateEquipoCommand> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: PrismaEquipoRepository,
    @Optional() private readonly projectionService?: EquipoFilterProjectionService,
  ) {}

  async execute(command: CreateEquipoCommand): Promise<any> {
    const { dto, userId } = command;

    // Validar que el código no exista
    const existeCodigo = await this.equipoRepository.existsByCodigo(dto.codigo_equipo);
    if (existeCodigo) {
      throw new ConflictException(`Ya existe un equipo con el código ${dto.codigo_equipo}`);
    }

    const lecturaUso = dto.lectura_uso_actual ?? dto.horas_actuales;

    // Persistir con campos reales
    const saved = await this.equipoRepository.save({
      codigo_equipo: dto.codigo_equipo,
      id_cliente: dto.id_cliente,
      id_tipo_equipo: dto.id_tipo_equipo,
      ubicacion_texto: dto.ubicacion_texto,
      id_sede: dto.id_sede || null,
      id_modelo_equipo: dto.id_modelo_equipo || null,
      nombre_equipo: dto.nombre_equipo || null,
      numero_serie_equipo: dto.numero_serie_equipo || null,
      estado_equipo: dto.estado_equipo || 'OPERATIVO',
      criticidad: dto.criticidad || 'MEDIA',
      horas_actuales: lecturaUso ?? null,
      lectura_uso_actual: lecturaUso ?? null,
      fecha_ultima_lectura_uso: lecturaUso !== undefined && lecturaUso !== null ? new Date() : null,
      especificaciones: dto.especificaciones,
      creado_por: userId,
    });

    if (saved?.id_equipo && dto.especificaciones && this.projectionService) {
      try {
        await this.projectionService.reconstruirJsonYProyectar(
          saved.id_equipo,
          undefined,
          dto.especificaciones,
        );
      } catch {
        // Non-blocking EAM projection
      }
    }

    return saved;
  }
}
