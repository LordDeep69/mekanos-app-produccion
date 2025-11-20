/**
 * CreatePropuestaCommand
 * FASE 4.9: Crear propuesta correctivo desde mantenimiento
 * 
 * Técnico descubre problema durante mantenimiento → Genera propuesta correctivo →
 * Sistema crea cotización automática → Flujo aprobación normal → Si aprobada → Nueva orden servicio
 */
export class CreatePropuestaCommand {
  constructor(
    public readonly idOrdenServicio: number,
    public readonly tipoPropuesta: string, // CORRECTIVO | MEJORA | REEMPLAZO
    public readonly descripcionHallazgo: string,
    public readonly descripcionSolucion: string,
    public readonly urgenciaPropuesta: string, // BAJA | MEDIA | ALTA | CRITICA
    public readonly prioridad: number, // 1-5
    public readonly tiempoEstimadoEjecucion: number, // días
    public readonly creadaPor: number, // ID técnico
  ) {}
}
