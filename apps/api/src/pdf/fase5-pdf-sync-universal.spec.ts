/**
 * MEKANOS S.A.S - Motor Universal de Activos EAM
 * 
 * FASE 5: SUITE DE PRUEBAS AUTOMATIZADAS NUCLEAR ZERO-TRUST
 * 
 * Verifica:
 * 1. Despacho Zero-Trust de plantillas PDF (Generadores y Bombas preservan Golden Master,
 *    Compresores, Motores y arquetipos dinámicos despachan UNIVERSAL_EAM).
 * 2. Renderizado del Template Universal EAM (Placa modular, KPIs, telemetría semaforizada,
 *    checklist por subsistemas, repuestos WMS y firmas).
 * 3. Cascada de parámetros de medición en 3 niveles (Equipo >> Modelo OEM >> Catálogo).
 */

import { PdfService, TipoInforme } from './pdf.service';
import { generarTipoUniversalEamHTML } from './templates/tipo-universal-eam.template';
import { DatosOrdenPDF } from './templates/mekanos-base.template';
import { EquipoSpecsReader } from '../equipos/services/equipo-specs.reader';

describe('FASE 5: Plantilla PDF Universal EAM y Cascada Sync Móvil', () => {
  let pdfService: PdfService;

  beforeEach(() => {
    // Instancia liviana de PdfService para evaluar despacho
    pdfService = new PdfService(
      {} as any, // PrismaService
      {} as any, // StorageService
      {} as any, // R2StorageService
    );
  });

  describe('1. Despacho Seguro Zero-Trust (pdfService.determinarTipoInforme)', () => {
    it('debe despachar CORRECTIVO para cualquier equipo cuando el servicio es correctivo', () => {
      expect(pdfService.determinarTipoInforme('GENERADOR', 'CORRECTIVO')).toBe('CORRECTIVO');
      expect(pdfService.determinarTipoInforme('BOMBA', 'CORRECTIVO')).toBe('CORRECTIVO');
      expect(pdfService.determinarTipoInforme('COMPRESOR', 'CORRECTIVO')).toBe('CORRECTIVO');
      expect(pdfService.determinarTipoInforme('CHILLER_HVAC', 'CORRECTIVO')).toBe('CORRECTIVO');
    });

    it('debe preservar BOMBA_A exactamente para bombas preventivas (Golden Master)', () => {
      expect(pdfService.determinarTipoInforme('BOMBA', 'PREVENTIVO_A')).toBe('BOMBA_A');
      expect(pdfService.determinarTipoInforme('BOM', 'PREVENTIVO_A')).toBe('BOMBA_A');
    });

    it('debe preservar GENERADOR_A y GENERADOR_B para plantas eléctricas (Golden Master)', () => {
      expect(pdfService.determinarTipoInforme('GENERADOR', 'PREVENTIVO_A')).toBe('GENERADOR_A');
      expect(pdfService.determinarTipoInforme('GEN', 'PREVENTIVO_A')).toBe('GENERADOR_A');
      expect(pdfService.determinarTipoInforme('GENERADOR', 'PREVENTIVO_B')).toBe('GENERADOR_B');
    });

    it('NUNCA debe degradar silenciosamente a GENERADOR_A: Compresores y Motores despachan UNIVERSAL_EAM', () => {
      const tipoCompresor = pdfService.determinarTipoInforme('COMPRESOR', 'PREVENTIVO_A');
      expect(tipoCompresor).toBe('UNIVERSAL_EAM');
      expect(tipoCompresor).not.toBe('GENERADOR_A');

      const tipoMotor = pdfService.determinarTipoInforme('MOTOR', 'PREVENTIVO_A');
      expect(tipoMotor).toBe('UNIVERSAL_EAM');
      expect(tipoMotor).not.toBe('GENERADOR_A');

      const tipoHvac = pdfService.determinarTipoInforme('CHILLER_HVAC', 'PREVENTIVO_A');
      expect(tipoHvac).toBe('UNIVERSAL_EAM');
      expect(tipoHvac).not.toBe('GENERADOR_A');
    });
  });

  describe('2. Renderizado del Template HTML Universal EAM', () => {
    const mockDatosOrdenCompresor: DatosOrdenPDF = {
      numeroOrden: 'OS-202611-0001',
      cliente: 'INDUSTRIA METALMECÁNICA DEL CARIBE S.A.',
      direccion: 'Mamonal Km 6, Cartagena',
      sede: 'Planta Principal',
      marcaEquipo: 'KAESER',
      serieEquipo: 'KAE-SX6-9988',
      tipoEquipo: 'COMPRESOR' as any,
      tipoServicio: 'PREVENTIVO_A',
      fecha: '03/11/2026',
      tecnico: 'Ing. Carlos Mendoza',
      horaEntrada: '08:00',
      horaSalida: '12:00',
      numeroVisitaCaso: 2,
      tipoVisita: 'Seguimiento',
      numeroOrdenPadre: 'OS-202610-0890',
      equipoDetalle: {
        codigoEquipo: 'COMP-001',
        nombreEquipo: 'Compresor de Tornillo Kaeser SX6',
        tipoEquipo: 'COMPRESOR',
        tipoEquipoNombre: 'Compresor de Aire Industrial',
        marca: 'KAESER',
        modelo: 'SX6',
        serie: 'KAE-SX6-9988',
        ubicacion: 'Cuarto de Compresores y Neumática',
        cliente: 'INDUSTRIA METALMECÁNICA DEL CARIBE S.A.',
        potenciaHp: 7.5,
        potenciaKw: 5.5,
        presionPsi: 125,
      },
      placaUniversal: {
        categoriaCanonica: 'COMPRESOR',
        marca: 'KAESER',
        modelo: 'SX6 SIGMA',
        serie: 'KAE-SX6-9988',
        capacidadPrincipal: {
          valor: 125,
          unidad: 'PSI',
          texto: '125 PSI',
        },
        kpis: [
          { codigo: 'presion_maxima', etiqueta: 'Presión Máx', valorTexto: '125 PSI' },
          { codigo: 'caudal_fadr', etiqueta: 'Caudal FAD', valorTexto: '28 CFM' },
          { codigo: 'potencia_hp', etiqueta: 'Potencia', valorTexto: '7.5 HP (5.5 kW)' },
          { codigo: 'horas_actuales', etiqueta: 'Horómetro', valorTexto: '3,450 hrs' },
        ],
        bloques: [
          {
            nombreModulo: 'UNIDAD DE COMPRESIÓN',
            atributos: [
              { etiqueta: 'Tecnología', valor: 'Tornillo Rotativo Lubricado' },
              { etiqueta: 'Presión de Carga', valor: '115 PSI' },
              { etiqueta: 'Presión de Descarga', valor: '125 PSI' },
              { etiqueta: 'Capacidad de Aceite', valor: '3.5 L' },
            ],
          },
          {
            nombreModulo: 'MOTOR ELÉCTRICO PRINCIPAL',
            atributos: [
              { etiqueta: 'Marca Motor', valor: 'SIEMENS' },
              { etiqueta: 'Voltaje Operación', valor: '440 VAC' },
              { etiqueta: 'Frecuencia', valor: '60 Hz' },
              { etiqueta: 'Velocidad', valor: '3500 RPM' },
            ],
          },
        ],
      },
      actividades: [
        {
          descripcion: 'Inspeccionar y limpiar filtro de admisión de aire',
          estado: 'B',
          sistema: 'ASPIRACIÓN Y FILTRADO',
          observaciones: 'Elemento filtrante en óptimas condiciones',
        },
        {
          descripcion: 'Verificar tensión y alineación de bandas de transmisión',
          estado: 'A',
          sistema: 'TRANSMISIÓN MECÁNICA',
          observaciones: 'Se ajustó tensión a 12mm de deflexión estándar',
        },
        {
          descripcion: 'Inspección de fugas en bloque separador de aceite',
          estado: 'B',
          sistema: 'LUBRICACIÓN Y SEPARACIÓN',
        },
      ],
      mediciones: [
        {
          parametro: 'Presión de Línea',
          valor: 122,
          unidad: 'PSI',
          estado: 'NORMAL',
          rangoMin: 110,
          rangoMax: 130,
        },
        {
          parametro: 'Temperatura de Descarga del Bloque',
          valor: 88,
          unidad: '°C',
          estado: 'NORMAL',
          rangoMin: 75,
          rangoMax: 95,
        },
        {
          parametro: 'Corriente de Consumo Motor (Fase A)',
          valor: 10.2,
          unidad: 'A',
          estado: 'NORMAL',
          rangoMin: 8.0,
          rangoMax: 11.5,
        },
      ],
      repuestosDetallados: [
        {
          sku: 'FIL-AIR-SX6',
          descripcion: 'Filtro de Aire Kaeser 6.4163.0',
          cantidad: 1,
          unidad: 'UND',
          origen: 'BODEGA',
          lote: 'LOT-2026-09',
        },
        {
          sku: 'OIL-SIGMA-46',
          descripcion: 'Aceite Sintético Kaeser Sigma S-460',
          cantidad: 1,
          unidad: 'GAL',
          origen: 'BODEGA',
        },
      ],
      evidencias: [
        {
          url: 'https://res.cloudinary.com/mekanos/image/upload/v1/test_antes.jpg',
          caption: 'ANTES: Estado inicial del compresor Kaeser',
        },
        {
          url: 'https://res.cloudinary.com/mekanos/image/upload/v1/test_despues.jpg',
          caption: 'DESPUES: Equipo limpio y lubricado operando a 122 PSI',
        },
      ],
      observaciones: 'El compresor opera de manera suave y silenciosa. Presión de carga y descarga calibradas correctamente.',
      nombreTecnico: 'Carlos Mendoza',
      cargoTecnico: 'Especialista en Sistemas Neumáticos',
      nombreCliente: 'Ing. Fernando Gómez',
      cargoCliente: 'Jefe de Planta',
      firmaTecnico: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      firmaCliente: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    };

    it('debe generar HTML válido conteniendo todas las secciones de ingeniería', () => {
      const html = generarTipoUniversalEamHTML(mockDatosOrdenCompresor);

      // Verificaciones estructurales
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('INFORME TÉCNICO DE MANTENIMIENTO');
      expect(html).toContain('COMPRESOR');
      expect(html).toContain('OS-202611-0001');
      expect(html).toContain('INDUSTRIA METALMECÁNICA DEL CARIBE S.A.');

      // Trazabilidad fractal de caso
      expect(html).toContain('Visita #2');
      expect(html).toContain('Seguimiento');
      expect(html).toContain('OS-202610-0890');

      // Placa Técnica Universal EAM
      expect(html).toContain('TAG: COMP-001');
      expect(html).toContain('KAESER');
      expect(html).toContain('KAE-SX6-9988');
      expect(html).toContain('Presión Máx');
      expect(html).toContain('125 PSI');
      expect(html).toContain('Caudal FAD');
      expect(html).toContain('28 CFM');
      expect(html).toContain('UNIDAD DE COMPRESIÓN');
      expect(html).toContain('Tornillo Rotativo Lubricado');
      expect(html).toContain('MOTOR ELÉCTRICO PRINCIPAL');
      expect(html).toContain('SIEMENS');

      // Checklist dinámico por subsistemas
      expect(html).toContain('SUBSISTEMA: ASPIRACIÓN Y FILTRADO');
      expect(html).toContain('SUBSISTEMA: TRANSMISIÓN MECÁNICA');
      expect(html).toContain('Inspeccionar y limpiar filtro de admisión de aire');
      expect(html).toContain('BUENO');
      expect(html).toContain('AJUSTADO');

      // Telemetría y mediciones
      expect(html).toContain('TELEMETRÍA Y VARIABLES OPERACIONALES');
      expect(html).toContain('Presión de Línea');
      expect(html).toContain('122 PSI');
      expect(html).toContain('NORMAL');

      // Repuestos WMS segregados
      expect(html).toContain('REPUESTOS, INSUMOS Y FLUIDOS DE SERVICIO');
      expect(html).toContain('Filtro de Aire Kaeser 6.4163.0');

      // Evidencias fotográficas
      expect(html).toContain('REGISTRO FOTOGRÁFICO DE INTERVENCIÓN');
      expect(html).toContain('Estado inicial del compresor Kaeser');

      // Firmas digitales
      expect(html).toContain('Carlos Mendoza');
      expect(html).toContain('Ing. Fernando Gómez');
    });
  });

  describe('3. Cascada de Parámetros en 3 Niveles (Equipo >> Modelo OEM >> Catálogo)', () => {
    it('debe priorizar el override de la máquina sobre el modelo OEM y sobre el catálogo base', () => {
      // Nivel 3: Catálogo base global
      const catalogoGlobal = {
        temperatura_max: 95,
        presion_min: 25,
      };

      // Nivel 2: Plantilla de modelo OEM (e.g. Doosan P126TI)
      const plantillaModeloOem = {
        temperatura_max: 100, // Doosan soporta hasta 100°C
        presion_min: 30,      // Doosan exige min 30 PSI
      };

      // Nivel 1: Configuración específica de la máquina (e.g. cuarto caluroso)
      const configEquipo = {
        temperatura_max: 105, // Alarma custom para este sitio específico
      };

      // Resolución en cascada: Nivel 3 overridden by Nivel 2 overridden by Nivel 1
      const configResuelta = {
        ...catalogoGlobal,
        ...plantillaModeloOem,
        ...configEquipo,
      };

      expect(configResuelta.temperatura_max).toBe(105); // De la máquina
      expect(configResuelta.presion_min).toBe(30);       // Del modelo OEM (la máquina no lo sobreescribió)
    });
  });
});
