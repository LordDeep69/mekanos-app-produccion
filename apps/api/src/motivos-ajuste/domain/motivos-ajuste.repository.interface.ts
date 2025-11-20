import { categoria_motivo_ajuste_enum, motivos_ajuste } from '@prisma/client';

export interface IMotivosAjusteRepository {
  /**
   * Crear nuevo motivo de ajuste
   */
  crear(data: {
    codigo_motivo: string;
    nombre_motivo: string;
    categoria: categoria_motivo_ajuste_enum;
    requiere_justificacion_detallada: boolean;
    requiere_aprobacion_gerencia: boolean;
  }): Promise<motivos_ajuste>;

  /**
   * Actualizar motivo existente
   */
  actualizar(
    id_motivo_ajuste: number,
    data: Partial<{
      codigo_motivo: string;
      nombre_motivo: string;
      categoria: categoria_motivo_ajuste_enum;
      requiere_justificacion_detallada: boolean;
      requiere_aprobacion_gerencia: boolean;
      activo: boolean;
    }>,
  ): Promise<motivos_ajuste>;

  /**
   * Desactivar motivo (soft delete)
   */
  desactivar(id_motivo_ajuste: number): Promise<motivos_ajuste>;

  /**
   * Listar motivos con filtros y paginación
   */
  findAll(filters: {
    activo?: boolean;
    categoria?: categoria_motivo_ajuste_enum;
    page: number;
    limit: number;
  }): Promise<{
    data: motivos_ajuste[];
    total: number;
  }>;

  /**
   * Obtener motivo por ID
   */
  findById(id_motivo_ajuste: number): Promise<motivos_ajuste | null>;

  /**
   * Obtener motivo por código
   */
  findByCodigo(codigo_motivo: string): Promise<motivos_ajuste | null>;
}
