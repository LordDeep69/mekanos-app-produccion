import { actividades_ejecutadas } from '@prisma/client';
import { CreateActividadCommand } from '../application/commands/create-actividad.command';
import { UpdateActividadCommand } from '../application/commands/update-actividad.command';

export interface ActividadesRepository {
  create(command: CreateActividadCommand): Promise<actividades_ejecutadas>;
  update(id: number, command: Partial<UpdateActividadCommand>): Promise<actividades_ejecutadas>;
  delete(id: number): Promise<void>;
  findById(id: number): Promise<actividades_ejecutadas | null>;
  findByOrden(ordenId: number): Promise<actividades_ejecutadas[]>;
  findAll(): Promise<actividades_ejecutadas[]>;
}
