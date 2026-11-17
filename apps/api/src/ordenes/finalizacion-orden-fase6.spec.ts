import { OrdenesController } from './ordenes.controller';
import { FinalizacionOrdenService } from './services/finalizacion-orden.service';
import { ProgresoRegistroService } from './services/progreso-registro.service';

describe('Fase 6.2: Preservación de respuestaJson, idActividadCatalogo y Lectura de Contador', () => {
  it('OrdenesController.finalizarCompleto conserva idActividadCatalogo, respuestaJson e idOrdenEquipo al delegar a FinalizacionOrdenService', async () => {
    let capturedDto: any = null;
    const mockFinalizacionService = {
      finalizarOrden: jest.fn(async (dto) => {
        capturedDto = dto;
        return {
          success: true,
          mensaje: 'ok',
          datos: {
            orden: { id: 2140, numero: 'OS-202611-0063', estado: 'COMPLETADA' },
            evidencias: [],
            firmas: [],
            documento: null,
            email: { enviado: false, destinatario: '' },
          },
          tiempoTotal: 10,
        };
      }),
    };

    const controller = new OrdenesController(
      {} as any,
      {} as any,
      {} as any,
      mockFinalizacionService as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await controller.finalizarCompleto(
      '2140',
      {
        evidencias: [{ tipo: 'ANTES' as any, base64: 'AAA=' }],
        firmas: {
          tecnico: { tipo: 'TECNICO' as any, base64: 'BBB=', idPersona: 1 },
        },
        actividades: [
          {
            sistema: 'CABINA',
            descripcion: 'Inspección de fotocelda',
            resultado: 'M',
            observaciones: 'Bloqueo mecánico en puertas.',
            idActividadCatalogo: 240,
            idOrdenEquipo: 77,
            respuestaJson: {
              valor: 'DESNIVEL_CRITICO_5MM',
              etiqueta: 'Desnivel Crítico (>5mm)',
              semaforo: 'M',
            },
          },
          {
            sistema: 'GENERAL',
            descripcion: 'Registrar lectura actual del contador',
            resultado: 'B',
            observaciones: '',
            idActividadCatalogo: 248,
            respuestaJson: {
              valor: 52000,
              etiqueta: 'Ciclos de Viaje',
              unidad: 'ciclos',
              unidadUso: 'CICLOS',
              semaforo: 'B',
            },
          },
        ],
        observaciones: 'Cierre OK',
        horaEntrada: '20:11',
        horaSalida: '20:17',
      },
      1,
      { id: 1, idEmpleado: 1, esAdmin: true },
    );

    expect(mockFinalizacionService.finalizarOrden).toHaveBeenCalledTimes(1);
    expect(capturedDto.actividades[0]).toMatchObject({
      idActividadCatalogo: 240,
      idOrdenEquipo: 77,
      observaciones: 'Bloqueo mecánico en puertas.',
      respuestaJson: {
        valor: 'DESNIVEL_CRITICO_5MM',
        etiqueta: 'Desnivel Crítico (>5mm)',
        semaforo: 'M',
      },
    });
    expect(capturedDto.actividades[1]).toMatchObject({
      idActividadCatalogo: 248,
      respuestaJson: {
        valor: 52000,
        unidad: 'ciclos',
        unidadUso: 'CICLOS',
      },
    });
  });

  it('FinalizacionOrdenService.persistirActividades persiste respuesta_json JSONB y mantiene observaciones limpias sin prefijos artificiales', async () => {
    let insertedRows: any[] = [];
    const mockPrisma = {
      actividades_ejecutadas: {
        count: jest.fn(async () => 0),
        createMany: jest.fn(async ({ data }) => {
          insertedRows = data;
          return { count: data.length };
        }),
      },
      catalogo_actividades: {
        findMany: jest.fn(async () => [
          { id_actividad_catalogo: 240, descripcion_actividad: 'Inspección de fotocelda' },
          {
            id_actividad_catalogo: 248,
            descripcion_actividad: 'Registrar lectura actual del contador',
          },
        ]),
      },
    };

    const service = new FinalizacionOrdenService(
      mockPrisma as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await (service as any).persistirActividades(
      2140,
      [
        {
          sistema: 'CABINA',
          descripcion: 'Inspección de fotocelda',
          resultado: 'C',
          observaciones: 'Bloqueo mecánico en puertas.',
          idActividadCatalogo: 240,
          respuestaJson: {
            valor: 'DESNIVEL_CRITICO_5MM',
            etiqueta: 'Desnivel Crítico (>5mm)',
            semaforo: 'M',
          },
        },
        {
          sistema: 'GENERAL',
          descripcion: 'Registrar lectura actual del contador',
          resultado: 'B',
          observaciones: '',
          idActividadCatalogo: 248,
          respuestaJson: {
            valor: 52000,
            etiqueta: 'Ciclos de Viaje',
            unidad: 'ciclos',
            unidadUso: 'CICLOS',
            semaforo: 'B',
          },
        },
      ],
      10,
    );

    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0].id_actividad_catalogo).toBe(240);
    expect(insertedRows[0].observaciones).toBe('Bloqueo mecánico en puertas.');
    expect(insertedRows[0].respuesta_json).toMatchObject({
      etiqueta: 'Desnivel Crítico (>5mm)',
      semaforo: 'M',
    });

    expect(insertedRows[1].id_actividad_catalogo).toBe(248);
    expect(insertedRows[1].observaciones).toBeNull();
    expect(insertedRows[1].respuesta_json).toMatchObject({
      valor: 52000,
      unidad: 'ciclos',
    });
  });

  it('FinalizacionOrdenService.persistirHorometro calcula horas_transcurridas contra equipos.horas_actuales inicial (490 -> 500) y lectura previa (51000 -> 52000)', async () => {
    const createdLecturas: any[] = [];
    const updatedEquipos: any[] = [];

    // Caso A: Primera orden del activo (490 -> 500, sin fila previa en lecturas_horometro)
    const prismaCasoA = {
      equipos: {
        findUnique: jest.fn(async () => ({
          id_equipo: 99,
          horas_actuales: 490,
          codigo_equipo: 'EQ-X',
          tipos_equipo: {
            unidad_uso: 'UPM',
            etiqueta_contador: 'Unidades',
            requiere_horometro: true,
          },
        })),
        update: jest.fn(async (args) => {
          updatedEquipos.push(args.data);
          return {};
        }),
      },
      lecturas_horometro: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async (args) => {
          createdLecturas.push(args.data);
          return {};
        }),
      },
    };

    const serviceA = new FinalizacionOrdenService(
      prismaCasoA as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await (serviceA as any).persistirHorometro(3001, 99, 500, 1);

    expect(createdLecturas[0].horas_lectura).toBe(500);
    expect(createdLecturas[0].horas_transcurridas).toBe(10);
    expect(updatedEquipos[0].horas_actuales).toBe(500);

    // Caso B: Orden con lectura previa en lecturas_horometro (51000 -> 52000)
    const prismaCasoB = {
      equipos: {
        findUnique: jest.fn(async () => ({
          id_equipo: 484,
          horas_actuales: 51000,
          codigo_equipo: 'ELEV-TEST-1LUHC7',
          tipos_equipo: {
            unidad_uso: 'CICLOS',
            etiqueta_contador: 'Ciclos de Viaje',
            requiere_horometro: true,
          },
        })),
        update: jest.fn(async (args) => {
          updatedEquipos.push(args.data);
          return {};
        }),
      },
      lecturas_horometro: {
        findFirst: jest.fn(async () => ({
          horas_lectura: 51000,
          fecha_lectura: new Date(Date.now() - 86400000),
        })),
        create: jest.fn(async (args) => {
          createdLecturas.push(args.data);
          return {};
        }),
      },
    };

    const serviceB = new FinalizacionOrdenService(
      prismaCasoB as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await (serviceB as any).persistirHorometro(2140, 484, 52000, 1);

    expect(createdLecturas[1].horas_lectura).toBe(52000);
    expect(createdLecturas[1].horas_transcurridas).toBe(1000);
    expect(updatedEquipos[1].horas_actuales).toBe(52000);
  });

  it('ProgresoRegistroService.getProgresoDetallado excluye MEDICION del denominador de acts (4/4 acts y 3/3 meds)', async () => {
    const mockPrisma: any = {
      ordenes_servicio: {
        findUnique: jest.fn(async () => ({
          id_orden_servicio: 2141,
          numero_orden: 'OS-202611-0063',
          id_tipo_servicio: 22,
          id_estado_actual: 4,
          estados_orden: { codigo_estado: 'COMPLETADA', nombre_estado: 'Completada' },
          clientes: { persona: { razon_social: 'Empresa Test' } },
          sedes_cliente: { nombre_sede: 'Sede Principal' },
          equipos: { id_equipo: 484, codigo_equipo: 'ELEV-TEST-1LUHC7', nombre_equipo: 'Ascensor' },
          empleados_ordenes_servicio_id_tecnico_asignadoToempleados: null,
          id_tecnico_asignado: 1,
          id_cliente: 1,
          id_equipo: 484,
          id_firma_tecnico: 10,
          id_firma_cliente: 11,
          metadata_json: {},
          ordenes_actividades_plan: [
            { catalogo_actividades: { tipo_actividad: 'INSPECCION', id_parametro_medicion: null } },
            { catalogo_actividades: { tipo_actividad: 'INSPECCION', id_parametro_medicion: null } },
            { catalogo_actividades: { tipo_actividad: 'INSPECCION', id_parametro_medicion: null } },
            { catalogo_actividades: { tipo_actividad: 'INSPECCION', id_parametro_medicion: null } },
            { catalogo_actividades: { tipo_actividad: 'MEDICION', id_parametro_medicion: 29 } },
            { catalogo_actividades: { tipo_actividad: 'MEDICION', id_parametro_medicion: 30 } },
            { catalogo_actividades: { tipo_actividad: 'MEDICION', id_parametro_medicion: 31 } },
          ],
          actividades_ejecutadas: [
            {
              id_actividad_ejecutada: 1,
              ejecutada: true,
              estado: 'B',
              catalogo_actividades: { tipo_actividad: 'INSPECCION', id_parametro_medicion: null },
            },
            {
              id_actividad_ejecutada: 2,
              ejecutada: true,
              estado: 'B',
              catalogo_actividades: { tipo_actividad: 'INSPECCION', id_parametro_medicion: null },
            },
            {
              id_actividad_ejecutada: 3,
              ejecutada: true,
              estado: 'B',
              catalogo_actividades: { tipo_actividad: 'INSPECCION', id_parametro_medicion: null },
            },
            {
              id_actividad_ejecutada: 4,
              ejecutada: true,
              estado: 'B',
              catalogo_actividades: { tipo_actividad: 'INSPECCION', id_parametro_medicion: null },
            },
          ],
          mediciones_servicio: [{ id_medicion: 1 }, { id_medicion: 2 }, { id_medicion: 3 }],
          evidencias_fotograficas: [{ id_evidencia: 1, tipo_evidencia: 'ANTES' }],
          ordenes_pendientes: [],
        })),
      },
      catalogo_actividades: { count: jest.fn(async () => 99) },
    };

    const progresoService = new ProgresoRegistroService(mockPrisma);
    const res = await progresoService.getProgresoDetallado(2141);

    expect(res.actividades.completadas).toBe(4);
    expect(res.actividades.total).toBe(4);
    expect(res.actividades.porcentaje).toBe(100);
    expect(res.mediciones.registradas).toBe(3);
    expect(res.mediciones.total).toBe(3);
    expect(mockPrisma.catalogo_actividades.count).not.toHaveBeenCalled();
  });

  describe('Gate F2 — Atomicidad de FinalizacionOrdenService ante fallos externos en Fase A', () => {
    const buildFinalizarDto = () => ({
      idOrden: 2140,
      evidencias: [{ tipo: 'ANTES' as any, base64: 'AAA=' }],
      firmas: {
        tecnico: { tipo: 'TECNICO' as any, base64: 'BBB=', idPersona: 10 },
      },
      actividades: [
        {
          sistema: 'GENERAL',
          descripcion: 'Inspección general',
          resultado: 'B' as any,
          observaciones: '',
        },
      ],
      observaciones: 'Cierre OK',
      horaEntrada: '08:00',
      horaSalida: '09:00',
      usuarioId: 1,
      modo: 'COMPLETO' as any,
    });

    const buildMockPrismaAtomic = () => ({
      estados_orden: {
        findFirst: jest.fn().mockResolvedValue({ id_estado: 4, codigo_estado: 'COMPLETADA' }),
      },
      ordenes_servicio: {
        findUnique: jest.fn().mockResolvedValue({
          id_orden_servicio: 2140,
          numero_orden: 'OS-202611-0063',
          id_estado_actual: 2,
          id_tecnico_asignado: 1,
          estados_orden: { codigo_estado: 'EN_PROCESO', nombre_estado: 'En Proceso' },
          edicion_tecnico_habilitada: false,
          clientes: {
            id_persona: 20,
            persona: { razon_social: 'Cliente Test', numero_identificacion: '900111222' },
          },
          sedes_cliente: { nombre_sede: 'Sede Norte', ciudad_sede: 'Bogotá' },
          equipos: {
            id_equipo: 484,
            codigo_equipo: 'EQ-01',
            nombre_equipo: 'Equipo Principal',
            tipos_equipo: { id_tipo_equipo: 25, codigo_tipo: 'ASCENSOR', nombre_tipo: 'Ascensor' },
          },
          tipos_servicio: { id_tipo_servicio: 1, codigo_tipo: 'PREV', nombre_tipo: 'Preventivo' },
          empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
            id_empleado: 1,
            id_persona: 10,
            persona: { primer_nombre: 'Juan', primer_apellido: 'Perez', usuarios: [{ id_usuario: 1 }] },
          },
          ordenes_pendientes: [],
          componentes_usados: [],
          ordenes_equipos: [],
        }),
      },
      catalogo_actividades: { findMany: jest.fn().mockResolvedValue([]) },
      parametros_medicion: { findMany: jest.fn().mockResolvedValue([]) },
      evidencias_fotograficas: { deleteMany: jest.fn() },
      actividades_ejecutadas: { deleteMany: jest.fn() },
      mediciones_servicio: { deleteMany: jest.fn() },
      ordenes_pendientes: { deleteMany: jest.fn() },
      lecturas_horometro: { deleteMany: jest.fn() },
      $transaction: jest.fn(),
    });

    it('NO invoca $transaction ni deleteMany si pdfService.generarPDF falla en Fase A', async () => {
      const mockPrisma = buildMockPrismaAtomic();
      const mockCloudinary = {
        uploadImage: jest.fn().mockResolvedValue({
          success: true,
          url: 'https://cdn.example.com/ev1.jpg',
          publicId: 'ev1',
        }),
      };
      const mockR2 = { uploadPDF: jest.fn() };
      const mockPdf = {
        generarPDF: jest.fn().mockRejectedValue(new Error('Chromium PDF timeout')),
      };
      const mockConfigParams = {
        obtenerTodasLasUnidades: jest.fn().mockResolvedValue({}),
      };
      const mockConfigOrg = {
        getContext: jest.fn().mockResolvedValue({ storage_prefijo_raiz: 'acme-media' }),
      };

      const service = new FinalizacionOrdenService(
        mockPrisma as any,
        mockCloudinary as any,
        mockR2 as any,
        mockPdf as any,
        {} as any,
        mockConfigParams as any,
        mockConfigOrg as any,
      );

      await expect(service.finalizarOrden(buildFinalizarDto() as any)).rejects.toThrow(
        /Chromium PDF timeout/,
      );

      expect(mockCloudinary.uploadImage).toHaveBeenCalledTimes(1);
      expect(mockPdf.generarPDF).toHaveBeenCalledTimes(1);
      expect(mockR2.uploadPDF).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.evidencias_fotograficas.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.actividades_ejecutadas.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.mediciones_servicio.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.ordenes_pendientes.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.lecturas_horometro.deleteMany).not.toHaveBeenCalled();
    });

    it('NO invoca $transaction ni deleteMany si r2Service.uploadPDF falla en Fase A', async () => {
      const mockPrisma = buildMockPrismaAtomic();
      const mockCloudinary = {
        uploadImage: jest.fn().mockResolvedValue({
          success: true,
          url: 'https://cdn.example.com/ev1.jpg',
          publicId: 'ev1',
        }),
      };
      const mockR2 = {
        uploadPDF: jest.fn().mockRejectedValue(new Error('R2 S3 upload failed')),
      };
      const mockPdf = {
        generarPDF: jest.fn().mockResolvedValue({
          buffer: Buffer.from('%PDF-1.4'),
          filename: 'informe.pdf',
          size: 8,
        }),
      };
      const mockConfigParams = {
        obtenerTodasLasUnidades: jest.fn().mockResolvedValue({}),
      };
      const mockConfigOrg = {
        getContext: jest.fn().mockResolvedValue({ storage_prefijo_raiz: 'acme-media' }),
      };

      const service = new FinalizacionOrdenService(
        mockPrisma as any,
        mockCloudinary as any,
        mockR2 as any,
        mockPdf as any,
        {} as any,
        mockConfigParams as any,
        mockConfigOrg as any,
      );

      await expect(service.finalizarOrden(buildFinalizarDto() as any)).rejects.toThrow(
        /R2 S3 upload failed/,
      );

      expect(mockPdf.generarPDF).toHaveBeenCalledTimes(1);
      expect(mockR2.uploadPDF).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.evidencias_fotograficas.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.actividades_ejecutadas.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.mediciones_servicio.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.ordenes_pendientes.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.lecturas_horometro.deleteMany).not.toHaveBeenCalled();
    });
  });
});
