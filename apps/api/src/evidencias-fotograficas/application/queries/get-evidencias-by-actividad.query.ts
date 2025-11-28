/**
 * Query listar evidencias por actividad ejecutada
 * FASE 3 - Tabla 11 - camelCase
 */

export class GetEvidenciasByActividadQuery {
  constructor(public readonly actividadId: number) {}
}
