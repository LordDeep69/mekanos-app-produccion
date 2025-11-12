/**
 * CodigoEquipo Value Object
 * Representa el código único de identificación de un equipo
 * Formato: Alfanumérico, máximo 50 caracteres, uppercase
 */
export class CodigoEquipo {
  private constructor(private readonly value: string) {
    if (!CodigoEquipo.isValid(value)) {
      throw new Error('Código de equipo inválido');
    }
  }

  static create(codigo: string): CodigoEquipo {
    if (!codigo || codigo.trim().length === 0) {
      throw new Error('Código de equipo no puede estar vacío');
    }
    
    const codigoNormalizado = codigo.trim().toUpperCase();
    
    if (codigoNormalizado.length > 50) {
      throw new Error('Código de equipo no puede exceder 50 caracteres');
    }

    return new CodigoEquipo(codigoNormalizado);
  }

  private static isValid(codigo: string): boolean {
    // Validar que contiene solo alfanuméricos y guiones
    const regex = /^[A-Z0-9\-]+$/;
    return regex.test(codigo);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: CodigoEquipo): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
