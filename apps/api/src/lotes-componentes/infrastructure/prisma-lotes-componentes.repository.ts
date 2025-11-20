import { PrismaService } from '@mekanos/database';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
    ActualizarLoteData,
    CrearLoteData,
    FiltrosLote,
    ILotesComponentesRepository,
    LoteComponente,
    LotesPaginados,
} from '../interfaces/lotes-componentes.repository.interface';

@Injectable()
export class PrismaLotesComponentesRepository implements ILotesComponentesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(data: CrearLoteData): Promise<LoteComponente> {
    // Validar código único
    const existente = await this.prisma.lotes_componentes.findUnique({
      where: { codigo_lote: data.codigo_lote },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe un lote con código ${data.codigo_lote}`,
      );
    }

    // Validar que el componente existe
    const componente = await this.prisma.catalogo_componentes.findUnique({
      where: { id_componente: data.id_componente },
    });

    if (!componente) {
      throw new NotFoundException(`Componente ${data.id_componente} no encontrado`);
    }

    const lote = await this.prisma.lotes_componentes.create({
      data: {
        codigo_lote: data.codigo_lote,
        id_componente: data.id_componente,
        fecha_fabricacion: data.fecha_fabricacion || null,
        fecha_vencimiento: data.fecha_vencimiento || null,
        cantidad_inicial: new Decimal(data.cantidad_inicial),
        cantidad_actual: new Decimal(data.cantidad_inicial),
        estado_lote: 'DISPONIBLE',
        id_proveedor: data.id_proveedor || null,
        numero_factura_proveedor: data.numero_factura_proveedor || null,
        observaciones: data.observaciones || null,
        fecha_ingreso: new Date(),
        ingresado_por: data.ingresado_por,
      },
    });

    return this.mapToLoteComponente(lote);
  }

  async actualizar(id: number, data: ActualizarLoteData): Promise<LoteComponente> {
    const lote = await this.prisma.lotes_componentes.findUnique({
      where: { id_lote: id },
    });

    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    // Si cambia código, validar que no exista otro
    if (data.codigo_lote && data.codigo_lote !== lote.codigo_lote) {
      const existente = await this.prisma.lotes_componentes.findUnique({
        where: { codigo_lote: data.codigo_lote },
      });

      if (existente) {
        throw new ConflictException(
          `Ya existe un lote con código ${data.codigo_lote}`,
        );
      }
    }

    const loteActualizado = await this.prisma.lotes_componentes.update({
      where: { id_lote: id },
      data: {
        codigo_lote: data.codigo_lote,
        fecha_fabricacion: data.fecha_fabricacion,
        fecha_vencimiento: data.fecha_vencimiento,
        id_proveedor: data.id_proveedor,
        numero_factura_proveedor: data.numero_factura_proveedor,
        observaciones: data.observaciones,
        estado_lote: data.estado_lote as any,
      },
    });

    return this.mapToLoteComponente(loteActualizado);
  }

  async ajustarCantidad(
    id: number,
    nuevaCantidad: number,
    observaciones: string,
  ): Promise<LoteComponente> {
    const lote = await this.prisma.lotes_componentes.findUnique({
      where: { id_lote: id },
    });

    if (!lote) {
      throw new NotFoundException(`Lote ${id} no encontrado`);
    }

    // Determinar nuevo estado según cantidad
    let nuevoEstado: any = lote.estado_lote;
    if (nuevaCantidad === 0) {
      nuevoEstado = 'AGOTADO';
    } else if (nuevaCantidad > 0 && lote.estado_lote === 'AGOTADO') {
      nuevoEstado = 'DISPONIBLE';
    }

    const loteActualizado = await this.prisma.lotes_componentes.update({
      where: { id_lote: id },
      data: {
        cantidad_actual: new Decimal(nuevaCantidad),
        estado_lote: nuevoEstado,
        observaciones: observaciones,
      },
    });

    return this.mapToLoteComponente(loteActualizado);
  }

  async findAll(filtros: FiltrosLote): Promise<LotesPaginados> {
    const { id_componente, estado_lote, id_proveedor, page = 1, limit = 10 } = filtros;

    const where: any = {};

    if (id_componente) {
      where.id_componente = id_componente;
    }

    if (estado_lote) {
      where.estado_lote = estado_lote;
    }

    if (id_proveedor) {
      where.id_proveedor = id_proveedor;
    }

    const [data, total] = await Promise.all([
      this.prisma.lotes_componentes.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fecha_ingreso: 'desc' },
        include: {
          catalogo_componentes: {
            select: {
              codigo_interno: true,
              descripcion_corta: true,
            },
          },
        },
      }),
      this.prisma.lotes_componentes.count({ where }),
    ]);

    return {
      data: data.map((l) => this.mapToLoteComponente(l)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: number): Promise<LoteComponente | null> {
    const lote = await this.prisma.lotes_componentes.findUnique({
      where: { id_lote: id },
    });

    return lote ? this.mapToLoteComponente(lote) : null;
  }

  async findByComponente(idComponente: number): Promise<LoteComponente[]> {
    const lotes = await this.prisma.lotes_componentes.findMany({
      where: {
        id_componente: idComponente,
        estado_lote: { not: 'AGOTADO' },
      },
      orderBy: { fecha_vencimiento: 'asc' },
    });

    return lotes.map((l) => this.mapToLoteComponente(l));
  }

  async findProximosAVencer(diasAnticipacion = 30): Promise<LoteComponente[]> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

    const lotes = await this.prisma.lotes_componentes.findMany({
      where: {
        fecha_vencimiento: {
          lte: fechaLimite,
          gte: new Date(),
        },
        estado_lote: { not: 'AGOTADO' },
      },
      orderBy: { fecha_vencimiento: 'asc' },
      include: {
        catalogo_componentes: {
          select: {
            codigo_interno: true,
            descripcion_corta: true,
          },
        },
      },
    });

    return lotes.map((l) => this.mapToLoteComponente(l));
  }

  private mapToLoteComponente(lote: any): LoteComponente {
    return {
      id_lote: lote.id_lote,
      codigo_lote: lote.codigo_lote,
      id_componente: lote.id_componente,
      fecha_fabricacion: lote.fecha_fabricacion,
      fecha_vencimiento: lote.fecha_vencimiento,
      cantidad_inicial: Number(lote.cantidad_inicial),
      cantidad_actual: Number(lote.cantidad_actual),
      estado_lote: lote.estado_lote,
      id_proveedor: lote.id_proveedor,
      numero_factura_proveedor: lote.numero_factura_proveedor,
      observaciones: lote.observaciones,
      fecha_ingreso: lote.fecha_ingreso,
      ingresado_por: lote.ingresado_por,
    };
  }
}
