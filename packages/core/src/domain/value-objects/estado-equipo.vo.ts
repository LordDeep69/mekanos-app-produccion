/**
 * EstadoEquipo Value Object
 * Representa el estado operativo de un equipo con validación de transiciones
 */
export enum EstadoEquipoEnum {
  OPERATIVO = 'OPERATIVO',
  STANDBY = 'STANDBY',
  INACTIVO = 'INACTIVO',
  EN_REPARACION = 'EN_REPARACION',
  FUERA_SERVICIO = 'FUERA_SERVICIO',
  BAJA = 'BAJA'
}

export class EstadoEquipo {
  private constructor(private readonly value: EstadoEquipoEnum) {}

  static create(estado: string): EstadoEquipo {
    if (!Object.values(EstadoEquipoEnum).includes(estado as EstadoEquipoEnum)) {
      throw new Error(`Estado inválido: ${estado}`);
    }
    return new EstadoEquipo(estado as EstadoEquipoEnum);
  }

  static operativo(): EstadoEquipo {
    return new EstadoEquipo(EstadoEquipoEnum.OPERATIVO);
  }

  static standby(): EstadoEquipo {
    return new EstadoEquipo(EstadoEquipoEnum.STANDBY);
  }

  static inactivo(): EstadoEquipo {
    return new EstadoEquipo(EstadoEquipoEnum.INACTIVO);
  }

  /**
   * Valida si se puede transicionar al nuevo estado
   * Matriz de transiciones válidas:
   * - OPERATIVO → STANDBY, EN_REPARACION, INACTIVO
   * - STANDBY → OPERATIVO, EN_REPARACION, INACTIVO
   * - INACTIVO → OPERATIVO, STANDBY, BAJA
   * - EN_REPARACION → OPERATIVO, FUERA_SERVICIO
   * - FUERA_SERVICIO → EN_REPARACION, BAJA
   * - BAJA → (ninguna, estado final)
   */
  puedeTransicionarA(nuevoEstado: EstadoEquipo): boolean {
    const transicionesValidas: Record<EstadoEquipoEnum, EstadoEquipoEnum[]> = {
      [EstadoEquipoEnum.OPERATIVO]: [
        EstadoEquipoEnum.STANDBY,
        EstadoEquipoEnum.EN_REPARACION,
        EstadoEquipoEnum.INACTIVO
      ],
      [EstadoEquipoEnum.STANDBY]: [
        EstadoEquipoEnum.OPERATIVO,
        EstadoEquipoEnum.EN_REPARACION,
        EstadoEquipoEnum.INACTIVO
      ],
      [EstadoEquipoEnum.INACTIVO]: [
        EstadoEquipoEnum.OPERATIVO,
        EstadoEquipoEnum.STANDBY,
        EstadoEquipoEnum.BAJA
      ],
      [EstadoEquipoEnum.EN_REPARACION]: [
        EstadoEquipoEnum.OPERATIVO,
        EstadoEquipoEnum.FUERA_SERVICIO
      ],
      [EstadoEquipoEnum.FUERA_SERVICIO]: [
        EstadoEquipoEnum.EN_REPARACION,
        EstadoEquipoEnum.BAJA
      ],
      [EstadoEquipoEnum.BAJA]: [] // Estado final
    };

    const permitidas = transicionesValidas[this.value] || [];
    return permitidas.includes(nuevoEstado.value);
  }

  esOperativo(): boolean {
    return this.value === EstadoEquipoEnum.OPERATIVO;
  }

  esInactivo(): boolean {
    return this.value === EstadoEquipoEnum.INACTIVO;
  }

  esBaja(): boolean {
    return this.value === EstadoEquipoEnum.BAJA;
  }

  puedeRecibirMantenimiento(): boolean {
    return this.value === EstadoEquipoEnum.OPERATIVO || 
           this.value === EstadoEquipoEnum.STANDBY;
  }

  getValue(): EstadoEquipoEnum {
    return this.value;
  }

  equals(other: EstadoEquipo): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
