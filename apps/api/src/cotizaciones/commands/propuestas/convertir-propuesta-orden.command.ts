/**
 * ConvertirPropuestaOrdenCommand
 * FASE 4.9: Convertir propuesta aprobada en orden servicio automática
 */
export class ConvertirPropuestaOrdenCommand {
  constructor(
    public readonly idPropuesta: number,
    public readonly convertidaPor: number, // ID usuario aprobador
  ) {}
}
