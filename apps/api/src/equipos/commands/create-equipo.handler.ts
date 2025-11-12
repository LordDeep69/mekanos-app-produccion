import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject } from '@nestjs/common';
import { CreateEquipoCommand } from './create-equipo.command';
import { IEquipoRepository, EquipoEntity } from '@mekanos/core';

/**
 * Handler para el comando CreateEquipo
 * Implementa la lógica de creación de equipos
 */
@CommandHandler(CreateEquipoCommand)
export class CreateEquipoHandler implements ICommandHandler<CreateEquipoCommand> {
  constructor(
    @Inject('IEquipoRepository')
    private readonly equipoRepository: IEquipoRepository
  ) {}

  async execute(command: CreateEquipoCommand): Promise<EquipoEntity> {
    const { dto } = command;

    // Validar que el código no exista
    const existeCodigo = await this.equipoRepository.existsByCodigo(dto.codigo);
    if (existeCodigo) {
      throw new ConflictException(`Ya existe un equipo con el código ${dto.codigo}`);
    }

    // Crear entity de dominio (contiene validaciones de negocio)
    const equipo = EquipoEntity.create({
      codigo: dto.codigo,
      marca: dto.marca,
      modelo: dto.modelo,
      serie: dto.serie,
      clienteId: dto.clienteId,
      sedeId: dto.sedeId,
      tipoEquipoId: dto.tipoEquipoId,
      nombreEquipo: dto.nombreEquipo
    });

    // Persistir
    return await this.equipoRepository.save(equipo);
  }
}
