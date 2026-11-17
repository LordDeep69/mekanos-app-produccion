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

import { PdfService } from './pdf.service';
import {
  esActividadMedicion,
  generarTipoUniversalEamHTML,
} from './templates/tipo-universal-eam.template';
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

  describe('1. Despacho Declarativo EAM (pdfService.determinarTipoInforme)', () => {
    it('debe despachar CORRECTIVO para cualquier equipo cuando el servicio es correctivo o NARRATIVO_CORRECTIVO', () => {
      expect(pdfService.determinarTipoInforme('GENERADOR', 'CORRECTIVO')).toBe('CORRECTIVO');
      expect(pdfService.determinarTipoInforme('BOMBA', 'CORRECTIVO')).toBe('CORRECTIVO');
      expect(pdfService.determinarTipoInforme('COMPRESOR', 'CORRECTIVO')).toBe('CORRECTIVO');
      expect(pdfService.determinarTipoInforme('ASCENSOR', 'PREVENTIVO_A', { formatoDocumento: 'NARRATIVO_CORRECTIVO' })).toBe('CORRECTIVO');
    });

    it('preserva modo legacy únicamente bajo opt-in explícito usaPlantillaUniversal: false', () => {
      expect(pdfService.determinarTipoInforme('BOMBA', 'PREVENTIVO_A', { usaPlantillaUniversal: false })).toBe('BOMBA_A');
      expect(pdfService.determinarTipoInforme('GENERADOR', 'PREVENTIVO_A', { usaPlantillaUniversal: false })).toBe('GENERADOR_A');
      expect(pdfService.determinarTipoInforme('GENERADOR', 'PREVENTIVO_B', { usaPlantillaUniversal: false })).toBe('GENERADOR_B');
    });

    it('converge Generadores, Bombas, Ascensores, Compresores, Motores y HVAC hacia UNIVERSAL_EAM por defecto', () => {
      expect(pdfService.determinarTipoInforme('BOMBA', 'PREVENTIVO_A')).toBe('UNIVERSAL_EAM');
      expect(pdfService.determinarTipoInforme('GENERADOR', 'PREVENTIVO_A')).toBe('UNIVERSAL_EAM');
      expect(pdfService.determinarTipoInforme('ASCENSOR', 'PREVENTIVO_A')).toBe('UNIVERSAL_EAM');

      const tipoCompresor = pdfService.determinarTipoInforme('COMPRESOR', 'PREVENTIVO_A');
      expect(tipoCompresor).toBe('UNIVERSAL_EAM');

      const tipoMotor = pdfService.determinarTipoInforme('MOTOR', 'PREVENTIVO_A');
      expect(tipoMotor).toBe('UNIVERSAL_EAM');

      const tipoHvac = pdfService.determinarTipoInforme('CHILLER_HVAC', 'PREVENTIVO_A');
      expect(tipoHvac).toBe('UNIVERSAL_EAM');
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
      observaciones:
        'El compresor opera de manera suave y silenciosa. Presión de carga y descarga calibradas correctamente.',
      nombreTecnico: 'Carlos Mendoza',
      cargoTecnico: 'Especialista en Sistemas Neumáticos',
      nombreCliente: 'Ing. Fernando Gómez',
      cargoCliente: 'Jefe de Planta',
      firmaTecnico:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      firmaCliente:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
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
      // Sub-sistemas eliminados de cabecera por directiva UX ejecutiva
      expect(html).not.toContain('UNIDAD DE COMPRESIÓN');

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

    it('debe renderizar Chiller HVAC con cabecera premium Mekanos, checklist espaciado y segregación de mediciones', () => {
      const mockChiller: DatosOrdenPDF = {
        numeroOrden: 'OS-202611-0024',
        cliente: 'Empresa Test Refactorizada SAS',
        direccion: 'Calle 100 #45-67',
        sede: 'Sede Principal',
        marcaEquipo: 'TRANE',
        serieEquipo: 'SN-CHILLER-001',
        tipoEquipo: 'AIRE ACONDICIONADO / CHILLER' as any,
        tipoServicio: 'PREVENTIVO_A',
        fecha: '05/11/2026',
        tecnico: 'JUAN GRAU',
        horaEntrada: '05:03',
        horaSalida: '06:05',
        numeroVisitaCaso: 1,
        tipoVisita: 'AISLADA',
        equipoDetalle: {
          codigoEquipo: 'HVAC-TEST-VLGNBH',
          nombreEquipo: 'Chiller Trane 20 TR',
          tipoEquipo: 'AIRE ACONDICIONADO / CHILLER',
          tipoEquipoNombre: 'AIRE ACONDICIONADO / CHILLER',
          marca: 'TRANE',
          modelo: 'CGAM 020',
          serie: 'SN-CHILLER-001',
          ubicacion: 'Azotea Torre A',
          cliente: 'Empresa Test Refactorizada SAS',
        },
        placaUniversal: {
          categoriaCanonica: 'AIRE ACONDICIONADO / CHILLER',
          marca: 'TRANE',
          modelo: 'CGAM 020',
          serie: 'SN-CHILLER-001',
          potenciaPrincipal: '20 TR',
          alimentacionElectrica: '220V · 60 Hz · 3F',
          kpis: [
            {
              clave: 'capacidad_enfriamiento',
              etiqueta: 'Capacidad de Enfriamiento',
              valor: '20 TR',
              destacado: true,
            },
            {
              clave: 'gas_refrigerante',
              etiqueta: 'Gas Refrigerante',
              valor: 'R410A',
              destacado: true,
            },
          ],
          subsistemas: [],
        },
        actividades: [
          {
            sistema: 'Sistema de Enfriamiento',
            descripcion: 'INSPECCIÓN VISUAL DE SERPENTÍN EVAPORADOR Y CONDENSADOR',
            resultado: 'B' as any,
            observaciones: '',
            tipoActividad: 'INSPECCION',
          },
          {
            sistema: 'Sistema de Enfriamiento',
            descripcion: 'LIMPIEZA Y DESINFECCIÓN DE SERPENTINES Y BANDEJA DE CONDENSADOS',
            resultado: 'M' as any,
            observaciones: '',
            tipoActividad: 'LIMPIEZA',
          },
          {
            sistema: 'Sistema de Enfriamiento',
            descripcion: 'VERIFICACIÓN DE PRESIÓN DE SUCCIÓN / BAJA (PSI)',
            resultado: 'B' as any,
            observaciones: '',
            tipoActividad: 'MEDICION',
          },
          {
            sistema: 'Sistema de Enfriamiento',
            descripcion: 'VERIFICACIÓN DE PRESIÓN DE DESCARGA / ALTA (PSI)',
            resultado: 'B' as any,
            observaciones: '',
            tipoActividad: 'MEDICION',
          },
          {
            sistema: 'General',
            descripcion: 'MEDICIÓN DE TEMPERATURA DE ENTRADA Y SALIDA (DELTA T)',
            resultado: 'B' as any,
            observaciones: 'TEMP: 80',
            tipoActividad: 'MEDICION',
            configInputJson: { unidad: '°C' },
          },
        ],
        mediciones: [],
        evidencias: [],
      };

      const html = generarTipoUniversalEamHTML(mockChiller);

      // 1. Cabecera oficial Mekanos Base
      expect(html).toContain('DATOS DEL CLIENTE Y FICHA TÉCNICA DEL ACTIVO');
      expect(html).toContain('TAG: HVAC-TEST-VLGNBH');
      expect(html).toContain('Chiller Trane 20 TR');
      expect(html).toContain('TRANE');
      expect(html).toContain('CGAM 020');
      expect(html).toContain('20 TR');
      expect(html).toContain('R410A');

      // 2. Checklist sólo contiene 2 tareas de inspección/limpieza y NO las mediciones
      expect(html).toContain('PROTOCOLO DE INSPECCIÓN Y ACTIVIDADES PREVENTIVAS (2 TAREAS)');
      expect(html).toContain('INSPECCIÓN VISUAL DE SERPENTÍN EVAPORADOR Y CONDENSADOR');
      expect(html).toContain('LIMPIEZA Y DESINFECCIÓN DE SERPENTINES');

      const checklistIdx = html.indexOf('PROTOCOLO DE INSPECCIÓN Y ACTIVIDADES PREVENTIVAS');
      const medicionesIdx = html.indexOf('PARÁMETROS OPERATIVOS');
      const checklistPart = html.substring(checklistIdx, medicionesIdx);
      expect(checklistPart).not.toContain('VERIFICACIÓN DE PRESIÓN DE SUCCIÓN');
      expect(checklistPart).not.toContain('DELTA T');

      // 3. Parámetros operativos y mediciones
      expect(html).toContain('REGISTRO DE PARÁMETROS OPERATIVOS');
      expect(html).toContain('Presión de Succión');
      expect(html).toContain('Presión de Descarga');
      expect(html).toContain('Temperatura');
      expect(html).toContain('80 °C');
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
        presion_min: 30, // Doosan exige min 30 PSI
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
      expect(configResuelta.presion_min).toBe(30); // Del modelo OEM (la máquina no lo sobreescribió)
    });
  });

  describe('4. Trazabilidad Universal Fase 6.2: 3 Señales (Estado + Input Custom + Nota) y Contador Comparativo', () => {
    it('debe renderizar los 3 inputs en OBSERVACIONES TÉCNICAS con semántica de criticidad sin delimitador |||', () => {
      const mockAscensor: DatosOrdenPDF = {
        numeroOrden: 'OS-202611-0063',
        cliente: 'Empresa Test Refactorizada SAS',
        direccion: 'Calle 100 #45-67',
        marcaEquipo: 'OTIS',
        serieEquipo: 'ELEV-9876',
        tipoEquipo: 'ASCENSOR' as any,
        tipoServicio: 'MANTENIMIENTO PREVENTIVO',
        fecha: '12/11/2026',
        tecnico: 'JUAN GRAU',
        horaEntrada: '20:11',
        horaSalida: '20:17',
        equipoDetalle: {
          codigoEquipo: 'ELEV-TEST-1LUHC7',
          nombreEquipo: 'Ascensor Otis Gen2',
          tipoEquipo: 'ASCENSOR',
          tipoEquipoNombre: 'ASCENSOR DE PASAJEROS',
          marca: 'OTIS',
          modelo: 'GEN2-COMFORT',
          serie: 'ELEV-9876',
          cliente: 'Empresa Test Refactorizada SAS',
          horometroIntervencion: 52000,
          horometroAcumulado: 52000,
          horometroAnterior: 51000,
          horometroTranscurrido: 1000,
          unidadUso: 'CICLOS',
          etiquetaContador: 'Ciclos de Viaje',
          requiereHorometro: true,
        },
        actividades: [
          {
            sistema: 'CABINA, PUERTAS Y OPERADOR',
            descripcion:
              'Inspección de fotocelda, cortina infrarroja y cierre de puertas de cabina',
            resultado: 'C',
            tipoControlInput: 'BOTON_OPCIONES',
            observaciones: 'Bloqueo mecánico en puertas.',
            respuestaJson: {
              valor: 'DESNIVEL_CRITICO_5MM',
              etiqueta: 'Desnivel Crítico (>5mm)',
              semaforo: 'M',
            },
          },
          {
            sistema: 'GENERAL',
            descripcion: 'Registrar lectura actual del contador de viajes del ascensor',
            resultado: 'B',
            tipoControlInput: 'LECTURA_CONTADOR',
            rolSemantico: 'LECTURA_CONTADOR_ACTIVO',
            observaciones: 'Sin novedad en tablero.',
            respuestaJson: {
              valor: 52000,
              etiqueta: 'Ciclos de Viaje',
              unidad: 'ciclos',
              unidadUso: 'CICLOS',
              semaforo: 'B',
            },
          },
          {
            sistema: 'TRACCIÓN',
            descripcion: 'Medición de velocidad real de desplazamiento',
            tipoActividad: 'INSPECCION',
            resultado: 'B',
            tipoControlInput: 'INPUT_NUMERICO',
            respuestaJson: {
              valor: 2.5,
              etiqueta: 'Velocidad',
              unidad: 'm/s',
              semaforo: 'B',
            },
          },
          {
            sistema: 'MOTORIZACIÓN',
            descripcion: 'Consumo eléctrico de motor principal',
            tipoActividad: 'MEDICION',
            resultado: 'R',
            tipoControlInput: 'INPUT_NUMERICO',
            respuestaJson: {
              valor: 18.4,
              unidad: 'A',
              semaforo: 'R',
            },
          },
        ],
        mediciones: [],
        evidencias: [],
        pendientes: [
          {
            descripcion: 'Ajustar nivelación de cabina en piso 4',
            prioridad: 'CRITICA',
            estado: 'PENDIENTE',
            observaciones: 'Pendiente programación con cliente',
          },
        ],
      };

      const html = generarTipoUniversalEamHTML(mockAscensor);

      // Ficha del contador: nuevo valor, anterior y diferencia
      expect(html).toContain('52.000 ciclos');
      expect(html).toContain('Anterior: 51.000 ciclos');
      expect(html).toContain('Dif: +1.000 ciclos');

      // 3 señales de input personalizado: Estado (CORREGIDO) + Píldora roja (Desnivel Crítico) + Nota técnica
      expect(html).toContain('CORREGIDO');
      expect(html).toContain('Desnivel Crítico (&gt;5mm)');
      expect(html).toContain('#FEF2F2');
      expect(html).toContain('#991B1B');
      expect(html).toContain('Nota:');
      expect(html).toContain('Bloqueo mecánico en puertas.');
      expect(html).not.toContain('|||');

      // Contador e input numérico genérico futuro + telemetría con respuestaJson
      expect(html).toContain('Lectura:');
      expect(html).toContain('Sin novedad en tablero.');
      expect(html).toContain('Velocidad: 2.5 m/s');
      expect(html).toContain('18.4 A');

      // Bloque de pendientes protegido contra cortes entre páginas
      expect(html).toContain('class="pendientes-bloque"');
      expect(html).toContain('margin-bottom: 14px');
      expect(html).toContain('break-inside: avoid');
      expect(html).toContain('page-break-inside: avoid');
      expect(html).toContain('class="pendientes-tabla"');
    });

    it('debe soportar métricas de uso 100% personalizadas (MANIOBRAS) y evitar colisiones de etiquetas en Subestación Eléctrica (SUBEST)', () => {
      const mockSubestacion: DatosOrdenPDF = {
        numeroOrden: 'OS-202611-0099',
        cliente: 'Centro Comercial Caribe Plaza S.A.',
        direccion: 'Av. Pedro de Heredia #30-15',
        marcaEquipo: 'SCHNEIDER',
        serieEquipo: 'SUB-MT-2026',
        tipoEquipo: 'SUBEST' as any,
        tipoServicio: 'PREVENTIVO_A',
        fecha: '14/11/2026',
        tecnico: 'JUAN GRAU',
        horaEntrada: '08:00',
        horaSalida: '10:30',
        equipoDetalle: {
          codigoEquipo: 'SUBEST-CARIBE-01',
          nombreEquipo: 'Subestación Transformador Seco 750 kVA',
          tipoEquipo: 'SUBEST',
          tipoEquipoNombre: 'SUBESTACIÓN ELÉCTRICA MT',
          marca: 'SCHNEIDER',
          modelo: 'TRIHAL-750',
          serie: 'SUB-MT-2026',
          cliente: 'Centro Comercial Caribe Plaza S.A.',
          horometroIntervencion: 1500,
          horometroAcumulado: 1500,
          horometroAnterior: 1200,
          horometroTranscurrido: 300,
          unidadUso: 'MANIOBRAS',
          etiquetaContador: 'Maniobras de Conmutación',
          requiereHorometro: true,
        },
        actividades: [
          {
            sistema: 'INTERRUPTOR MT',
            descripcion: 'Registrar contador de maniobras del interruptor de media tensión',
            tipoActividad: 'INSPECCION',
            resultado: 'B',
            tipoControlInput: 'LECTURA_CONTADOR',
            rolSemantico: 'LECTURA_CONTADOR_ACTIVO',
            observaciones: 'MANIOBRAS: 1500|||Sin desgaste en mecanismo de resorte.',
            respuestaJson: {
              valor: 1500,
              etiqueta: 'Maniobras de Conmutación',
              unidad: 'maniobras',
              unidadUso: 'MANIOBRAS',
              semaforo: 'B',
            },
          },
          {
            sistema: 'BORNES Y BARRAJES',
            descripcion: 'Medición de temperatura en bornes de baja tensión (°C)',
            tipoActividad: 'MEDICION',
            resultado: 'B',
            tipoControlInput: 'INPUT_NUMERICO',
            respuestaJson: {
              valor: 46.5,
              semaforo: 'B',
            },
          },
        ],
        mediciones: [],
        evidencias: [],
      };

      const html = generarTipoUniversalEamHTML(mockSubestacion);

      expect(html).toContain('Control por Maniobras de Conmutación');
      expect(html).toContain('Maniobras de Conmutación Intervención');
      expect(html).toContain('Maniobras de Conmutación Acumulado (Hoja de Vida)');
      expect(html).toContain('1.500 maniobras');
      expect(html).toContain('Anterior: 1.200 maniobras');
      expect(html).toContain('Dif: +300 maniobras');
      expect(html).toContain('Sin desgaste en mecanismo de resorte.');
      expect(html).not.toContain('MANIOBRAS: 1500');

      expect(html).toContain('Temperatura en bornes de baja tensión');
      expect(html).toContain('46.5 °C');
      expect(html).not.toContain('Presión de Succión');
    });

    it('debe resolver unidades UoM, rol principal dinámico, combinar tensiones, escapar < y > y soportar modo calendario CAL', () => {
      const equipoMock: any = {
        codigo_equipo: 'EQ-DEMO-01',
        nombre_equipo: 'Transformador Seco 1000 kVA',
        especificaciones: {
          modulos: {
            nucleo: {
              potencia_aparente_custom: 1000,
              grupo_conexion: 'Dyn5',
            },
            celda: {
              tension_primaria_mt: 13.2,
              tension_secundaria_bt: '220/127 VAC',
            },
          },
          unidades: {
            potencia_aparente_custom: 'KVA_APA',
            tension_primaria_mt: 'KV_VOLT',
          },
        },
        tipos_equipo: {
          codigo_tipo: 'ARQ_CUSTOM',
          nombre_tipo: 'Equipo Transformación Genérico',
          unidad_uso: 'CAL',
          etiqueta_contador: 'Control por Calendario',
          requiere_horometro: false,
          tipo_equipo_modulos: [
            {
              modulo: {
                modulo_atributos: [
                  {
                    es_kpi: true,
                    visible_en_pdf: true,
                    atributo: {
                      codigo_atributo: 'potencia_aparente_custom',
                      nombre_atributo: 'Potencia Aparente Nominal',
                      rol_semantico: 'POTENCIA_CAPACIDAD_PRINCIPAL',
                      unidad_defecto_codigo: 'KVA_APA',
                      unidad_defecto: { codigo: 'KVA_APA', simbolo: 'kVA' },
                    },
                  },
                  {
                    es_kpi: true,
                    visible_en_pdf: true,
                    atributo: {
                      codigo_atributo: 'grupo_conexion',
                      nombre_atributo: 'Grupo Vectorial',
                      rol_semantico: 'ESTANDAR',
                    },
                  },
                  {
                    es_kpi: true,
                    visible_en_pdf: true,
                    atributo: {
                      codigo_atributo: 'tension_primaria_mt',
                      nombre_atributo: 'Tensión Primaria Nominal MT',
                      rol_semantico: 'CONFIGURACION',
                      unidad_defecto_codigo: 'KV_VOLT',
                      unidad_defecto: { codigo: 'KV_VOLT', simbolo: 'kV' },
                    },
                  },
                  {
                    es_kpi: true,
                    visible_en_pdf: true,
                    atributo: {
                      codigo_atributo: 'tension_secundaria_bt',
                      nombre_atributo: 'Tensión Secundaria Nominal BT',
                      rol_semantico: 'CONFIGURACION',
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      const placa = EquipoSpecsReader.getPlacaUniversal(equipoMock);
      expect(placa.capacidadPrincipal?.texto).toBe('1000 kVA');

      const mockOrden: DatosOrdenPDF = {
        numeroOrden: 'OS-202611-0123',
        cliente: 'Cliente Demo',
        direccion: 'Zona Industrial',
        marcaEquipo: 'ABB',
        serieEquipo: 'ABB-999',
        tipoEquipo: 'ARQ_CUSTOM' as any,
        tipoServicio: 'PREVENTIVO_A',
        fecha: '14/11/2026',
        tecnico: 'JUAN GRAU',
        horaEntrada: '09:00',
        horaSalida: '10:00',
        equipoDetalle: {
          codigoEquipo: 'EQ-DEMO-01',
          nombreEquipo: 'Transformador Seco 1000 kVA',
          tipoEquipo: 'ARQ_CUSTOM',
          tipoEquipoNombre: 'Equipo Transformación Genérico',
          marca: 'ABB',
          modelo: 'RESIBLOC',
          serie: 'ABB-999',
          cliente: 'Cliente Demo',
          unidadUso: 'CAL',
          requiereHorometro: false,
        },
        actividades: [
          {
            sistema: 'NÚCLEO',
            descripcion: 'Inspección termográfica infrarroja',
            tipoActividad: 'INSPECCION',
            tipoControlInput: 'PERSONALIZADO',
            resultado: 'B',
            respuestaJson: {
              etiqueta: 'Óptimo (ΔT < 5°C y <a) >',
              semaforo: 'B',
            },
          },
          {
            sistema: 'CELDA',
            descripcion:
              'Inspección de temperatura ambiente en celda, voltaje de control auxiliar, frecuencia de ventiladores y presión de contactos',
            tipoControlInput: 'ESCALA_ESTADO',
            resultado: 'R',
          },
        ],
        mediciones: [
          {
            parametro: 'Resistencia de Aislamiento AT vs Tierra',
            valor: 180,
            unidad: 'MΩ',
            rangoMin: 500,
            rangoMax: 5000,
            estado: 'ALERTA',
          },
        ],
        evidencias: [],
      };
      (mockOrden as any).placaUniversal = placa;

      expect(esActividadMedicion(mockOrden.actividades[1])).toBe(false);

      const html = generarTipoUniversalEamHTML(mockOrden);
      expect(html).toContain('1000 kVA');
      expect(html).toContain('13.2 kV / 220/127 VAC');
      expect(html).toContain('Grupo Vectorial: <strong>Dyn5</strong>');
      expect(html).not.toContain('Potencia Aparente Nominal: <strong>1000 kVA</strong>');
      expect(html).not.toContain('Tensión Primaria Nominal MT: <strong>13.2 kV</strong>');
      expect(html).toContain('Control Exclusivo por Calendario');
      expect(html).not.toContain('Horómetro Intervención');
      expect(html).toContain('Óptimo (ΔT &lt; 5°C y &lt;a) &gt;');
      expect(html).toContain(
        'Inspección de temperatura ambiente en celda, voltaje de control auxiliar, frecuencia de ventiladores y presión de contactos',
      );
      expect(html).toContain('180 MΩ');
      expect(html).toContain('500 - 5000 MΩ');
      expect(html).toContain('ALERTA');
    });
  });
});
