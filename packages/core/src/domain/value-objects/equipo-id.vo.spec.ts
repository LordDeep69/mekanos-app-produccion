import { EquipoId } from './equipo-id.vo';

describe('EquipoId Value Object', () => {
  describe('create', () => {
    it('debe crear un EquipoId con ID autoincremental válido', () => {
      const equipoId = EquipoId.create();
      
      expect(equipoId).toBeInstanceOf(EquipoId);
      expect(equipoId.getValue()).toBeGreaterThan(0);
    });

    it('debe generar IDs incrementales', () => {
      const id1 = EquipoId.create();
      const id2 = EquipoId.create();
      
      expect(id2.getValue()).toBeGreaterThan(id1.getValue());
    });
  });

  describe('from', () => {
    it('debe crear un EquipoId con ID válido positivo', () => {
      const id = 1;
      const equipoId = EquipoId.from(id);
      
      expect(equipoId).toBeInstanceOf(EquipoId);
      expect(equipoId.getValue()).toBe(id);
    });

    it('debe lanzar error si ID es cero', () => {
      expect(() => EquipoId.from(0)).toThrow('EquipoId debe ser un número positivo');
    });

    it('debe lanzar error si ID es negativo', () => {
      expect(() => EquipoId.from(-1)).toThrow('EquipoId debe ser un número positivo');
    });

    it('debe lanzar error si ID es decimal', () => {
      expect(() => EquipoId.from(1.5)).toThrow('EquipoId debe ser un número positivo');
    });
  });

  describe('getValue', () => {
    it('debe retornar el valor numérico del ID', () => {
      const id = 42;
      const equipoId = EquipoId.from(id);
      
      expect(equipoId.getValue()).toBe(id);
      expect(typeof equipoId.getValue()).toBe('number');
    });
  });

  describe('equals', () => {
    it('debe retornar true cuando dos EquipoIds tienen el mismo valor', () => {
      const equipoId1 = EquipoId.from(1);
      const equipoId2 = EquipoId.from(1);
      
      expect(equipoId1.equals(equipoId2)).toBe(true);
    });

    it('debe retornar false cuando dos EquipoIds tienen diferentes valores', () => {
      const equipoId1 = EquipoId.from(1);
      const equipoId2 = EquipoId.from(2);
      
      expect(equipoId1.equals(equipoId2)).toBe(false);
    });

    it('debe retornar false cuando se compara con null', () => {
      const equipoId = EquipoId.from(1);
      
      expect(equipoId.equals(null as any)).toBe(false);
    });

    it('debe retornar false cuando se compara con undefined', () => {
      const equipoId = EquipoId.from(1);
      
      expect(equipoId.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('debe retornar string con el valor del ID', () => {
      const id = 123;
      const equipoId = EquipoId.from(id);
      
      expect(equipoId.toString()).toBe('EquipoId: 123');
    });
  });

  describe('immutability', () => {
    it('debe ser inmutable - no se puede modificar el valor interno', () => {
      const equipoId = EquipoId.from(1);
      const value = equipoId.getValue();
      
      // Intentar modificar (no debería ser posible)
      expect(() => {
        (equipoId as any).value = 999;
      }).not.toThrow();
      
      // Verificar que el valor no cambió
      expect(equipoId.getValue()).toBe(value);
    });
  });
});
