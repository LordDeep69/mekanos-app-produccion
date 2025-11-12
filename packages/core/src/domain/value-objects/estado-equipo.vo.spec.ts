import { EstadoEquipo, EstadoEquipoEnum } from './estado-equipo.vo';

describe('EstadoEquipo Value Object', () => {
  describe('create', () => {
    it('debe crear EstadoEquipo con valor OPERATIVO', () => {
      const estado = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
      
      expect(estado).toBeInstanceOf(EstadoEquipo);
      expect(estado.getValue()).toBe(EstadoEquipoEnum.OPERATIVO);
    });

    it('debe crear EstadoEquipo con valor STANDBY', () => {
      const estado = EstadoEquipo.create(EstadoEquipoEnum.STANDBY);
      expect(estado.getValue()).toBe(EstadoEquipoEnum.STANDBY);
    });

    it('debe crear EstadoEquipo con todos los estados válidos', () => {
      const estados = [
        EstadoEquipoEnum.OPERATIVO,
        EstadoEquipoEnum.STANDBY,
        EstadoEquipoEnum.INACTIVO,
        EstadoEquipoEnum.EN_REPARACION,
        EstadoEquipoEnum.FUERA_SERVICIO,
        EstadoEquipoEnum.BAJA,
      ];

      estados.forEach((estadoEnum) => {
        const estado = EstadoEquipo.create(estadoEnum);
        expect(estado.getValue()).toBe(estadoEnum);
      });
    });

    it('debe lanzar error con estado inválido', () => {
      expect(() => EstadoEquipo.create('INVALIDO' as any)).toThrow();
    });
  });

  describe('puedeTransicionarA', () => {
    describe('desde OPERATIVO', () => {
      it('debe permitir transición a STANDBY', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.STANDBY);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('debe permitir transición a EN_REPARACION', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('debe permitir transición a INACTIVO', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.INACTIVO);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('NO debe permitir transición directa a FUERA_SERVICIO', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.FUERA_SERVICIO);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(false);
      });

      it('NO debe permitir transición directa a BAJA', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.BAJA);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(false);
      });
    });

    describe('desde STANDBY', () => {
      it('debe permitir transición a OPERATIVO', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.STANDBY);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('debe permitir transición a EN_REPARACION', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.STANDBY);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('debe permitir transición a INACTIVO', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.STANDBY);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.INACTIVO);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('NO debe permitir transición directa a BAJA', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.STANDBY);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.BAJA);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(false);
      });
    });

    describe('desde INACTIVO', () => {
      it('debe permitir transición a OPERATIVO', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.INACTIVO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('debe permitir transición a STANDBY', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.INACTIVO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.STANDBY);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('debe permitir transición a BAJA (dar de baja)', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.INACTIVO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.BAJA);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('NO debe permitir transición a EN_REPARACION', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.INACTIVO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(false);
      });

      it('NO debe permitir transición a FUERA_SERVICIO', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.INACTIVO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.FUERA_SERVICIO);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(false);
      });
    });

    describe('desde EN_REPARACION', () => {
      it('debe permitir transición a OPERATIVO', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('debe permitir transición a FUERA_SERVICIO', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.FUERA_SERVICIO);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('NO debe permitir transición a STANDBY', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.STANDBY);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(false);
      });

      it('NO debe permitir transición a INACTIVO', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.INACTIVO);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(false);
      });

      it('NO debe permitir transición directa a BAJA', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.BAJA);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(false);
      });
    });

    describe('desde FUERA_SERVICIO', () => {
      it('debe permitir transición a EN_REPARACION', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.FUERA_SERVICIO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('debe permitir transición a BAJA (dar de baja definitivamente)', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.FUERA_SERVICIO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.BAJA);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(true);
      });

      it('NO debe permitir transición a INACTIVO', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.FUERA_SERVICIO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.INACTIVO);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(false);
      });

      it('NO debe permitir transición directa a OPERATIVO', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.FUERA_SERVICIO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(false);
      });

      it('NO debe permitir transición a STANDBY', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.FUERA_SERVICIO);
        const nuevoEstado = EstadoEquipo.create(EstadoEquipoEnum.STANDBY);
        
        expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(false);
      });
    });

    describe('desde BAJA (estado final)', () => {
      it('NO debe permitir ninguna transición desde BAJA', () => {
        const estadoActual = EstadoEquipo.create(EstadoEquipoEnum.BAJA);
        
        const estadosPosibles = [
          EstadoEquipoEnum.OPERATIVO,
          EstadoEquipoEnum.STANDBY,
          EstadoEquipoEnum.INACTIVO,
          EstadoEquipoEnum.EN_REPARACION,
          EstadoEquipoEnum.FUERA_SERVICIO,
        ];

        estadosPosibles.forEach((estadoEnum) => {
          const nuevoEstado = EstadoEquipo.create(estadoEnum);
          expect(estadoActual.puedeTransicionarA(nuevoEstado)).toBe(false);
        });
      });
    });
  });

  describe('esOperativo', () => {
    it('debe retornar true si estado es OPERATIVO', () => {
      const estado = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
      expect(estado.esOperativo()).toBe(true);
    });

    it('debe retornar false si estado NO es OPERATIVO', () => {
      const estadosNoOperativos = [
        EstadoEquipoEnum.STANDBY,
        EstadoEquipoEnum.INACTIVO,
        EstadoEquipoEnum.EN_REPARACION,
        EstadoEquipoEnum.FUERA_SERVICIO,
        EstadoEquipoEnum.BAJA,
      ];

      estadosNoOperativos.forEach((estadoEnum) => {
        const estado = EstadoEquipo.create(estadoEnum);
        expect(estado.esOperativo()).toBe(false);
      });
    });
  });

  describe('puedeRecibirMantenimiento', () => {
    it('debe retornar true si estado es OPERATIVO', () => {
      const estado = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
      expect(estado.puedeRecibirMantenimiento()).toBe(true);
    });

    it('debe retornar true si estado es STANDBY', () => {
      const estado = EstadoEquipo.create(EstadoEquipoEnum.STANDBY);
      expect(estado.puedeRecibirMantenimiento()).toBe(true);
    });

    it('debe retornar false si estado es INACTIVO', () => {
      const estado = EstadoEquipo.create(EstadoEquipoEnum.INACTIVO);
      expect(estado.puedeRecibirMantenimiento()).toBe(false);
    });

    it('debe retornar false si estado es EN_REPARACION', () => {
      const estado = EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION);
      expect(estado.puedeRecibirMantenimiento()).toBe(false);
    });

    it('debe retornar false si estado es FUERA_SERVICIO', () => {
      const estado = EstadoEquipo.create(EstadoEquipoEnum.FUERA_SERVICIO);
      expect(estado.puedeRecibirMantenimiento()).toBe(false);
    });

    it('debe retornar false si estado es BAJA', () => {
      const estado = EstadoEquipo.create(EstadoEquipoEnum.BAJA);
      expect(estado.puedeRecibirMantenimiento()).toBe(false);
    });
  });

  describe('equals', () => {
    it('debe retornar true cuando dos EstadoEquipo tienen el mismo valor', () => {
      const estado1 = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
      const estado2 = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
      
      expect(estado1.equals(estado2)).toBe(true);
    });

    it('debe retornar false cuando dos EstadoEquipo tienen diferentes valores', () => {
      const estado1 = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
      const estado2 = EstadoEquipo.create(EstadoEquipoEnum.STANDBY);
      
      expect(estado1.equals(estado2)).toBe(false);
    });

    it('debe retornar false cuando se compara con null', () => {
      const estado = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
      
      expect(estado.equals(null as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('debe retornar string con el valor del estado', () => {
      const estado = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
      
      expect(estado.toString()).toBe('OPERATIVO');
    });
  });

  describe('immutability', () => {
    it('debe ser inmutable - no se puede modificar el valor interno', () => {
      const estado = EstadoEquipo.create(EstadoEquipoEnum.OPERATIVO);
      const value = estado.getValue();
      
      // Intentar modificar (no debería ser posible con readonly)
      expect(() => {
        (estado as any).value = EstadoEquipoEnum.BAJA;
      }).not.toThrow();
      
      // Verificar que el valor no cambió
      expect(estado.getValue()).toBe(value);
    });
  });
});
