/**
 * Value Object: NumeroOrden
 * Representa el número correlativo de una orden de servicio
 * Formato: OS-YYYYMM-NNNN (ejemplo: OS-202411-0001)
 */
export class NumeroOrden {
  private constructor(private readonly value: string) {
    this.validate(value);
    Object.freeze(this);
  }

  /**
   * Crea un nuevo NumeroOrden con el correlativo siguiente
   * @param ultimoNumero - Último número usado en el mes actual (para autoincremento)
   * @returns Nueva instancia de NumeroOrden
   */
  static create(ultimoNumero?: number): NumeroOrden {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const correlativo = String((ultimoNumero || 0) + 1).padStart(4, '0');
    const numero = `OS-${year}${month}-${correlativo}`;
    return new NumeroOrden(numero);
  }

  /**
   * Crea una instancia desde un número existente (hidratación desde BD)
   * @param numero - Número en formato OS-YYYYMM-NNNN
   * @returns Instancia de NumeroOrden
   */
  static from(numero: string): NumeroOrden {
    return new NumeroOrden(numero);
  }

  private validate(value: string): void {
    // Formato: OS-YYYYMM-NNNN
    const regex = /^OS-\d{6}-\d{4}$/;
    
    if (!regex.test(value)) {
      throw new Error(
        `NumeroOrden debe tener formato OS-YYYYMM-NNNN (ejemplo: OS-202411-0001)`
      );
    }

    // Validar año-mes
    const yearMonth = value.substring(3, 9);
    const year = parseInt(yearMonth.substring(0, 4));
    const month = parseInt(yearMonth.substring(4, 6));

    if (month < 1 || month > 12) {
      throw new Error(`Mes inválido en NumeroOrden: ${month}`);
    }

    if (year < 2024) {
      throw new Error(`Año inválido en NumeroOrden: ${year}. Debe ser >= 2024`);
    }

    // Validar correlativo
    const correlativo = parseInt(value.substring(10, 14));
    if (correlativo < 1 || correlativo > 9999) {
      throw new Error(`Correlativo inválido: ${correlativo}. Debe estar entre 1-9999`);
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: NumeroOrden): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  /**
   * Extrae el correlativo numérico del número de orden
   * @returns Número correlativo (1-9999)
   */
  getCorrelativo(): number {
    return parseInt(this.value.substring(10, 14));
  }

  /**
   * Extrae el año-mes del número de orden
   * @returns Objeto con year y month
   */
  getYearMonth(): { year: number; month: number } {
    const yearMonth = this.value.substring(3, 9);
    return {
      year: parseInt(yearMonth.substring(0, 4)),
      month: parseInt(yearMonth.substring(4, 6)),
    };
  }

  /**
   * Verifica si este número pertenece al mes actual
   * @returns true si el número es del mes actual
   */
  esDelMesActual(): boolean {
    const { year, month } = this.getYearMonth();
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth() + 1;
  }
}
