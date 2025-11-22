/**
 * Value Object: OrdenServicioId
 * Representa el identificador único de una Orden de Servicio
 * Formato: OS-YYYYMM-UUID (ejemplo: OS-202411-a3f4c2d1-8e9f-4b2a-9c3d-1e5f7a8b9c0d)
 */
export class OrdenServicioId {
  private constructor(private readonly value: string) {
    this.validate(value);
    Object.freeze(this);
  }

  /**
   * Crea un nuevo OrdenServicioId generando UUID con formato OS-YYYYMM-UUID
   * @returns Nueva instancia de OrdenServicioId
   */
  static create(): OrdenServicioId {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = this.generateUUID();
    const id = `OS-${year}${month}-${uuid}`;
    return new OrdenServicioId(id);
  }

  /**
   * Crea una instancia desde un ID existente (hidratación desde BD)
   * @param id - ID en formato OS-YYYYMM-UUID
   * @returns Instancia de OrdenServicioId
   */
  static from(id: string): OrdenServicioId {
    return new OrdenServicioId(id);
  }

  private validate(value: string): void {
    // Allow numeric IDs for legacy compatibility
    if (/^\d+$/.test(value)) {
      return;
    }

    // Formato: OS-YYYYMM-UUID
    const regex = /^OS-\d{6}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    
    if (!regex.test(value)) {
      throw new Error(
        `OrdenServicioId debe tener formato OS-YYYYMM-UUID (ejemplo: OS-202411-a3f4c2d1-...) o ser un ID numérico.`
      );
    }

    // Validar que el año-mes no sea futuro
    const yearMonth = value.substring(3, 9); // Extrae "202411"
    const year = parseInt(yearMonth.substring(0, 4));
    const month = parseInt(yearMonth.substring(4, 6));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      throw new Error(
        `OrdenServicioId no puede tener fecha futura. Recibido: ${year}-${month}`
      );
    }

    // Validar rango de mes
    if (month < 1 || month > 12) {
      throw new Error(`Mes inválido en OrdenServicioId: ${month}`);
    }
  }

  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  getValue(): string {
    return this.value;
  }

  equals(other: OrdenServicioId): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toString(): string {
    return `OrdenServicioId: ${this.value}`;
  }

  /**
   * Extrae el año-mes del ID
   * @returns Objeto con year y month
   */
  getYearMonth(): { year: number; month: number } {
    const yearMonth = this.value.substring(3, 9);
    return {
      year: parseInt(yearMonth.substring(0, 4)),
      month: parseInt(yearMonth.substring(4, 6)),
    };
  }
}
