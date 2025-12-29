/**
 * Enum: PrioridadOrdenEnum
 * Niveles de prioridad para una Orden de Servicio
 * ALINEADO CON schema.prisma prioridad_enum
 */
export enum PrioridadOrdenEnum {
  BAJA = 'BAJA',
  NORMAL = 'NORMAL',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE',
  EMERGENCIA = 'EMERGENCIA',
}

/**
 * Value Object: PrioridadOrden
 * Representa la prioridad de una Orden de Servicio
 * Determina el orden de atención y SLA aplicable
 */
export class PrioridadOrden {
  private static readonly SLA_DIAS: Record<PrioridadOrdenEnum, number> = {
    [PrioridadOrdenEnum.BAJA]: 30,
    [PrioridadOrdenEnum.NORMAL]: 15,
    [PrioridadOrdenEnum.ALTA]: 5,
    [PrioridadOrdenEnum.URGENTE]: 2,
    [PrioridadOrdenEnum.EMERGENCIA]: 1,
  };

  private constructor(private readonly value: PrioridadOrdenEnum) {
    Object.freeze(this);
  }

  /**
   * Crea prioridad BAJA
   */
  static baja(): PrioridadOrden {
    return new PrioridadOrden(PrioridadOrdenEnum.BAJA);
  }

  /**
   * Crea prioridad NORMAL (por defecto)
   */
  static normal(): PrioridadOrden {
    return new PrioridadOrden(PrioridadOrdenEnum.NORMAL);
  }

  /**
   * Crea prioridad ALTA
   */
  static alta(): PrioridadOrden {
    return new PrioridadOrden(PrioridadOrdenEnum.ALTA);
  }

  /**
   * Crea prioridad URGENTE
   */
  static urgente(): PrioridadOrden {
    return new PrioridadOrden(PrioridadOrdenEnum.URGENTE);
  }

  /**
   * Crea prioridad EMERGENCIA
   */
  static emergencia(): PrioridadOrden {
    return new PrioridadOrden(PrioridadOrdenEnum.EMERGENCIA);
  }

  /**
   * Crea una PrioridadOrden desde un valor string
   * @param prioridad - Valor del enum PrioridadOrdenEnum
   */
  static from(prioridad: PrioridadOrdenEnum | string): PrioridadOrden {
    const prioridadUpper = prioridad.toUpperCase();
    if (!Object.values(PrioridadOrdenEnum).includes(prioridadUpper as PrioridadOrdenEnum)) {
      throw new Error(
        `Prioridad inválida: ${prioridad}. Prioridades válidas: ${Object.values(PrioridadOrdenEnum).join(', ')}`
      );
    }
    return new PrioridadOrden(prioridadUpper as PrioridadOrdenEnum);
  }

  getValue(): PrioridadOrdenEnum {
    return this.value;
  }

  equals(other: PrioridadOrden): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  /**
   * Obtiene el SLA en días según la prioridad
   * @returns Días de SLA
   */
  getSLADias(): number {
    return PrioridadOrden.SLA_DIAS[this.value];
  }

  /**
   * Calcula la fecha límite basada en la fecha programada
   * @param fechaProgramada - Fecha de inicio programada
   * @returns Fecha límite para cumplir SLA
   */
  calcularFechaLimite(fechaProgramada: Date): Date {
    const fechaLimite = new Date(fechaProgramada);
    fechaLimite.setDate(fechaLimite.getDate() + this.getSLADias());
    return fechaLimite;
  }

  /**
   * Compara prioridad con otra para ordenamiento
   * @param other - Otra prioridad a comparar
   * @returns -1 si this tiene menor prioridad, 0 si igual, 1 si mayor
   */
  compareTo(other: PrioridadOrden): number {
    const orden = [
      PrioridadOrdenEnum.BAJA,
      PrioridadOrdenEnum.NORMAL,
      PrioridadOrdenEnum.ALTA,
      PrioridadOrdenEnum.URGENTE,
      PrioridadOrdenEnum.EMERGENCIA,
    ];
    const indexThis = orden.indexOf(this.value);
    const indexOther = orden.indexOf(other.value);
    return indexThis - indexOther;
  }

  // Helper methods

  esBaja(): boolean {
    return this.value === PrioridadOrdenEnum.BAJA;
  }

  esNormal(): boolean {
    return this.value === PrioridadOrdenEnum.NORMAL;
  }

  esAlta(): boolean {
    return this.value === PrioridadOrdenEnum.ALTA;
  }

  esUrgente(): boolean {
    return this.value === PrioridadOrdenEnum.URGENTE;
  }

  esEmergencia(): boolean {
    return this.value === PrioridadOrdenEnum.EMERGENCIA;
  }

  /**
   * Verifica si es prioridad crítica (URGENTE o EMERGENCIA)
   */
  esCritica(): boolean {
    return this.value === PrioridadOrdenEnum.URGENTE || this.value === PrioridadOrdenEnum.EMERGENCIA;
  }
}
