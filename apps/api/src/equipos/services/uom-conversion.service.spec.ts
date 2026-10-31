/**
 * MEKANOS S.A.S - Motor Universal de Activos EAM
 * 
 * Pruebas Unitarias del Motor Dimensional Afín UoM (UomConversionService)
 * 
 * Certifica el modelo matemático:
 *   y = a * x + b
 * y la transformación bidireccional entre unidades físicas de la misma magnitud.
 */

import { UomConversionService } from './uom-conversion.service';

describe('UomConversionService (Motor Dimensional UoM)', () => {
  let service: UomConversionService;

  beforeEach(() => {
    service = new UomConversionService();
  });

  describe('Normalización de Códigos y Detección de Alias', () => {
    it('debe normalizar símbolos y alias de temperatura', () => {
      expect(UomConversionService.normalizarCodigo('°C')).toBe('C');
      expect(UomConversionService.normalizarCodigo('celsius')).toBe('C');
      expect(UomConversionService.normalizarCodigo('CENTIGRADOS')).toBe('C');
      expect(UomConversionService.normalizarCodigo('°F')).toBe('F');
      expect(UomConversionService.normalizarCodigo('fahrenheit')).toBe('F');
    });

    it('debe normalizar símbolos y alias de volumen', () => {
      expect(UomConversionService.normalizarCodigo('L')).toBe('LIT');
      expect(UomConversionService.normalizarCodigo('litros')).toBe('LIT');
      expect(UomConversionService.normalizarCodigo('lt')).toBe('LIT');
      expect(UomConversionService.normalizarCodigo('gal')).toBe('GAL');
      expect(UomConversionService.normalizarCodigo('galon')).toBe('GAL');
      expect(UomConversionService.normalizarCodigo('gln')).toBe('GAL');
    });

    it('debe normalizar símbolos y alias de potencia', () => {
      expect(UomConversionService.normalizarCodigo('kw')).toBe('KW');
      expect(UomConversionService.normalizarCodigo('hp')).toBe('HP');
      expect(UomConversionService.normalizarCodigo('caballos')).toBe('HP');
      expect(UomConversionService.normalizarCodigo('kva')).toBe('KVA');
    });

    it('debe normalizar caudal y presión', () => {
      expect(UomConversionService.normalizarCodigo('m3/h')).toBe('M3H');
      expect(UomConversionService.normalizarCodigo('m³/h')).toBe('M3H');
      expect(UomConversionService.normalizarCodigo('gpm')).toBe('GPM');
      expect(UomConversionService.normalizarCodigo('psi')).toBe('PSI');
      expect(UomConversionService.normalizarCodigo('bar')).toBe('BAR');
    });
  });

  describe('Compatibilidad Dimensional', () => {
    it('debe identificar unidades de la misma magnitud como compatibles', () => {
      expect(UomConversionService.sonCompatibles('GAL', 'LIT')).toBe(true);
      expect(UomConversionService.sonCompatibles('HP', 'KW')).toBe(true);
      expect(UomConversionService.sonCompatibles('PSI', 'BAR')).toBe(true);
      expect(UomConversionService.sonCompatibles('C', 'F')).toBe(true);
      expect(UomConversionService.sonCompatibles('GPM', 'M3H')).toBe(true);
    });

    it('debe rechazar incompatibilidad dimensional entre distintas magnitudes', () => {
      expect(UomConversionService.sonCompatibles('PSI', 'LIT')).toBe(false);
      expect(UomConversionService.sonCompatibles('KW', 'BAR')).toBe(false);
      expect(UomConversionService.sonCompatibles('C', 'GPM')).toBe(false);
    });
  });

  describe('Transformaciones Dimensionales: Volumen (LIT <-> GAL)', () => {
    it('debe convertir exactamente 1 galón a ~3.78541 litros', () => {
      const litros = service.convertir(1, 'GAL', 'LIT', { decimales: 5 });
      expect(litros).toBe(3.78541);
    });

    it('debe convertir 65 galones a ~246.05 litros (fórmula canónica de tanques generadores)', () => {
      const litros = service.convertir(65, 'GAL', 'LIT', { decimales: 2 });
      expect(litros).toBe(246.05);
    });

    it('debe realizar la conversión inversa de 246.0518 L a ~65 galones', () => {
      const galones = service.convertir(246.05176596, 'LIT', 'GAL', { decimales: 2 });
      expect(galones).toBe(65.0);
    });

    it('debe formatear la equivalencia textual correctamente', () => {
      const texto = service.formatearEquivalencia(65, 'GAL', 'LIT', { decimales: 2 });
      expect(texto).toBe('65 Gal (~246.05 L)');
    });
  });

  describe('Transformaciones Dimensionales: Potencia (KW, HP, kVA)', () => {
    it('debe convertir 100 HP a ~74.57 kW', () => {
      const kw = service.convertir(100, 'HP', 'KW', { decimales: 2 });
      expect(kw).toBe(74.57);
    });

    it('debe convertir 250 kVA a 200 kW con factor de potencia estándar (FP=0.8)', () => {
      const kw = service.convertir(250, 'KVA', 'KW', { decimales: 2 });
      expect(kw).toBe(200.0);
    });

    it('debe soportar factor de potencia personalizado para kVA (ej: FP=0.85)', () => {
      const kw = service.convertir(250, 'KVA', 'KW', { factorPotencia: 0.85, decimales: 2 });
      expect(kw).toBe(212.5);
    });

    it('debe formatear equivalencia de potencia legible', () => {
      const texto = service.formatearEquivalencia(100, 'HP', 'KW', { decimales: 2 });
      expect(texto).toBe('100 HP (~74.57 kW)');
    });
  });

  describe('Transformaciones Dimensionales: Presión (PSI <-> BAR <-> kPa)', () => {
    it('debe convertir 150 PSI a ~10.34 bar', () => {
      const bar = service.convertir(150, 'PSI', 'BAR', { decimales: 2 });
      expect(bar).toBe(10.34);
    });

    it('debe convertir 1 bar a ~14.50 PSI', () => {
      const psi = service.convertir(1, 'BAR', 'PSI', { decimales: 2 });
      expect(psi).toBe(14.50);
    });

    it('debe formatear equivalencia de presión en ordenes de servicio', () => {
      const texto = service.formatearEquivalencia(150, 'PSI', 'BAR', { decimales: 2 });
      expect(texto).toBe('150 PSI (~10.34 bar)');
    });
  });

  describe('Transformaciones Dimensionales Afines: Temperatura (Celsius <-> Fahrenheit <-> Kelvin)', () => {
    it('debe convertir 180 °F a ~82.22 °C (temperatura de trabajo de refrigerante)', () => {
      const celsius = service.convertir(180, 'F', 'C', { decimales: 2 });
      expect(celsius).toBe(82.22);
    });

    it('debe convertir 0 °C a exactamente 32 °F (punto de congelación)', () => {
      const fahrenheit = service.convertir(0, 'C', 'F', { decimales: 2 });
      expect(fahrenheit).toBe(32.0);
    });

    it('debe convertir 100 °C a exactamente 212 °F (punto de ebullición)', () => {
      const fahrenheit = service.convertir(100, 'C', 'F', { decimales: 2 });
      expect(fahrenheit).toBe(212.0);
    });

    it('debe verificar la invariante matemática en -40 (donde °C == °F)', () => {
      const fahrenheit = service.convertir(-40, 'C', 'F', { decimales: 2 });
      expect(fahrenheit).toBe(-40.0);
    });

    it('debe convertir a Kelvin (base física)', () => {
      const kelvin = service.convertir(0, 'C', 'K', { decimales: 2 });
      expect(kelvin).toBe(273.15);
    });

    it('debe formatear equivalencia de temperatura con símbolo grado', () => {
      const texto = service.formatearEquivalencia(180, 'F', 'C', { decimales: 2 });
      expect(texto).toBe('180 °F (~82.22 °C)');
    });
  });

  describe('Transformaciones Dimensionales: Caudal (GPM <-> m³/h)', () => {
    it('debe convertir 100 GPM a ~22.71 m³/h', () => {
      const m3h = service.convertir(100, 'GPM', 'M3H', { decimales: 2 });
      expect(m3h).toBe(22.71);
    });

    it('debe convertir 50 m³/h a ~220.14 GPM', () => {
      const gpm = service.convertir(50, 'M3H', 'GPM', { decimales: 2 });
      expect(gpm).toBe(220.14);
    });

    it('debe formatear equivalencia de caudal', () => {
      const texto = service.formatearEquivalencia(100, 'GPM', 'M3H', { decimales: 2 });
      expect(texto).toBe('100 GPM (~22.71 m³/h)');
    });
  });

  describe('Manejo de Errores y Validaciones Zero-Trust', () => {
    it('debe lanzar error cuando las unidades no son dimensionalmente compatibles', () => {
      expect(() => {
        service.convertir(100, 'PSI', 'LIT');
      }).toThrow('Incompatibilidad dimensional');
    });

    it('debe lanzar error ante unidades inexistentes', () => {
      expect(() => {
        service.convertir(100, 'UNIDAD_INVENTADA', 'LIT');
      }).toThrow('no está registrada');
    });

    it('debe lanzar error si el valor no es un número', () => {
      expect(() => {
        service.convertir(NaN, 'PSI', 'BAR');
      }).toThrow('Valor no numérico');
    });

    it('debe retornar el mismo valor si origen y destino son la misma unidad', () => {
      expect(service.convertir(123.45, 'PSI', 'PSI')).toBe(123.45);
      expect(service.convertir(80, 'C', 'C')).toBe(80);
    });
  });

  describe('convertirABase', () => {
    it('debe transformar a la unidad base de la magnitud correspondiente', () => {
      const resVolumen = service.convertirABase(10, 'GAL');
      expect(resVolumen.unidadBaseCodigo).toBe('LIT');
      expect(resVolumen.magnitudCodigo).toBe('VOLUMEN');
      expect(Number(resVolumen.valorBase.toFixed(2))).toBe(37.85);

      const resPresion = service.convertirABase(1, 'BAR');
      expect(resPresion.unidadBaseCodigo).toBe('PSI');
      expect(resPresion.magnitudCodigo).toBe('PRESION');
      expect(Number(resPresion.valorBase.toFixed(2))).toBe(14.50);
    });
  });

  describe('formatearConSimbolo', () => {
    it('debe aplicar formato con símbolo oficial', () => {
      expect(service.formatearConSimbolo(75, 'HP')).toBe('75 HP');
      expect(service.formatearConSimbolo(82.2, 'C', { decimales: 1 })).toBe('82.2 °C');
      expect(service.formatearConSimbolo(246.05, 'LIT')).toBe('246.05 L');
    });
  });
});
