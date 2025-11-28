import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IComponentesUsadosRepository } from '../../domain/componentes-usados.repository.interface';
import { ResponseComponenteUsadoDto } from '../../dto/response-componente-usado.dto';
import { ComponenteUsadoMapper } from '../mappers/componente-usado.mapper';
import { CreateComponenteUsadoCommand } from './create-componente-usado.command';

/**
 * Handler para crear componente usado
 * Tabla 12/14 - FASE 3
 * Lógica de negocio:
 * - Calcula costo_total = cantidad × costoUnitario
 * - Valida que cantidad > 0
 */
@CommandHandler(CreateComponenteUsadoCommand)
export class CreateComponenteUsadoHandler
  implements ICommandHandler<CreateComponenteUsadoCommand>
{
  constructor(
    @Inject('IComponentesUsadosRepository')
    private readonly repository: IComponentesUsadosRepository,
    private readonly mapper: ComponenteUsadoMapper,
  ) {}

  async execute(command: CreateComponenteUsadoCommand): Promise<ResponseComponenteUsadoDto> {
    const { data } = command;

    // Validación: cantidad debe ser > 0
    if (data.cantidad !== undefined && data.cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    // Calcular costo_total si hay cantidad y costoUnitario
    const cantidad = data.cantidad ?? 1;
    const costoUnitario = data.costoUnitario ?? null;
    const costoTotal = costoUnitario !== null ? cantidad * costoUnitario : null;

    // Crear el componente usado con costoTotal calculado
    const componenteUsado = await this.repository.create({
      ...data,
      cantidad,
      costoTotal,
    });

    return this.mapper.toDto(componenteUsado);
  }
}
