import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject } from '@nestjs/common';
import { CreateEquipoCommand } from './create-equipo.command';
import { PrismaEquipoRepository } from '../infrastructure/prisma-equipo.repository';

/**
 * Handler para el comando CreateEquipo
 * ✅ FASE 2: Usa PrismaEquipoRepository con schema real
 */
@CommandHandler(CreateEquipoCommand)
export class CreateEquipoHandler implements ICommandHandler<CreateEquipoCommand> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: PrismaEquipoRepository
  ) {}

  async execute(command: CreateEquipoCommand): Promise<any> {
    const { dto, userId } = command;

    // Validar que el código no exista
    const existeCodigo = await this.equipoRepository.existsByCodigo(dto.codigo_equipo);
    if (existeCodigo) {
      throw new ConflictException(`Ya existe un equipo con el código ${dto.codigo_equipo}`);
    }

    // Persistir con campos reales
    return await this.equipoRepository.save({
      codigo_equipo: dto.codigo_equipo,
      id_cliente: dto.id_cliente,
      id_tipo_equipo: dto.id_tipo_equipo,
      ubicacion_texto: dto.ubicacion_texto,
      id_sede: dto.id_sede || null,
      nombre_equipo: dto.nombre_equipo || null,
      numero_serie_equipo: dto.numero_serie_equipo || null,
      estado_equipo: dto.estado_equipo || 'OPERATIVO',
      criticidad: dto.criticidad || 'MEDIA',
      creado_por: userId,
    });
  }
}
