import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IComponentesUsadosRepository } from '../../domain/componentes-usados.repository.interface';
import { ResponseComponenteUsadoDto } from '../../dto/response-componente-usado.dto';
import { ComponenteUsadoMapper } from '../mappers/componente-usado.mapper';
import { UpdateComponenteUsadoCommand } from './update-componente-usado.command';

/**
 * Handler para actualizar componente usado
 * Tabla 12/14 - FASE 3
 * Lógica de negocio:
 * - Recalcula costo_total si cambia cantidad o costoUnitario
 */
@CommandHandler(UpdateComponenteUsadoCommand)
export class UpdateComponenteUsadoHandler
  implements ICommandHandler<UpdateComponenteUsadoCommand>
{
  constructor(
    @Inject('IComponentesUsadosRepository')
    private readonly repository: IComponentesUsadosRepository,
    private readonly mapper: ComponenteUsadoMapper,
  ) {}

  async execute(command: UpdateComponenteUsadoCommand): Promise<ResponseComponenteUsadoDto> {
    const { id, data } = command;

    // Verificar existencia
    const existente = await this.repository.findById(id);
    if (!existente) {
      throw new NotFoundException(`Componente usado con ID ${id} no encontrado`);
    }

    // Validación: cantidad debe ser > 0
    if (data.cantidad !== undefined && data.cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    // Recalcular costo_total si es necesario
    const cantidad = data.cantidad ?? this.mapper.toDto(existente).cantidad;
    const costoUnitario = data.costoUnitario !== undefined 
      ? data.costoUnitario 
      : this.mapper.toDto(existente).costoUnitario;
    
    const costoTotal = costoUnitario !== null && costoUnitario !== undefined 
      ? cantidad * costoUnitario 
      : null;

    // Actualizar con costoTotal recalculado
    const actualizado = await this.repository.update(id, {
      ...data,
      costoTotal,
    });

    return this.mapper.toDto(actualizado);
  }
}
