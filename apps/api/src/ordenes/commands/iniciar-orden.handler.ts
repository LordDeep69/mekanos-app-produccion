import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaOrdenServicioRepository } from '../infrastructure/prisma-orden-servicio.repository';
import { IniciarOrdenCommand } from './iniciar-orden.command';

@CommandHandler(IniciarOrdenCommand)
export class IniciarOrdenHandler implements ICommandHandler<IniciarOrdenCommand> {
  constructor(
    private readonly repository: PrismaOrdenServicioRepository
  ) { }

  async execute(command: IniciarOrdenCommand): Promise<any> {
    const { ordenId } = command;
    const id = parseInt(ordenId, 10);

    // ✅ OPTIMIZACIÓN 07-ENE-2026: Verificar existencia + obtener estado EN PARALELO
    // Reduce de ~10.7s a ~200ms al evitar cargar 15+ relaciones innecesarias
    const [ordenExiste, estadoEnProceso] = await Promise.all([
      this.repository.existsById(id),
      this.repository.findEstadoByCodigo('EN_PROCESO'),
    ]);

    if (!ordenExiste) {
      throw new NotFoundException(`Orden con ID ${ordenId} no encontrada`);
    }

    if (!estadoEnProceso) {
      throw new NotFoundException('No se encontró el estado EN_PROCESO en el catálogo');
    }

    // 3. Iniciar orden (solo actualiza campos necesarios)
    return await this.repository.iniciar(
      id,
      estadoEnProceso.id_estado,
      1 // TODO: obtener userId desde JWT
    );
  }
}
