import { EquipoSpecsReader } from './equipo-specs-reader';

describe('EquipoSpecsReader', () => {
  describe('getCategoriaCanonica', () => {
    it('debe unificar GEN y GENERADOR a la categoría canónica GENERADOR', () => {
      const eqGen = { tipos_equipo: { codigo_tipo: 'GEN', nombre_tipo: 'GENERADOR ELÉCTRICO' } };
      const eqGenerador = { tipos_equipo: { codigo_tipo: 'GENERADOR', nombre_tipo: 'Generador Eléctrico' } };

      expect(EquipoSpecsReader.getCategoriaCanonica(eqGen)).toBe('GENERADOR');
      expect(EquipoSpecsReader.getCategoriaCanonica(eqGenerador)).toBe('GENERADOR');
    });

    it('debe unificar BOM y BOMBA a la categoría canónica BOMBA', () => {
      const eqBom = { tipos_equipo: { codigo_tipo: 'BOM', nombre_tipo: 'BOMBA HIDRÁULICA' } };
      const eqBomba = { tipos_equipo: { codigo_tipo: 'BOMBA', nombre_tipo: 'Bomba Hidráulica' } };

      expect(EquipoSpecsReader.getCategoriaCanonica(eqBom)).toBe('BOMBA');
      expect(EquipoSpecsReader.getCategoriaCanonica(eqBomba)).toBe('BOMBA');
    });

    it('debe detectar COMPRESOR correctamente', () => {
      const eqComp = { tipos_equipo: { codigo_tipo: 'COMP', nombre_tipo: 'COMPRESOR DE AIRE' } };
      expect(EquipoSpecsReader.getCategoriaCanonica(eqComp)).toBe('COMPRESOR');
    });

    it('debe reclasificar a BOMBA un equipo tipado erróneamente como GENERADOR que tiene código EQ-BOMBA-* y satélite de bomba', () => {
      const eqIncoherente = {
        codigo_equipo: 'EQ-BOMBA-40441',
        tipos_equipo: { codigo_tipo: 'GENERADOR', nombre_tipo: 'Generador Eléctrico' },
        equipos_bomba: { marca_bomba: 'GOULDS', modelo_bomba: '3196-MTX' },
      };
      expect(EquipoSpecsReader.getCategoriaCanonica(eqIncoherente)).toBe('BOMBA');
    });
  });

  describe('getMarca, getModelo y getSerie', () => {
    it('debe leer datos de generador prioritariamente', () => {
      const equipo = {
        nombre_equipo: 'PLANTA EDIFICIO PALMETTO',
        numero_serie_equipo: 'SERIE-BASE-001',
        equipos_generador: {
          marca_generador: 'CUMMINS',
          modelo_generador: 'C150D5',
          numero_serie_generador: 'CUM-998822',
        },
        equipos_motor: {
          marca_motor: 'PERKINS',
        },
      };

      expect(EquipoSpecsReader.getMarca(equipo)).toBe('CUMMINS');
      expect(EquipoSpecsReader.getModelo(equipo)).toBe('C150D5');
      expect(EquipoSpecsReader.getSerie(equipo)).toBe('CUM-998822');
    });

    it('debe leer datos de bomba si no es generador', () => {
      const equipo = {
        nombre_equipo: 'BOMBA RETORNO AGUA',
        numero_serie_equipo: 'SN-BASE-BOMBA',
        equipos_bomba: {
          marca_bomba: 'WEG',
          modelo_bomba: 'W22-PLUS',
          numero_serie_bomba: 'WEG-554433',
        },
      };

      expect(EquipoSpecsReader.getMarca(equipo)).toBe('WEG');
      expect(EquipoSpecsReader.getModelo(equipo)).toBe('W22-PLUS');
      expect(EquipoSpecsReader.getSerie(equipo)).toBe('WEG-554433');
    });

    it('debe leer de especificaciones JSONB dinámicas si están presentes', () => {
      const equipo = {
        especificaciones: {
          motor: {
            marca: 'MITSUBISHI',
            modelo: 'S6R2',
            serie: 'MIT-112233',
          },
        },
      };

      expect(EquipoSpecsReader.getMarca(equipo)).toBe('MITSUBISHI');
      expect(EquipoSpecsReader.getModelo(equipo)).toBe('S6R2');
      expect(EquipoSpecsReader.getSerie(equipo)).toBe('MIT-112233');
    });
  });

  describe('getCapacidadPrincipal y getFluidos', () => {
    it('debe extraer kVA para generador', () => {
      const equipo = {
        equipos_generador: { potencia_kva: 150 },
      };
      const cap = EquipoSpecsReader.getCapacidadPrincipal(equipo);
      expect(cap).toEqual({ valor: 150, unidad: 'kVA', texto: '150 kVA' });
    });

    it('debe extraer caudal para bomba', () => {
      const equipo = {
        equipos_bomba: { caudal_maximo_m3h: 80.5 },
      };
      const cap = EquipoSpecsReader.getCapacidadPrincipal(equipo);
      expect(cap).toEqual({ valor: 80.5, unidad: 'm³/h', texto: '80.5 m³/h' });
    });

    it('debe calcular litros y galones aproximados en fluidos', () => {
      const equipo = {
        equipos_motor: {
          capacidad_aceite_litros: 30,
          tipo_aceite: '15W40',
        },
      };
      const fluidos = EquipoSpecsReader.getFluidos(equipo);
      expect(fluidos?.capacidadAceiteLitros).toBe(30);
      expect(fluidos?.capacidadAceiteGalonesAprox).toBe(7.9); // 30 * 0.264172 ≈ 7.9
      expect(fluidos?.tipoAceite).toBe('15W40');
    });
  });
});
