/**
 * EquipoId Value Object
 * Representa el identificador único de un equipo
 */
export class EquipoId {
  private static nextId = 1; // Contador autoincremental para mocks/tests

  private constructor(private readonly value: number) {
    if (value <= 0) {
      throw new Error('EquipoId debe ser un número positivo');
    }
  }

  /**
   * Crea un nuevo EquipoId con valor autoincremental (para mocks/tests)
   */
  static create(): EquipoId {
    return new EquipoId(EquipoId.nextId++);
  }

  /**
   * Crea EquipoId desde valor existente (para hidratar desde BD)
   */
  static from(id: number): EquipoId {
    return new EquipoId(id);
  }

  getValue(): number {
    return this.value;
  }

  equals(other: EquipoId): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toString(): string {
    return `EquipoId(${this.value})`;
  }
}
