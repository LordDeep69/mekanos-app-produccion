import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TiposOfertaCotizacionService } from './tipos-oferta-cotizacion.service';

describe('TiposOfertaCotizacionService (Catálogo Unificado CPQ)', () => {
  const createMockDeps = () => {
    const prisma: any = {
      tipos_oferta_cotizacion: {
        count: jest.fn().mockResolvedValue(8),
        createMany: jest.fn().mockResolvedValue({ count: 8 }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      plantillas_cotizacion: {
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      cotizaciones: {
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const service = new TiposOfertaCotizacionService(prisma);
    return { service, prisma };
  };

  it('normaliza códigos sin tildes y preserva etiquetas legibles humanas', () => {
    const { service } = createMockDeps();

    expect(service.normalizeCodigo('Overhaul Turbo Especial')).toBe('OVERHAUL_TURBO_ESPECIAL');
    expect(service.normalizeCodigo('Diagnóstico Eléctrico & Térmico')).toBe(
      'DIAGNOSTICO_ELECTRICO_TERMICO',
    );
    expect(service.formatReadableNombre('Diagnóstico Eléctrico & Térmico')).toBe(
      'Diagnóstico Eléctrico & Térmico',
    );
    expect(service.formatReadableNombre('OVERHAUL_TURBO_ESPECIAL')).toBe('Overhaul Turbo Especial');
  });

  it('lista tipos activos con conteo real de uso y auto-descubre códigos históricos huérfanos', async () => {
    const { service, prisma } = createMockDeps();

    prisma.tipos_oferta_cotizacion.findMany.mockResolvedValue([
      {
        codigo: 'SERVICIO_TECNICO',
        nombre: 'Servicio Técnico',
        descripcion: 'Mano de obra',
        badge: 'SRV',
        es_sistema: true,
        orden: 1,
      },
    ]);
    prisma.plantillas_cotizacion.groupBy.mockResolvedValue([
      { tipo_cotizacion: 'SERVICIO_TECNICO', _count: { _all: 2 } },
      { tipo_cotizacion: 'BANCO_CARGA_ESPECIAL', _count: { _all: 1 } },
    ]);
    prisma.cotizaciones.groupBy.mockResolvedValue([
      { tipo_cotizacion: 'SERVICIO_TECNICO', _count: { _all: 5 } },
    ]);

    const items = await service.listar();

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      codigo: 'SERVICIO_TECNICO',
      nombre: 'Servicio Técnico',
      uso_plantillas: 2,
      uso_cotizaciones: 5,
      uso_total: 7,
      es_sistema: true,
    });
    expect(items[1]).toMatchObject({
      codigo: 'BANCO_CARGA_ESPECIAL',
      nombre: 'Banco Carga Especial',
      uso_plantillas: 1,
      uso_cotizaciones: 0,
      uso_total: 1,
      es_sistema: false,
    });
  });

  it('crea tipo personalizado y rechaza duplicados activos con 409 ConflictException', async () => {
    const { service, prisma } = createMockDeps();

    prisma.tipos_oferta_cotizacion.findUnique.mockResolvedValueOnce(null);
    prisma.tipos_oferta_cotizacion.create.mockResolvedValueOnce({
      codigo: 'OVERHAUL_TURBO_ESPECIAL',
      nombre: 'Overhaul Turbo Especial',
      descripcion: 'Reparación mayor de turbos',
      badge: 'OTE',
      es_sistema: false,
      orden: 100,
    });

    const created = await service.crear({
      nombre: 'Overhaul Turbo Especial',
      descripcion: 'Reparación mayor de turbos',
    });

    expect(created.codigo).toBe('OVERHAUL_TURBO_ESPECIAL');
    expect(created.nombre).toBe('Overhaul Turbo Especial');
    expect(created.es_sistema).toBe(false);

    prisma.tipos_oferta_cotizacion.findUnique.mockResolvedValueOnce({
      codigo: 'OVERHAUL_TURBO_ESPECIAL',
      nombre: 'Overhaul Turbo Especial',
      activo: true,
    });

    await expect(service.crear({ nombre: 'Overhaul Turbo Especial' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('permite renombrar etiqueta legible manteniendo el código fijo', async () => {
    const { service, prisma } = createMockDeps();

    prisma.tipos_oferta_cotizacion.findUnique.mockResolvedValueOnce({
      codigo: 'OVERHAUL_TURBO_ESPECIAL',
      nombre: 'Overhaul Turbo Especial',
      descripcion: null,
      badge: 'OTE',
      es_sistema: false,
      orden: 100,
    });
    prisma.tipos_oferta_cotizacion.update.mockResolvedValueOnce({
      codigo: 'OVERHAUL_TURBO_ESPECIAL',
      nombre: 'Overhaul Mayor de Turbos',
      descripcion: 'Incluye calibración y banco',
      badge: 'OTE',
      es_sistema: false,
      orden: 100,
    });

    const updated = await service.actualizar('overhaul_turbo_especial', {
      nombre: 'Overhaul Mayor de Turbos',
      descripcion: 'Incluye calibración y banco',
    });

    expect(updated.codigo).toBe('OVERHAUL_TURBO_ESPECIAL');
    expect(updated.nombre).toBe('Overhaul Mayor de Turbos');
    expect(updated.descripcion).toBe('Incluye calibración y banco');
  });

  it('bloquea eliminación de tipos del sistema o tipos en uso, y elimina tipos personalizados sin uso', async () => {
    const { service, prisma } = createMockDeps();

    // 1. No existe -> 404
    prisma.tipos_oferta_cotizacion.findUnique.mockResolvedValueOnce(null);
    await expect(service.eliminar('INEXISTENTE')).rejects.toThrow(NotFoundException);

    // 2. Tipo base del sistema -> 400
    prisma.tipos_oferta_cotizacion.findUnique.mockResolvedValueOnce({
      codigo: 'SERVICIO_TECNICO',
      nombre: 'Servicio Técnico',
      es_sistema: true,
    });
    await expect(service.eliminar('SERVICIO_TECNICO')).rejects.toThrow(BadRequestException);

    // 3. Tipo personalizado en uso -> 400
    prisma.tipos_oferta_cotizacion.findUnique.mockResolvedValueOnce({
      codigo: 'OVERHAUL_TURBO_ESPECIAL',
      nombre: 'Overhaul Turbo Especial',
      es_sistema: false,
    });
    prisma.plantillas_cotizacion.count.mockResolvedValueOnce(1);
    prisma.cotizaciones.count.mockResolvedValueOnce(2);
    await expect(service.eliminar('OVERHAUL_TURBO_ESPECIAL')).rejects.toThrow(BadRequestException);

    // 4. Tipo personalizado sin uso -> elimina OK
    prisma.tipos_oferta_cotizacion.findUnique.mockResolvedValueOnce({
      codigo: 'TIPO_TEMPORAL',
      nombre: 'Tipo Temporal',
      es_sistema: false,
    });
    prisma.plantillas_cotizacion.count.mockResolvedValueOnce(0);
    prisma.cotizaciones.count.mockResolvedValueOnce(0);
    prisma.tipos_oferta_cotizacion.delete.mockResolvedValueOnce({ codigo: 'TIPO_TEMPORAL' });

    const deleted = await service.eliminar('TIPO_TEMPORAL');
    expect(deleted.message).toContain('Tipo Temporal');
    expect(prisma.tipos_oferta_cotizacion.delete).toHaveBeenCalledWith({
      where: { codigo: 'TIPO_TEMPORAL' },
    });
  });
});
