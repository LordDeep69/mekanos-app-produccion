/**
 * Enum: EstadoOrdenEnum
 * Estados posibles de una Orden de Servicio
 */
export enum EstadoOrdenEnum {
  BORRADOR = 'BORRADOR',
  PROGRAMADA = 'PROGRAMADA',
  ASIGNADA = 'ASIGNADA',
  EN_PROCESO = 'EN_PROCESO',
  EJECUTADA = 'EJECUTADA',
  EN_REVISION = 'EN_REVISION',
  APROBADA = 'APROBADA',
}

/**
 * Value Object: EstadoOrden
 * Representa el estado de una Orden de Servicio con validación de transiciones
 * 
 * Workflow:
 * BORRADOR → PROGRAMADA → ASIGNADA → EN_PROCESO → EJECUTADA → EN_REVISION → APROBADA
 */
export class EstadoOrden {
  private static readonly MATRIZ_TRANSICIONES: Record<EstadoOrdenEnum, EstadoOrdenEnum[]> = {
    [EstadoOrdenEnum.BORRADOR]: [EstadoOrdenEnum.PROGRAMADA],
    [EstadoOrdenEnum.PROGRAMADA]: [EstadoOrdenEnum.ASIGNADA, EstadoOrdenEnum.BORRADOR],
    [EstadoOrdenEnum.ASIGNADA]: [EstadoOrdenEnum.EN_PROCESO, EstadoOrdenEnum.PROGRAMADA],
    [EstadoOrdenEnum.EN_PROCESO]: [EstadoOrdenEnum.EJECUTADA],
    [EstadoOrdenEnum.EJECUTADA]: [EstadoOrdenEnum.EN_REVISION],
    [EstadoOrdenEnum.EN_REVISION]: [EstadoOrdenEnum.APROBADA, EstadoOrdenEnum.EN_PROCESO],
    [EstadoOrdenEnum.APROBADA]: [],
  };

  private constructor(private readonly value: EstadoOrdenEnum) {
    Object.freeze(this);
  }

  /**
   * Crea estado BORRADOR (estado inicial por defecto)
   */
  static borrador(): EstadoOrden {
    return new EstadoOrden(EstadoOrdenEnum.BORRADOR);
  }

  /**
   * Crea estado PROGRAMADA
   */
  static programada(): EstadoOrden {
    return new EstadoOrden(EstadoOrdenEnum.PROGRAMADA);
  }

  /**
   * Crea estado ASIGNADA
   */
  static asignada(): EstadoOrden {
    return new EstadoOrden(EstadoOrdenEnum.ASIGNADA);
  }

  /**
   * Crea estado EN_PROCESO
   */
  static enProceso(): EstadoOrden {
    return new EstadoOrden(EstadoOrdenEnum.EN_PROCESO);
  }

  /**
   * Crea estado EJECUTADA
   */
  static ejecutada(): EstadoOrden {
    return new EstadoOrden(EstadoOrdenEnum.EJECUTADA);
  }

  /**
   * Crea estado EN_REVISION
   */
  static enRevision(): EstadoOrden {
    return new EstadoOrden(EstadoOrdenEnum.EN_REVISION);
  }

  /**
   * Crea estado APROBADA
   */
  static aprobada(): EstadoOrden {
    return new EstadoOrden(EstadoOrdenEnum.APROBADA);
  }

  /**
   * Crea un EstadoOrden desde un valor string
   * @param estado - Valor del enum EstadoOrdenEnum
   */
  static from(estado: EstadoOrdenEnum | string): EstadoOrden {
    const estadoUpper = estado.toUpperCase();
    if (!Object.values(EstadoOrdenEnum).includes(estadoUpper as EstadoOrdenEnum)) {
      throw new Error(
        `Estado inválido: ${estado}. Estados válidos: ${Object.values(EstadoOrdenEnum).join(', ')}`
      );
    }
    return new EstadoOrden(estadoUpper as EstadoOrdenEnum);
  }

  getValue(): EstadoOrdenEnum {
    return this.value;
  }

  equals(other: EstadoOrden): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  /**
   * Verifica si se puede transicionar a un nuevo estado
   * @param nuevoEstado - Estado destino
   * @returns true si la transición es válida
   */
  puedeTransicionarA(nuevoEstado: EstadoOrden): boolean {
    const estadosPermitidos = EstadoOrden.MATRIZ_TRANSICIONES[this.value];
    return estadosPermitidos.includes(nuevoEstado.value);
  }

  /**
   * Obtiene los estados a los que se puede transicionar
   * @returns Array de estados válidos para transición
   */
  getTransicionesPermitidas(): EstadoOrdenEnum[] {
    return EstadoOrden.MATRIZ_TRANSICIONES[this.value];
  }

  // Helper methods para verificar estado actual

  esBorrador(): boolean {
    return this.value === EstadoOrdenEnum.BORRADOR;
  }

  esProgramada(): boolean {
    return this.value === EstadoOrdenEnum.PROGRAMADA;
  }

  esAsignada(): boolean {
    return this.value === EstadoOrdenEnum.ASIGNADA;
  }

  esEnProceso(): boolean {
    return this.value === EstadoOrdenEnum.EN_PROCESO;
  }

  esEjecutada(): boolean {
    return this.value === EstadoOrdenEnum.EJECUTADA;
  }

  esEnRevision(): boolean {
    return this.value === EstadoOrdenEnum.EN_REVISION;
  }

  esAprobada(): boolean {
    return this.value === EstadoOrdenEnum.APROBADA;
  }

  /**
   * Verifica si la orden puede ser modificada (solo en estados iniciales)
   */
  puedeSerModificada(): boolean {
    return this.value === EstadoOrdenEnum.BORRADOR || this.value === EstadoOrdenEnum.PROGRAMADA;
  }

  /**
   * Verifica si la orden puede ser cancelada
   */
  puedeSerCancelada(): boolean {
    return (
      this.value !== EstadoOrdenEnum.APROBADA &&
      this.value !== EstadoOrdenEnum.EN_PROCESO &&
      this.value !== EstadoOrdenEnum.EJECUTADA
    );
  }

  /**
   * Verifica si la orden está en ejecución (estados operativos)
   */
  estaEnEjecucion(): boolean {
    return (
      this.value === EstadoOrdenEnum.ASIGNADA ||
      this.value === EstadoOrdenEnum.EN_PROCESO ||
      this.value === EstadoOrdenEnum.EJECUTADA
    );
  }

  /**
   * Verifica si la orden está completada (estados finales)
   */
  estaCompletada(): boolean {
    return this.value === EstadoOrdenEnum.EN_REVISION || this.value === EstadoOrdenEnum.APROBADA;
  }
}
