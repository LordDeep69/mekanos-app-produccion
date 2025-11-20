import { Injectable, NotFoundException } from '@nestjs/common';
import { catalogo_componentes } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export interface CrearCatalogoComponenteData {
  id_tipo_componente: number;
  referencia_fabricante: string;
  marca?: string;
  descripcion_corta?: string;
  descripcion_detallada?: string;
  especificaciones_tecnicas?: any;
  tipo_comercial?: string;
  precio_compra?: number;
  precio_venta?: number;
  moneda?: string;
  id_proveedor_principal?: number;
  es_inventariable?: boolean;
  stock_minimo?: number;
  stock_actual?: number;
  unidad_medida?: string;
  observaciones?: string;
  notas_instalacion?: string;
  creado_por?: number;
}

export interface ActualizarCatalogoComponenteData {
  referencia_fabricante?: string;
  marca?: string;
  descripcion_corta?: string;
  descripcion_detallada?: string;
  especificaciones_tecnicas?: any;
  tipo_comercial?: string;
  precio_compra?: number;
  precio_venta?: number;
  moneda?: string;
  id_proveedor_principal?: number;
  es_inventariable?: boolean;
  stock_minimo?: number;
  stock_actual?: number;
  unidad_medida?: string;
  observaciones?: string;
  notas_instalacion?: string;
  activo?: boolean;
  modificado_por?: number;
}

export interface FiltrosCatalogoComponente {
  id_tipo_componente?: number;
  marca?: string;
  tipo_comercial?: string;
  activo?: boolean;
  skip?: number;
  limit?: number;
}

@Injectable()
export class PrismaCatalogoComponentesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(data: CrearCatalogoComponenteData): Promise<catalogo_componentes> {
    // Verificar que el tipo de componente existe
    const tipoComponente = await this.prisma.tipos_componente.findUnique({
      where: { id_tipo_componente: data.id_tipo_componente },
    });

    if (!tipoComponente) {
      throw new NotFoundException(`Tipo de componente ${data.id_tipo_componente} no encontrado`);
    }

    // Crear el componente con defaults
    const createData: any = {
      id_tipo_componente: data.id_tipo_componente,
      referencia_fabricante: data.referencia_fabricante,
      creado_por: data.creado_por || 1, // TODO: Extraer del JWT
      activo: true,
    };

    // Campos opcionales
    if (data.marca) createData.marca = data.marca;
    if (data.descripcion_corta) createData.descripcion_corta = data.descripcion_corta;
    if (data.descripcion_detallada) createData.descripcion_detallada = data.descripcion_detallada;
    if (data.especificaciones_tecnicas) createData.especificaciones_tecnicas = data.especificaciones_tecnicas;
    if (data.tipo_comercial) createData.tipo_comercial = data.tipo_comercial;
    if (data.precio_compra !== undefined) createData.precio_compra = data.precio_compra;
    if (data.precio_venta !== undefined) createData.precio_venta = data.precio_venta;
    if (data.moneda) createData.moneda = data.moneda;
    if (data.id_proveedor_principal) createData.id_proveedor_principal = data.id_proveedor_principal;
    if (data.es_inventariable !== undefined) createData.es_inventariable = data.es_inventariable;
    if (data.stock_minimo !== undefined) createData.stock_minimo = data.stock_minimo;
    if (data.stock_actual !== undefined) createData.stock_actual = data.stock_actual;
    if (data.unidad_medida) createData.unidad_medida = data.unidad_medida;
    if (data.observaciones) createData.observaciones = data.observaciones;
    if (data.notas_instalacion) createData.notas_instalacion = data.notas_instalacion;

    return this.prisma.catalogo_componentes.create({
      data: createData,
      include: {
        tipos_componente: true,
        proveedores: true,
      },
    });
  }

  async obtenerTodos(filtros: FiltrosCatalogoComponente = {}): Promise<{ componentes: catalogo_componentes[]; total: number }> {
    const where: any = {};

    if (filtros.id_tipo_componente) {
      where.id_tipo_componente = filtros.id_tipo_componente;
    }
    if (filtros.marca) {
      where.marca = { contains: filtros.marca, mode: 'insensitive' };
    }
    if (filtros.tipo_comercial) {
      where.tipo_comercial = filtros.tipo_comercial;
    }
    if (filtros.activo !== undefined) {
      where.activo = filtros.activo;
    }

    const [componentes, total] = await Promise.all([
      this.prisma.catalogo_componentes.findMany({
        where,
        include: {
          tipos_componente: true,
          proveedores: true,
        },
        skip: filtros.skip || 0,
        take: filtros.limit || 50,
        orderBy: { fecha_creacion: 'desc' },
      }),
      this.prisma.catalogo_componentes.count({ where }),
    ]);

    return { componentes, total };
  }

  async obtenerPorId(id: number): Promise<catalogo_componentes | null> {
    return this.prisma.catalogo_componentes.findUnique({
      where: { id_componente: id },
      include: {
        tipos_componente: true,
        proveedores: true,
      },
    });
  }

  async actualizar(id: number, data: ActualizarCatalogoComponenteData): Promise<catalogo_componentes> {
    const componente = await this.obtenerPorId(id);
    if (!componente) {
      throw new NotFoundException(`Componente ${id} no encontrado`);
    }

    const updateData: any = {
      fecha_modificacion: new Date(),
      modificado_por: data.modificado_por || 1, // TODO: Extraer del JWT
    };

    // Actualizar solo los campos presentes
    if (data.referencia_fabricante !== undefined) updateData.referencia_fabricante = data.referencia_fabricante;
    if (data.marca !== undefined) updateData.marca = data.marca;
    if (data.descripcion_corta !== undefined) updateData.descripcion_corta = data.descripcion_corta;
    if (data.descripcion_detallada !== undefined) updateData.descripcion_detallada = data.descripcion_detallada;
    if (data.especificaciones_tecnicas !== undefined) updateData.especificaciones_tecnicas = data.especificaciones_tecnicas;
    if (data.tipo_comercial !== undefined) updateData.tipo_comercial = data.tipo_comercial;
    if (data.precio_compra !== undefined) updateData.precio_compra = data.precio_compra;
    if (data.precio_venta !== undefined) updateData.precio_venta = data.precio_venta;
    if (data.moneda !== undefined) updateData.moneda = data.moneda;
    if (data.es_inventariable !== undefined) updateData.es_inventariable = data.es_inventariable;
    if (data.stock_minimo !== undefined) updateData.stock_minimo = data.stock_minimo;
    if (data.stock_actual !== undefined) updateData.stock_actual = data.stock_actual;
    if (data.unidad_medida !== undefined) updateData.unidad_medida = data.unidad_medida;
    if (data.observaciones !== undefined) updateData.observaciones = data.observaciones;
    if (data.notas_instalacion !== undefined) updateData.notas_instalacion = data.notas_instalacion;
    if (data.activo !== undefined) updateData.activo = data.activo;
    if (data.id_proveedor_principal !== undefined) updateData.id_proveedor_principal = data.id_proveedor_principal;

    return this.prisma.catalogo_componentes.update({
      where: { id_componente: id },
      data: updateData,
      include: {
        tipos_componente: true,
        proveedores: true,
      },
    });
  }

  async desactivar(id: number, usuario: number): Promise<catalogo_componentes> {
    const componente = await this.obtenerPorId(id);
    if (!componente) {
      throw new NotFoundException(`Componente ${id} no encontrado`);
    }

    return this.prisma.catalogo_componentes.update({
      where: { id_componente: id },
      data: {
        activo: false,
        fecha_modificacion: new Date(),
        modificado_por: usuario,
      },
    });
  }
}
