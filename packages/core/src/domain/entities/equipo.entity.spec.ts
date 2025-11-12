import { EquipoEntity, CreateEquipoProps } from './equipo.entity';
import { EstadoEquipo, EstadoEquipoEnum } from '../value-objects/estado-equipo.vo';

describe('EquipoEntity', () => {
  describe('create', () => {
    const validProps: CreateEquipoProps = {
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      serie: 'SN12345',
      clienteId: 1,
      sedeId: 1,
      tipoEquipoId: 1,
      nombreEquipo: 'Generador Principal'
    };

    it('debe crear un equipo con props válidos', () => {
      const equipo = EquipoEntity.create(validProps);

      expect(equipo).toBeInstanceOf(EquipoEntity);
      expect(equipo.codigo.getValue()).toBe('GEN-2024-0001');
      expect(equipo.marca).toBe('CUMMINS'); // uppercase
      expect(equipo.modelo).toBe('C150'); // uppercase
      expect(equipo.serie).toBe('SN12345'); // uppercase
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.OPERATIVO);
    });

    it('debe crear equipo con estado inicial OPERATIVO', () => {
      const equipo = EquipoEntity.create(validProps);
      
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.OPERATIVO);
      expect(equipo.estado.esOperativo()).toBe(true);
    });

    it('debe normalizar marca y modelo a uppercase', () => {
      const props = { ...validProps, marca: 'cummins', modelo: 'c150' };
      const equipo = EquipoEntity.create(props);
      
      expect(equipo.marca).toBe('CUMMINS');
      expect(equipo.modelo).toBe('C150');
    });

    it('debe normalizar serie a uppercase si está presente', () => {
      const props = { ...validProps, serie: 'sn12345' };
      const equipo = EquipoEntity.create(props);
      
      expect(equipo.serie).toBe('SN12345');
    });

    it('debe aceptar serie como opcional', () => {
      const props = { ...validProps, serie: undefined };
      const equipo = EquipoEntity.create(props);
      
      expect(equipo.serie).toBeNull();
    });

    it('debe aceptar sedeId como opcional', () => {
      const props = { ...validProps, sedeId: undefined };
      const equipo = EquipoEntity.create(props);
      
      expect(equipo.sedeId).toBeNull();
    });

    it('debe aceptar nombreEquipo como opcional', () => {
      const props = { ...validProps, nombreEquipo: undefined };
      const equipo = EquipoEntity.create(props);
      
      expect(equipo.nombreEquipo).toBeNull();
    });

    it('debe establecer fechaRegistro automáticamente', () => {
      const antes = new Date();
      const equipo = EquipoEntity.create(validProps);
      const despues = new Date();
      
      expect(equipo.fechaRegistro.getTime()).toBeGreaterThanOrEqual(antes.getTime());
      expect(equipo.fechaRegistro.getTime()).toBeLessThanOrEqual(despues.getTime());
    });

    it('debe establecer ultimoMantenimiento como null al crear', () => {
      const equipo = EquipoEntity.create(validProps);
      
      expect(equipo.ultimoMantenimiento).toBeNull();
    });

    it('debe lanzar error si marca está vacía', () => {
      const props = { ...validProps, marca: '' };
      
      expect(() => EquipoEntity.create(props)).toThrow('Marca es requerida');
    });

    it('debe lanzar error si marca solo contiene espacios', () => {
      const props = { ...validProps, marca: '   ' };
      
      expect(() => EquipoEntity.create(props)).toThrow('Marca es requerida');
    });

    it('debe lanzar error si modelo está vacío', () => {
      const props = { ...validProps, modelo: '' };
      
      expect(() => EquipoEntity.create(props)).toThrow('Modelo es requerido');
    });

    it('debe lanzar error si modelo solo contiene espacios', () => {
      const props = { ...validProps, modelo: '   ' };
      
      expect(() => EquipoEntity.create(props)).toThrow('Modelo es requerido');
    });

    it('debe lanzar error si clienteId es cero', () => {
      const props = { ...validProps, clienteId: 0 };
      
      expect(() => EquipoEntity.create(props)).toThrow('ClienteId inválido');
    });

    it('debe lanzar error si clienteId es negativo', () => {
      const props = { ...validProps, clienteId: -1 };
      
      expect(() => EquipoEntity.create(props)).toThrow('ClienteId inválido');
    });

    it('debe lanzar error si tipoEquipoId es cero', () => {
      const props = { ...validProps, tipoEquipoId: 0 };
      
      expect(() => EquipoEntity.create(props)).toThrow('TipoEquipoId inválido');
    });

    it('debe lanzar error si tipoEquipoId es negativo', () => {
      const props = { ...validProps, tipoEquipoId: -1 };
      
      expect(() => EquipoEntity.create(props)).toThrow('TipoEquipoId inválido');
    });

    it('debe lanzar error si sedeId es cero', () => {
      const props = { ...validProps, sedeId: 0 };
      
      expect(() => EquipoEntity.create(props)).toThrow('SedeId inválido');
    });

    it('debe lanzar error si sedeId es negativo', () => {
      const props = { ...validProps, sedeId: -1 };
      
      expect(() => EquipoEntity.create(props)).toThrow('SedeId inválido');
    });
  });

  describe('cambiarEstado', () => {
    const validProps: CreateEquipoProps = {
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      clienteId: 1,
      tipoEquipoId: 1
    };

    it('debe permitir cambio de estado válido', () => {
      const equipo = EquipoEntity.create(validProps);
      const nuevoEstado = EstadoEquipo.standby();
      
      equipo.cambiarEstado(nuevoEstado);
      
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.STANDBY);
    });

    it('debe lanzar error si transición no es permitida', () => {
      const equipo = EquipoEntity.create(validProps);
      const estadoBaja = EstadoEquipo.create(EstadoEquipoEnum.BAJA);
      
      expect(() => equipo.cambiarEstado(estadoBaja)).toThrow(
        'No se puede transicionar de OPERATIVO a BAJA'
      );
    });

    it('debe permitir múltiples transiciones válidas en secuencia', () => {
      const equipo = EquipoEntity.create(validProps);
      
      equipo.cambiarEstado(EstadoEquipo.create(EstadoEquipoEnum.INACTIVO));
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.INACTIVO);
      
      equipo.cambiarEstado(EstadoEquipo.create(EstadoEquipoEnum.BAJA));
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.BAJA);
    });
  });

  describe('registrarMantenimiento', () => {
    const validProps: CreateEquipoProps = {
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      clienteId: 1,
      tipoEquipoId: 1
    };

    it('debe registrar mantenimiento si equipo está OPERATIVO', () => {
      const equipo = EquipoEntity.create(validProps);
      expect(equipo.ultimoMantenimiento).toBeNull();
      
      const antes = new Date();
      equipo.registrarMantenimiento();
      const despues = new Date();
      
      expect(equipo.ultimoMantenimiento).not.toBeNull();
      expect(equipo.ultimoMantenimiento!.getTime()).toBeGreaterThanOrEqual(antes.getTime());
      expect(equipo.ultimoMantenimiento!.getTime()).toBeLessThanOrEqual(despues.getTime());
    });

    it('debe registrar mantenimiento si equipo está en STANDBY', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.cambiarEstado(EstadoEquipo.standby());
      
      equipo.registrarMantenimiento();
      
      expect(equipo.ultimoMantenimiento).not.toBeNull();
    });

    it('debe lanzar error si equipo está INACTIVO', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.cambiarEstado(EstadoEquipo.inactivo());
      
      expect(() => equipo.registrarMantenimiento()).toThrow(
        'Equipo no puede recibir mantenimiento en estado actual'
      );
    });

    it('debe lanzar error si equipo está EN_REPARACION', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.cambiarEstado(EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION));
      
      expect(() => equipo.registrarMantenimiento()).toThrow(
        'Equipo no puede recibir mantenimiento en estado actual'
      );
    });

    it('debe lanzar error si equipo está dado de BAJA', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.cambiarEstado(EstadoEquipo.inactivo());
      equipo.cambiarEstado(EstadoEquipo.create(EstadoEquipoEnum.BAJA));
      
      expect(() => equipo.registrarMantenimiento()).toThrow(
        'Equipo no puede recibir mantenimiento en estado actual'
      );
    });
  });

  describe('activar', () => {
    const validProps: CreateEquipoProps = {
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      clienteId: 1,
      tipoEquipoId: 1
    };

    it('debe activar equipo desde STANDBY', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.cambiarEstado(EstadoEquipo.standby());
      
      equipo.activar();
      
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.OPERATIVO);
    });

    it('debe activar equipo desde INACTIVO', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.cambiarEstado(EstadoEquipo.inactivo());
      
      equipo.activar();
      
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.OPERATIVO);
    });

    it('debe activar equipo desde EN_REPARACION', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.cambiarEstado(EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION));
      
      equipo.activar();
      
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.OPERATIVO);
    });
  });

  describe('desactivar', () => {
    const validProps: CreateEquipoProps = {
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      clienteId: 1,
      tipoEquipoId: 1
    };

    it('debe desactivar equipo desde OPERATIVO', () => {
      const equipo = EquipoEntity.create(validProps);
      
      equipo.desactivar();
      
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.INACTIVO);
    });

    it('debe desactivar equipo desde STANDBY', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.cambiarEstado(EstadoEquipo.standby());
      
      equipo.desactivar();
      
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.INACTIVO);
    });
  });

  describe('marcarEnMantenimiento', () => {
    const validProps: CreateEquipoProps = {
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      clienteId: 1,
      tipoEquipoId: 1
    };

    it('debe marcar en mantenimiento desde OPERATIVO', () => {
      const equipo = EquipoEntity.create(validProps);
      
      equipo.marcarEnMantenimiento();
      
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.EN_REPARACION);
    });

    it('debe marcar en mantenimiento desde STANDBY', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.cambiarEstado(EstadoEquipo.standby());
      
      equipo.marcarEnMantenimiento();
      
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.EN_REPARACION);
    });

    it('debe lanzar error si equipo está INACTIVO', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.cambiarEstado(EstadoEquipo.inactivo());
      
      expect(() => equipo.marcarEnMantenimiento()).toThrow(
        'Solo equipos operativos o en standby pueden entrar en mantenimiento'
      );
    });

    it('debe lanzar error si equipo ya está EN_REPARACION', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.cambiarEstado(EstadoEquipo.create(EstadoEquipoEnum.EN_REPARACION));
      
      expect(() => equipo.marcarEnMantenimiento()).toThrow(
        'Solo equipos operativos o en standby pueden entrar en mantenimiento'
      );
    });
  });

  describe('finalizarMantenimiento', () => {
    const validProps: CreateEquipoProps = {
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      clienteId: 1,
      tipoEquipoId: 1
    };

    it('debe finalizar mantenimiento y volver a OPERATIVO', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.marcarEnMantenimiento();
      expect(equipo.ultimoMantenimiento).toBeNull();
      
      equipo.finalizarMantenimiento();
      
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.OPERATIVO);
      expect(equipo.ultimoMantenimiento).not.toBeNull();
    });

    it('debe actualizar fecha de último mantenimiento', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.marcarEnMantenimiento();
      
      const antes = new Date();
      equipo.finalizarMantenimiento();
      const despues = new Date();
      
      expect(equipo.ultimoMantenimiento!.getTime()).toBeGreaterThanOrEqual(antes.getTime());
      expect(equipo.ultimoMantenimiento!.getTime()).toBeLessThanOrEqual(despues.getTime());
    });
  });

  describe('darDeBaja', () => {
    const validProps: CreateEquipoProps = {
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      clienteId: 1,
      tipoEquipoId: 1
    };

    it('debe dar de baja equipo si está INACTIVO', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.desactivar();
      
      equipo.darDeBaja();
      
      expect(equipo.estado.getValue()).toBe(EstadoEquipoEnum.BAJA);
    });

    it('debe lanzar error si equipo está OPERATIVO', () => {
      const equipo = EquipoEntity.create(validProps);
      
      expect(() => equipo.darDeBaja()).toThrow(
        'Solo equipos inactivos pueden ser dados de baja'
      );
    });

    it('debe lanzar error si equipo está STANDBY', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.cambiarEstado(EstadoEquipo.standby());
      
      expect(() => equipo.darDeBaja()).toThrow(
        'Solo equipos inactivos pueden ser dados de baja'
      );
    });

    it('debe lanzar error si equipo está EN_REPARACION', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.marcarEnMantenimiento();
      
      expect(() => equipo.darDeBaja()).toThrow(
        'Solo equipos inactivos pueden ser dados de baja'
      );
    });
  });

  describe('actualizarInformacion', () => {
    const validProps: CreateEquipoProps = {
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      serie: 'SN12345',
      clienteId: 1,
      tipoEquipoId: 1,
      nombreEquipo: 'Generador Principal'
    };

    it('debe actualizar marca', () => {
      const equipo = EquipoEntity.create(validProps);
      
      equipo.actualizarInformacion('Perkins');
      
      expect(equipo.marca).toBe('PERKINS');
    });

    it('debe actualizar modelo', () => {
      const equipo = EquipoEntity.create(validProps);
      
      equipo.actualizarInformacion(undefined, 'C200');
      
      expect(equipo.modelo).toBe('C200');
    });

    it('debe actualizar serie', () => {
      const equipo = EquipoEntity.create(validProps);
      
      equipo.actualizarInformacion(undefined, undefined, 'NEW123');
      
      expect(equipo.serie).toBe('NEW123');
    });

    it('debe actualizar nombreEquipo', () => {
      const equipo = EquipoEntity.create(validProps);
      
      equipo.actualizarInformacion(undefined, undefined, undefined, 'Generador Secundario');
      
      expect(equipo.nombreEquipo).toBe('Generador Secundario');
    });

    it('debe permitir limpiar serie con string vacío', () => {
      const equipo = EquipoEntity.create(validProps);
      
      equipo.actualizarInformacion(undefined, undefined, '');
      
      expect(equipo.serie).toBeNull();
    });

    it('debe permitir limpiar nombreEquipo con string vacío', () => {
      const equipo = EquipoEntity.create(validProps);
      
      equipo.actualizarInformacion(undefined, undefined, undefined, '');
      
      expect(equipo.nombreEquipo).toBeNull();
    });

    it('debe normalizar marca a uppercase', () => {
      const equipo = EquipoEntity.create(validProps);
      
      equipo.actualizarInformacion('perkins');
      
      expect(equipo.marca).toBe('PERKINS');
    });

    it('debe normalizar modelo a uppercase', () => {
      const equipo = EquipoEntity.create(validProps);
      
      equipo.actualizarInformacion(undefined, 'c200');
      
      expect(equipo.modelo).toBe('C200');
    });

    it('debe normalizar serie a uppercase', () => {
      const equipo = EquipoEntity.create(validProps);
      
      equipo.actualizarInformacion(undefined, undefined, 'new123');
      
      expect(equipo.serie).toBe('NEW123');
    });

    it('NO debe actualizar si marca está vacía', () => {
      const equipo = EquipoEntity.create(validProps);
      const marcaOriginal = equipo.marca;
      
      equipo.actualizarInformacion('');
      
      expect(equipo.marca).toBe(marcaOriginal);
    });

    it('NO debe actualizar si modelo está vacío', () => {
      const equipo = EquipoEntity.create(validProps);
      const modeloOriginal = equipo.modelo;
      
      equipo.actualizarInformacion(undefined, '');
      
      expect(equipo.modelo).toBe(modeloOriginal);
    });

    it('debe lanzar error si equipo está dado de BAJA', () => {
      const equipo = EquipoEntity.create(validProps);
      equipo.desactivar();
      equipo.darDeBaja();
      
      expect(() => equipo.actualizarInformacion('Perkins')).toThrow(
        'No se puede actualizar un equipo dado de baja'
      );
    });
  });

  describe('toObject', () => {
    const validProps: CreateEquipoProps = {
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      serie: 'SN12345',
      clienteId: 1,
      sedeId: 2,
      tipoEquipoId: 1,
      nombreEquipo: 'Generador Principal'
    };

    it('debe retornar objeto plano con todas las propiedades', () => {
      const equipo = EquipoEntity.create(validProps);
      const obj = equipo.toObject();
      
      expect(obj).toHaveProperty('id');
      expect(obj).toHaveProperty('codigo');
      expect(obj).toHaveProperty('marca');
      expect(obj).toHaveProperty('modelo');
      expect(obj).toHaveProperty('serie');
      expect(obj).toHaveProperty('clienteId');
      expect(obj).toHaveProperty('sedeId');
      expect(obj).toHaveProperty('tipoEquipoId');
      expect(obj).toHaveProperty('nombreEquipo');
      expect(obj).toHaveProperty('estado');
      expect(obj).toHaveProperty('fechaRegistro');
      expect(obj).toHaveProperty('ultimoMantenimiento');
    });

    it('debe retornar valores primitivos, no Value Objects', () => {
      const equipo = EquipoEntity.create(validProps);
      const obj = equipo.toObject();
      
      expect(typeof obj.id).toBe('number');
      expect(typeof obj.codigo).toBe('string');
      expect(typeof obj.estado).toBe('string');
      expect(obj.estado).toBe('OPERATIVO');
    });
  });
});
