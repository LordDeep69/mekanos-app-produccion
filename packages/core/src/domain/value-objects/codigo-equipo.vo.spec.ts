import { CodigoEquipo } from './codigo-equipo.vo';

describe('CodigoEquipo Value Object', () => {
  describe('create', () => {
    it('debe crear un CodigoEquipo con formato válido', () => {
      const codigo = 'GEN-2024-0001';
      const codigoEquipo = CodigoEquipo.create(codigo);
      
      expect(codigoEquipo).toBeInstanceOf(CodigoEquipo);
      expect(codigoEquipo.getValue()).toBe(codigo);
    });

    it('debe normalizar a uppercase automáticamente', () => {
      const codigoLowercase = 'gen-2024-0001';
      const codigoEquipo = CodigoEquipo.create(codigoLowercase);
      
      expect(codigoEquipo.getValue()).toBe('GEN-2024-0001');
    });

    it('debe aceptar código con solo números', () => {
      const codigo = '123456';
      const codigoEquipo = CodigoEquipo.create(codigo);
      
      expect(codigoEquipo.getValue()).toBe('123456');
    });

    it('debe aceptar código con guiones múltiples', () => {
      const codigo = 'EQUIPO-TEST-2024-ABC';
      const codigoEquipo = CodigoEquipo.create(codigo);
      
      expect(codigoEquipo.getValue()).toBe('EQUIPO-TEST-2024-ABC');
    });

    it('debe lanzar error si código está vacío', () => {
      expect(() => CodigoEquipo.create('')).toThrow('Código de equipo no puede estar vacío');
    });

    it('debe lanzar error si código solo contiene espacios', () => {
      expect(() => CodigoEquipo.create('   ')).toThrow('Código de equipo no puede estar vacío');
    });

    it('debe lanzar error si código excede 50 caracteres', () => {
      const codigoLargo = 'A'.repeat(51);
      expect(() => CodigoEquipo.create(codigoLargo)).toThrow(
        'Código de equipo no puede exceder 50 caracteres'
      );
    });

    it('debe aceptar código de exactamente 50 caracteres', () => {
      const codigoExacto = 'A'.repeat(50);
      const codigoEquipo = CodigoEquipo.create(codigoExacto);
      
      expect(codigoEquipo.getValue()).toBe(codigoExacto);
    });

    it('debe lanzar error si código contiene caracteres especiales inválidos', () => {
      expect(() => CodigoEquipo.create('GEN@2024')).toThrow(
        'Código de equipo solo puede contener letras, números y guiones'
      );
    });

    it('debe lanzar error si código contiene espacios', () => {
      expect(() => CodigoEquipo.create('GEN 2024')).toThrow(
        'Código de equipo solo puede contener letras, números y guiones'
      );
    });

    it('debe lanzar error si código contiene underscores', () => {
      expect(() => CodigoEquipo.create('GEN_2024')).toThrow(
        'Código de equipo solo puede contener letras, números y guiones'
      );
    });

    it('debe lanzar error si código contiene puntos', () => {
      expect(() => CodigoEquipo.create('GEN.2024')).toThrow(
        'Código de equipo solo puede contener letras, números y guiones'
      );
    });
  });

  describe('getValue', () => {
    it('debe retornar el valor del código en uppercase', () => {
      const codigoEquipo = CodigoEquipo.create('gen-2024-0001');
      
      expect(codigoEquipo.getValue()).toBe('GEN-2024-0001');
    });
  });

  describe('equals', () => {
    it('debe retornar true cuando dos CodigoEquipo tienen el mismo valor', () => {
      const codigo1 = CodigoEquipo.create('GEN-2024-0001');
      const codigo2 = CodigoEquipo.create('gen-2024-0001');
      
      expect(codigo1.equals(codigo2)).toBe(true);
    });

    it('debe retornar false cuando dos CodigoEquipo tienen diferentes valores', () => {
      const codigo1 = CodigoEquipo.create('GEN-2024-0001');
      const codigo2 = CodigoEquipo.create('GEN-2024-0002');
      
      expect(codigo1.equals(codigo2)).toBe(false);
    });

    it('debe retornar false cuando se compara con null', () => {
      const codigo = CodigoEquipo.create('GEN-2024-0001');
      
      expect(codigo.equals(null as any)).toBe(false);
    });

    it('debe retornar false cuando se compara con undefined', () => {
      const codigo = CodigoEquipo.create('GEN-2024-0001');
      
      expect(codigo.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('debe retornar string con el valor del código', () => {
      const codigo = CodigoEquipo.create('GEN-2024-0001');
      
      expect(codigo.toString()).toBe('CodigoEquipo: GEN-2024-0001');
    });
  });

  describe('formatos de negocio comunes', () => {
    it('debe aceptar formato de generador', () => {
      const codigo = CodigoEquipo.create('GEN-2024-0001');
      expect(codigo.getValue()).toBe('GEN-2024-0001');
    });

    it('debe aceptar formato de bomba', () => {
      const codigo = CodigoEquipo.create('BOM-2024-0001');
      expect(codigo.getValue()).toBe('BOM-2024-0001');
    });

    it('debe aceptar formato de motor', () => {
      const codigo = CodigoEquipo.create('MOT-2024-0001');
      expect(codigo.getValue()).toBe('MOT-2024-0001');
    });

    it('debe aceptar código alfanumérico sin guiones', () => {
      const codigo = CodigoEquipo.create('EQUIPO2024A');
      expect(codigo.getValue()).toBe('EQUIPO2024A');
    });
  });

  describe('immutability', () => {
    it('debe ser inmutable - no se puede modificar el valor interno', () => {
      const codigo = CodigoEquipo.create('GEN-2024-0001');
      const value = codigo.getValue();
      
      // Intentar modificar (no debería ser posible)
      expect(() => {
        (codigo as any).value = 'MODIFIED';
      }).not.toThrow();
      
      // Verificar que el valor no cambió
      expect(codigo.getValue()).toBe(value);
    });
  });
});
