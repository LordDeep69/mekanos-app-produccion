import { categoria_motivo_ajuste_enum } from '@prisma/client';

export class CrearMotivoAjusteCommand {
  constructor(
    public readonly codigo_motivo: string,
    public readonly nombre_motivo: string,
    public readonly categoria: categoria_motivo_ajuste_enum,
    public readonly requiere_justificacion_detallada?: boolean,
    public readonly requiere_aprobacion_gerencia?: boolean,
  ) {}
}
