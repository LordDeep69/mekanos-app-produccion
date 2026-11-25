jest.mock('../email/email.service', () => ({
  EmailService: jest.fn(),
}));

import { BitacorasService } from './bitacoras.service';

describe('BitacorasService', () => {
  const createMocks = () => {
    const prisma: any = {
      clientes: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      bitacoras: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      bitacoras_informes: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      informes: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      historial_emails_enviados: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const emailService: any = {
      sendEmail: jest.fn(),
      sendEmailFromAccount: jest.fn(),
    };

    const service = new BitacorasService(prisma, emailService);
    return { service, prisma, emailService };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('previewInformesPorSede', () => {
    it('soporta filtros multi-selección CSV y devuelve trazabilidad proactiva de envíos previos', async () => {
      const { service, prisma } = createMocks();

      prisma.clientes.findUnique.mockResolvedValue({
        id_cliente: 50,
        es_cliente_principal: true,
        emails_notificacion: 'principal@cliente.com',
        id_cuenta_email_remitente: 2,
        persona: {
          nombre_comercial: 'COMFENALCO',
          razon_social: 'COMFENALCO',
          email_principal: 'contacto@cliente.com',
        },
        sedes: [],
      });

      prisma.clientes.findMany.mockResolvedValue([
        {
          id_cliente: 50,
          emails_notificacion: 'principal@cliente.com',
          persona: { email_principal: 'contacto@cliente.com' },
        },
      ]);

      prisma.$queryRaw.mockResolvedValue([
        {
          id_documento: 101,
          numero_documento: 'INF-101',
          ruta_archivo: 'https://cdn.example.com/101.pdf',
          fecha_generacion: new Date('2026-11-10T10:00:00Z'),
          id_orden_servicio: 5001,
          numero_orden: 'OS-202611-0001',
          fecha_programada: new Date('2026-11-10T00:00:00Z'),
          fecha_fin_real: new Date('2026-11-10T12:00:00Z'),
          id_cliente: 50,
          cliente_nombre_sede: 'SEDE CENTRO',
          cliente_es_principal: true,
          cliente_emails_notificacion: 'principal@cliente.com',
          persona_nombre_comercial: 'COMFENALCO',
          persona_razon_social: 'COMFENALCO',
          persona_ciudad: 'Cartagena',
          persona_email: 'contacto@cliente.com',
          nombre_equipo: 'PLANTA 100KVA',
          numero_serie: 'SN-101',
          tipo_equipo: 'GENERADOR',
          categoria_equipo: 'ENERGIA',
          tipo_servicio: 'Preventivo Tipo A - Generador',
          codigo_tipo_servicio: 'GEN_PREV_A',
        },
        {
          id_documento: 102,
          numero_documento: 'INF-102',
          ruta_archivo: 'https://cdn.example.com/102.pdf',
          fecha_generacion: new Date('2026-11-11T10:00:00Z'),
          id_orden_servicio: 5002,
          numero_orden: 'OS-202611-0002',
          fecha_programada: new Date('2026-11-11T00:00:00Z'),
          fecha_fin_real: new Date('2026-11-11T12:00:00Z'),
          id_cliente: 50,
          cliente_nombre_sede: 'SEDE CENTRO',
          cliente_es_principal: true,
          cliente_emails_notificacion: 'principal@cliente.com',
          persona_nombre_comercial: 'COMFENALCO',
          persona_razon_social: 'COMFENALCO',
          persona_ciudad: 'Cartagena',
          persona_email: 'contacto@cliente.com',
          nombre_equipo: 'BOMBA HIDROFLOW',
          numero_serie: 'SN-102',
          tipo_equipo: 'BOMBA',
          categoria_equipo: 'HIDRAULICA',
          tipo_servicio: 'Preventivo Tipo A - Bomba',
          codigo_tipo_servicio: 'BOM_PREV_A',
        },
      ]);

      // OS-5001 ya fue enviada en una orden y también en una bitácora previa; OS-5002 nunca fue enviada
      prisma.historial_emails_enviados.findMany.mockResolvedValue([
        {
          id_orden_servicio: 5001,
          fecha_envio: new Date('2026-11-12T15:00:00Z'),
          origen_envio: 'ORDEN_MANUAL',
        },
      ]);

      prisma.bitacoras_informes.findMany.mockResolvedValue([
        {
          informes: {
            id_orden_servicio: 5001,
            id_documento_pdf: 101,
          },
          bitacoras: {
            id_bitacora: 90,
            numero_bitacora: 'BIT-2026-11-CLI50',
            fecha_envio: new Date('2026-11-13T09:00:00Z'),
            mes: 11,
            anio: 2026,
          },
        },
      ]);

      const result = await service.previewInformesPorSede(
        50,
        11,
        2026,
        'ENERGIA,HIDRAULICA',
        undefined,
        undefined,
        'GEN_PREV_A,BOM_PREV_A',
      );

      expect(result.categorias_filtro).toEqual(['ENERGIA', 'HIDRAULICA']);
      expect(result.tipos_servicio_filtro).toEqual(['GEN_PREV_A', 'BOM_PREV_A']);
      expect(result.total_informes).toBe(2);
      expect(result.total_ya_enviados).toBe(1);
      expect(result.total_pendientes_envio).toBe(1);

      const informes = result.sedes[0].informes;
      const inf1 = informes.find((i) => i.id_documento === 101)!;
      const inf2 = informes.find((i) => i.id_documento === 102)!;

      expect(inf1.ya_enviado).toBe(true);
      expect(inf1.ya_enviado_en_bitacora).toBe(true);
      expect(inf1.ya_enviado_en_orden).toBe(true);
      expect(inf1.total_emails_enviados).toBe(1);
      expect(inf1.bitacoras_previas).toHaveLength(1);
      expect(inf1.bitacoras_previas[0].numero_bitacora).toBe('BIT-2026-11-CLI50');

      expect(inf2.ya_enviado).toBe(false);
      expect(inf2.ya_enviado_en_bitacora).toBe(false);
      expect(inf2.ya_enviado_en_orden).toBe(false);
      expect(inf2.total_emails_enviados).toBe(0);
      expect(inf2.bitacoras_previas).toEqual([]);
    });
  });

  describe('crearYEnviarBitacora', () => {
    it('registra bitacoras_informes (reutilizando y creando informes faltantes), sincroniza historial_emails_enviados y respeta correos editados', async () => {
      const { service, prisma, emailService } = createMocks();

      prisma.clientes.findUnique.mockResolvedValue({
        id_cliente: 50,
        es_cliente_principal: true,
        emails_notificacion: 'viejo@cliente.com',
        id_cuenta_email_remitente: 2,
        persona: {
          nombre_comercial: 'COMFENALCO',
          razon_social: 'COMFENALCO',
          email_principal: 'original@cliente.com',
        },
      });

      prisma.$queryRaw.mockResolvedValue([
        {
          id_documento: 201,
          numero_documento: 'INF-201',
          ruta_archivo: 'https://cdn.example.com/201.pdf',
          id_orden_servicio: 7001,
          numero_orden: 'OS-202611-0101',
          nombre_equipo: 'PLANTA 1',
          tipo_servicio: 'Preventivo Tipo A - Generador',
          cliente_nombre_sede: 'SEDE NORTE',
        },
        {
          id_documento: 202,
          numero_documento: 'INF-202',
          ruta_archivo: 'https://cdn.example.com/202.pdf',
          id_orden_servicio: 7002,
          numero_orden: 'OS-202611-0102',
          nombre_equipo: 'BOMBA 1',
          tipo_servicio: 'Preventivo Tipo A - Bomba',
          cliente_nombre_sede: 'SEDE SUR',
        },
      ]);

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer,
      } as any);

      emailService.sendEmailFromAccount.mockResolvedValue({
        success: true,
        messageId: 'msg-bitacora-001',
      });

      // Ya existe 1 bitácora previa en el periodo -> genera sufijo -2
      prisma.bitacoras.count.mockResolvedValue(1);

      prisma.bitacoras.create.mockResolvedValue({
        id_bitacora: 55,
        numero_bitacora: 'BIT-202611-50-2',
      });

      // Para doc 201 existe informe previo (id 801); para doc 202 NO existe y debe auto-crearse (id 802)
      prisma.informes.findMany.mockResolvedValue([
        { id_informe: 801, id_orden_servicio: 7001, id_documento_pdf: 201 },
      ]);
      prisma.informes.create.mockResolvedValue({ id_informe: 802 });
      prisma.bitacoras_informes.create.mockResolvedValue({});
      prisma.historial_emails_enviados.create.mockResolvedValue({});

      const result = await service.crearYEnviarBitacora({
        id_cliente_principal: 50,
        mes: 11,
        anio: 2026,
        categoria: 'ENERGIA,HIDRAULICA',
        documentos_ids: [201, 202],
        email_destino: 'nuevo1@cliente.com, nuevo2@cliente.com',
        usuario_id: 7,
      });

      expect(result.success).toBe(true);
      expect(result.id_bitacora).toBe(55);
      expect(result.informes_enviados).toBe(2);
      expect(prisma.bitacoras.create.mock.calls[0][0].data.numero_bitacora).toBe(
        'BIT-202611-50-2',
      );

      // Debe respetar los correos editados (sin re-agregar viejo@cliente.com)
      expect(emailService.sendEmailFromAccount).toHaveBeenCalledTimes(1);
      expect(emailService.sendEmailFromAccount.mock.calls[0][0]).toMatchObject({
        to: 'nuevo1@cliente.com',
        cc: ['nuevo2@cliente.com'],
      });
      expect(emailService.sendEmailFromAccount.mock.calls[0][1]).toBe(2);

      // Debe auto-crear informe para doc 202 y guardar ambos en bitacoras_informes
      expect(prisma.informes.create).toHaveBeenCalledTimes(1);
      expect(prisma.bitacoras_informes.create).toHaveBeenCalledTimes(2);
      expect(prisma.bitacoras_informes.create).toHaveBeenNthCalledWith(1, {
        data: { id_bitacora: 55, id_informe: 801, orden_bitacora: 1 },
      });
      expect(prisma.bitacoras_informes.create).toHaveBeenNthCalledWith(2, {
        data: { id_bitacora: 55, id_informe: 802, orden_bitacora: 2 },
      });

      // Debe marcar como ENVIADO ambas órdenes en historial_emails_enviados con origen BITACORA
      expect(prisma.historial_emails_enviados.create).toHaveBeenCalledTimes(2);
      expect(prisma.historial_emails_enviados.create.mock.calls[0][0].data).toMatchObject({
        id_orden_servicio: 7001,
        origen_envio: 'BITACORA',
        estado_envio: 'EXITOSO',
        destinatario_to: 'nuevo1@cliente.com',
        destinatarios_cc: 'nuevo2@cliente.com',
      });
      expect(prisma.historial_emails_enviados.create.mock.calls[1][0].data).toMatchObject({
        id_orden_servicio: 7002,
        origen_envio: 'BITACORA',
        estado_envio: 'EXITOSO',
      });
    });
  });

  describe('historialPorCliente', () => {
    it('devuelve los informes enviados vinculados a cada bitácora', async () => {
      const { service, prisma } = createMocks();

      prisma.bitacoras.findMany.mockResolvedValue([
        {
          id_bitacora: 55,
          numero_bitacora: 'BIT-2026-11-CLI50-2',
          anio: 2026,
          mes: 11,
          estado_bitacora: 'ENVIADA',
          cantidad_informes: 1,
          fecha_generacion: new Date('2026-11-25T10:00:00Z'),
          fecha_envio: new Date('2026-11-25T10:00:00Z'),
          observaciones: 'Categoría: Plantas Eléctricas, Bombas | Destinatarios: a@b.com | Informes: 1',
          bitacoras_informes: [
            {
              orden_bitacora: 1,
              informes: {
                id_informe: 801,
                id_orden_servicio: 7001,
                id_documento_pdf: 201,
                documentos_generados: {
                  id_documento: 201,
                  ruta_archivo: 'https://cdn.example.com/201.pdf',
                },
                ordenes_servicio: {
                  id_orden_servicio: 7001,
                  numero_orden: 'OS-202611-0101',
                  fecha_fin_real: new Date('2026-11-10T12:00:00Z'),
                  fecha_programada: new Date('2026-11-10T00:00:00Z'),
                  equipos: { nombre_equipo: 'PLANTA 1', codigo_equipo: 'GEN-01' },
                  tipos_servicio: { nombre_tipo: 'Preventivo Tipo A - Generador' },
                  clientes: { nombre_sede: 'SEDE NORTE' },
                },
              },
            },
          ],
          _count: { bitacoras_informes: 1 },
        },
      ]);

      const historial = await service.historialPorCliente(50);

      expect(historial).toHaveLength(1);
      expect(historial[0].cantidad_informes).toBe(1);
      expect(historial[0].informes_enviados).toHaveLength(1);
      expect(historial[0].informes_enviados[0]).toMatchObject({
        id_informe: 801,
        id_documento: 201,
        id_orden_servicio: 7001,
        numero_orden: 'OS-202611-0101',
        equipo_nombre: 'PLANTA 1',
        nombre_sede: 'SEDE NORTE',
        pdf_url: 'https://cdn.example.com/201.pdf',
        orden_bitacora: 1,
      });
    });
  });
});
