import { EquipoSpecsReader } from './equipo-specs.reader';

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

  describe('getKpisHeader y getPlacaUniversal', () => {
    it('debe generar los KPIs de cabecera correctamente', () => {
      const equipo = {
        horas_actuales: 1250,
        equipos_generador: { potencia_kva: 200 },
        equipos_motor: {
          marca_motor: 'VOLVO',
          modelo_motor: 'TAD734GE',
          velocidad_nominal_rpm: 1800,
        },
      };

      const kpis = EquipoSpecsReader.getKpisHeader(equipo);
      expect(kpis.length).toBe(4);
      expect(kpis.find(k => k.codigo === 'capacidad_principal')?.valorTexto).toBe('200 kVA');
      expect(kpis.find(k => k.codigo === 'motor')?.valorTexto).toBe('VOLVO TAD734GE');
      expect(kpis.find(k => k.codigo === 'rpm')?.valorTexto).toBe('1800 RPM');
      expect(kpis.find(k => k.codigo === 'horas_actuales')?.valorTexto).toContain('1');
    });

    it('debe generar la estructura de DatosPlacaUniversal para generador con bloques técnicos', () => {
      const equipo = {
        nombre_equipo: 'PLANTA EMERGENCIA 250KVA',
        numero_serie_equipo: 'SN-GEN-999',
        tipos_equipo: { codigo_tipo: 'GEN', nombre_tipo: 'Generador' },
        equipos_generador: {
          marca_generador: 'STAMFORD',
          modelo_generador: 'UCI274',
          potencia_kva: 250,
          voltaje_generador: '220/127',
        },
        equipos_motor: {
          marca_motor: 'CUMMINS',
          modelo_motor: '6CTA',
          potencia_hp: 310,
        },
      };

      const placa = EquipoSpecsReader.getPlacaUniversal(equipo);
      expect(placa.categoriaCanonica).toBe('GENERADOR');
      expect(placa.marca).toBe('STAMFORD');
      expect(placa.modelo).toBe('UCI274');
      expect(placa.capacidadPrincipal?.texto).toBe('250 kVA');
      expect(placa.bloques.length).toBeGreaterThanOrEqual(2);
      expect(placa.bloques.some(b => b.nombreModulo.includes('ALTERNADOR'))).toBe(true);
      expect(placa.bloques.some(b => b.nombreModulo.includes('MOTOR'))).toBe(true);
    });

    it('debe generar la estructura de DatosPlacaUniversal para equipo con JSONB dinámico', () => {
      const equipo = {
        nombre_equipo: 'CHILLER YORK 100TR',
        codigo_equipo: 'EQ-HVAC-001',
        tipos_equipo: { codigo_tipo: 'HVAC', nombre_tipo: 'Aire Acondicionado' },
        especificaciones: {
          compresor: {
            marca: 'YORK',
            modelo: 'YK-MAX',
            refrigerante: 'R-134a',
          },
          rendimiento: {
            capacidad: '100 TR',
            cop: '5.8',
          },
        },
      };

      const placa = EquipoSpecsReader.getPlacaUniversal(equipo);
      expect(placa.categoriaCanonica).toBe('HVAC');
      expect(placa.marca).toBe('YORK');
      expect(placa.modelo).toBe('YK-MAX');
      expect(placa.bloques.length).toBe(2);
      expect(placa.bloques[0].nombreModulo).toBe('COMPRESOR');
      expect(placa.bloques[1].nombreModulo).toBe('RENDIMIENTO');
    });
  });

  describe('leer (unificada)', () => {
    it('debe compilar la ficha unificada completa sin fallar con campos opcionales', () => {
      const equipo = {
        nombre_equipo: 'BOMBA POZO',
        codigo_equipo: 'EQ-BOMBA-01',
        tipos_equipo: { codigo_tipo: 'BOMBA', nombre_tipo: 'Bomba' },
        equipos_bomba: {
          marca_bomba: 'BARNES',
          caudal_maximo_m3h: 50,
        },
      };

      const unificada = EquipoSpecsReader.leer(equipo);
      expect(unificada.marca).toBe('BARNES');
      expect(unificada.categoriaCanonica).toBe('BOMBA');
      expect(unificada.capacidadPrincipal?.texto).toBe('50 m³/h');
    });
  });
});
