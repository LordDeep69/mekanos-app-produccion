import { PrismaService } from '@mekanos/database';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateTipoOfertaCotizacionDto,
  UpdateTipoOfertaCotizacionDto,
} from './tipos-oferta-cotizacion.dto';

export interface TipoOfertaCatalogoItem {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  badge: string;
  es_sistema: boolean;
  orden: number;
  uso_plantillas: number;
  uso_cotizaciones: number;
  uso_total: number;
}

const DEFAULT_SYSTEM_TYPES: Array<{
  codigo: string;
  nombre: string;
  descripcion: string;
  badge: string;
  orden: number;
}> = [
  {
    codigo: 'SERVICIO_TECNICO',
    nombre: 'Servicio Técnico',
    descripcion: 'Mano de obra, visitas y soporte especializado',
    badge: 'SRV',
    orden: 1,
  },
  {
    codigo: 'SUMINISTRO_INSTALACION',
    nombre: 'Suministro e Instalación',
    descripcion: 'Equipos, baterías o repuestos con montaje incluido',
    badge: 'S+I',
    orden: 2,
  },
  {
    codigo: 'SUMINISTRO',
    nombre: 'Suministro de Repuestos',
    descripcion: 'Venta directa de repuestos, consumibles e insumos',
    badge: 'SUM',
    orden: 3,
  },
  {
    codigo: 'PREVENTIVO',
    nombre: 'Mantenimiento Preventivo',
    descripcion: 'Rutinas programadas por horas o calendario',
    badge: 'PM',
    orden: 4,
  },
  {
    codigo: 'CORRECTIVO',
    nombre: 'Mantenimiento Correctivo',
    descripcion: 'Reparación de fallas y hallazgos técnicos',
    badge: 'CM',
    orden: 5,
  },
  {
    codigo: 'PROYECTO',
    nombre: 'Proyecto / Ingeniería',
    descripcion: 'Obra, adecuaciones, overhaul mayor o AIU',
    badge: 'PRY',
    orden: 6,
  },
  {
    codigo: 'CONTRATO',
    nombre: 'Propuesta Contractual',
    descripcion: 'Póliza anual o plan recurrente de mantenimiento',
    badge: 'CNT',
    orden: 7,
  },
  {
    codigo: 'DIAGNOSTICO',
    nombre: 'Diagnóstico Técnico',
    descripcion: 'Inspección, pruebas de carga o peritaje',
    badge: 'DGN',
    orden: 8,
  },
];

@Injectable()
export class TiposOfertaCotizacionService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeCodigo(raw: string): string {
    return raw
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
  }

  formatReadableNombre(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    // Si el usuario escribió un código SNAKE_CASE en mayúsculas (ej. OVERHAUL_TURBO_ESPECIAL),
    // convertirlo a etiqueta legible "Overhaul Turbo Especial"
    if (/^[A-Z0-9_]+$/.test(trimmed) && (trimmed.includes('_') || trimmed.length > 4)) {
      return trimmed
        .split('_')
        .filter(Boolean)
        .map((w) => w[0] + w.slice(1).toLowerCase())
        .join(' ');
    }
    return trimmed;
  }

  buildBadge(nombreOrCode: string, explicitBadge?: string | null): string {
    if (explicitBadge && explicitBadge.trim()) {
      return explicitBadge
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9+]+/g, '')
        .slice(0, 6);
    }
    const tokens = this.normalizeCodigo(nombreOrCode)
      .split('_')
      .filter((t) => t.length > 0);
    if (tokens.length === 0) return 'OTR';
    if (tokens.length === 1) return tokens[0].slice(0, 3);
    return tokens
      .slice(0, 3)
      .map((t) => t[0])
      .join('')
      .slice(0, 4);
  }

  private async ensureSeeded(): Promise<void> {
    const existingCount = await this.prisma.tipos_oferta_cotizacion.count();
    if (existingCount > 0) return;
    await this.prisma.tipos_oferta_cotizacion.createMany({
      data: DEFAULT_SYSTEM_TYPES.map((t) => ({
        codigo: t.codigo,
        nombre: t.nombre,
        descripcion: t.descripcion,
        badge: t.badge,
        es_sistema: true,
        activo: true,
        orden: t.orden,
      })),
      skipDuplicates: true,
    });
  }

  async listar(): Promise<TipoOfertaCatalogoItem[]> {
    await this.ensureSeeded();

    const [catalogoRows, plantillasUsage, cotizacionesUsage] = await Promise.all([
      this.prisma.tipos_oferta_cotizacion.findMany({
        where: { activo: true },
        orderBy: [{ orden: 'asc' }, { es_sistema: 'desc' }, { nombre: 'asc' }],
      }),
      this.prisma.plantillas_cotizacion.groupBy({
        by: ['tipo_cotizacion'],
        where: { activo: true },
        _count: { _all: true },
      }),
      this.prisma.cotizaciones.groupBy({
        by: ['tipo_cotizacion'],
        _count: { _all: true },
      }),
    ]);

    const plantillasMap = new Map<string, number>();
    for (const r of plantillasUsage) {
      if (r.tipo_cotizacion) plantillasMap.set(r.tipo_cotizacion, r._count._all);
    }

    const cotizacionesMap = new Map<string, number>();
    for (const r of cotizacionesUsage) {
      if (r.tipo_cotizacion) cotizacionesMap.set(r.tipo_cotizacion, r._count._all);
    }

    const seen = new Set<string>();
    const result: TipoOfertaCatalogoItem[] = catalogoRows.map((row) => {
      seen.add(row.codigo);
      const usoPlantillas = plantillasMap.get(row.codigo) || 0;
      const usoCotizaciones = cotizacionesMap.get(row.codigo) || 0;
      return {
        codigo: row.codigo,
        nombre: row.nombre,
        descripcion: row.descripcion ?? null,
        badge: row.badge || this.buildBadge(row.codigo),
        es_sistema: row.es_sistema,
        orden: row.orden,
        uso_plantillas: usoPlantillas,
        uso_cotizaciones: usoCotizaciones,
        uso_total: usoPlantillas + usoCotizaciones,
      };
    });

    // Auto-descubrir códigos históricos presentes en plantillas o COT aún no registrados en el catálogo
    const orphanCodes = new Set<string>([
      ...Array.from(plantillasMap.keys()),
      ...Array.from(cotizacionesMap.keys()),
    ]);
    for (const rawCode of orphanCodes) {
      if (!rawCode || seen.has(rawCode)) continue;
      seen.add(rawCode);
      const usoPlantillas = plantillasMap.get(rawCode) || 0;
      const usoCotizaciones = cotizacionesMap.get(rawCode) || 0;
      result.push({
        codigo: rawCode,
        nombre: this.formatReadableNombre(rawCode),
        descripcion: 'Tipo personalizado detectado en ofertas existentes',
        badge: this.buildBadge(rawCode),
        es_sistema: false,
        orden: 200,
        uso_plantillas: usoPlantillas,
        uso_cotizaciones: usoCotizaciones,
        uso_total: usoPlantillas + usoCotizaciones,
      });
    }

    return result;
  }

  async crear(dto: CreateTipoOfertaCotizacionDto): Promise<TipoOfertaCatalogoItem> {
    await this.ensureSeeded();

    const nombreLegible = this.formatReadableNombre(dto.nombre);
    const codigo = this.normalizeCodigo(dto.codigo?.trim() || dto.nombre);
    if (!codigo || !nombreLegible) {
      throw new BadRequestException('Debes ingresar un nombre válido para el tipo de oferta');
    }

    const existente = await this.prisma.tipos_oferta_cotizacion.findUnique({
      where: { codigo },
    });

    if (existente && existente.activo) {
      throw new ConflictException(
        `Ya existe el tipo de oferta "${existente.nombre}" con código ${codigo}`,
      );
    }

    const badge = this.buildBadge(nombreLegible, dto.badge);
    const descripcion = dto.descripcion?.trim() || null;

    const guardado = existente
      ? await this.prisma.tipos_oferta_cotizacion.update({
          where: { codigo },
          data: {
            nombre: nombreLegible,
            descripcion,
            badge,
            activo: true,
            fecha_modificacion: new Date(),
          },
        })
      : await this.prisma.tipos_oferta_cotizacion.create({
          data: {
            codigo,
            nombre: nombreLegible,
            descripcion,
            badge,
            es_sistema: false,
            activo: true,
            orden: 100,
          },
        });

    const [usoPlantillas, usoCotizaciones] = await Promise.all([
      this.prisma.plantillas_cotizacion.count({
        where: { tipo_cotizacion: codigo, activo: true },
      }),
      this.prisma.cotizaciones.count({ where: { tipo_cotizacion: codigo } }),
    ]);

    return {
      codigo: guardado.codigo,
      nombre: guardado.nombre,
      descripcion: guardado.descripcion ?? null,
      badge: guardado.badge || badge,
      es_sistema: guardado.es_sistema,
      orden: guardado.orden,
      uso_plantillas: usoPlantillas,
      uso_cotizaciones: usoCotizaciones,
      uso_total: usoPlantillas + usoCotizaciones,
    };
  }

  async actualizar(
    rawCodigo: string,
    dto: UpdateTipoOfertaCotizacionDto,
  ): Promise<TipoOfertaCatalogoItem> {
    const codigo = this.normalizeCodigo(rawCodigo);
    const existente = await this.prisma.tipos_oferta_cotizacion.findUnique({
      where: { codigo },
    });

    const nombreNext = dto.nombre?.trim()
      ? this.formatReadableNombre(dto.nombre)
      : existente?.nombre || this.formatReadableNombre(codigo);

    if (!nombreNext) {
      throw new BadRequestException('El nombre del tipo de oferta no puede quedar vacío');
    }

    const descripcionNext =
      dto.descripcion !== undefined
        ? dto.descripcion?.trim() || null
        : (existente?.descripcion ?? null);

    const badgeNext =
      dto.badge !== undefined
        ? this.buildBadge(nombreNext, dto.badge)
        : existente?.badge || this.buildBadge(nombreNext);

    // Si era un código huérfano histórico aún no materializado en catálogo, materializarlo al renombrar
    const guardado = existente
      ? await this.prisma.tipos_oferta_cotizacion.update({
          where: { codigo },
          data: {
            nombre: nombreNext,
            descripcion: descripcionNext,
            badge: badgeNext,
            activo: true,
            fecha_modificacion: new Date(),
          },
        })
      : await this.prisma.tipos_oferta_cotizacion.create({
          data: {
            codigo,
            nombre: nombreNext,
            descripcion: descripcionNext,
            badge: badgeNext,
            es_sistema: false,
            activo: true,
            orden: 100,
          },
        });

    const [usoPlantillas, usoCotizaciones] = await Promise.all([
      this.prisma.plantillas_cotizacion.count({
        where: { tipo_cotizacion: codigo, activo: true },
      }),
      this.prisma.cotizaciones.count({ where: { tipo_cotizacion: codigo } }),
    ]);

    return {
      codigo: guardado.codigo,
      nombre: guardado.nombre,
      descripcion: guardado.descripcion ?? null,
      badge: guardado.badge || badgeNext,
      es_sistema: guardado.es_sistema,
      orden: guardado.orden,
      uso_plantillas: usoPlantillas,
      uso_cotizaciones: usoCotizaciones,
      uso_total: usoPlantillas + usoCotizaciones,
    };
  }

  async eliminar(rawCodigo: string) {
    const codigo = this.normalizeCodigo(rawCodigo);
    const existente = await this.prisma.tipos_oferta_cotizacion.findUnique({
      where: { codigo },
    });

    if (!existente) {
      throw new NotFoundException(`Tipo de oferta ${codigo} no encontrado`);
    }
    if (existente.es_sistema) {
      throw new BadRequestException(
        `El tipo estándar "${existente.nombre}" es parte del catálogo base y no puede eliminarse`,
      );
    }

    const [usoPlantillas, usoCotizaciones] = await Promise.all([
      this.prisma.plantillas_cotizacion.count({
        where: { tipo_cotizacion: codigo, activo: true },
      }),
      this.prisma.cotizaciones.count({ where: { tipo_cotizacion: codigo } }),
    ]);

    if (usoPlantillas + usoCotizaciones > 0) {
      throw new BadRequestException(
        `No se puede eliminar "${existente.nombre}" porque está en uso por ${usoPlantillas} plantilla(s) y ${usoCotizaciones} cotización(es)`,
      );
    }

    await this.prisma.tipos_oferta_cotizacion.delete({ where: { codigo } });
    return { message: `Tipo de oferta "${existente.nombre}" eliminado exitosamente` };
  }
}
