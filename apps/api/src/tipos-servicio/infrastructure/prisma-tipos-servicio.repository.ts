import { PrismaService } from '@mekanos/database';
import { Injectable, NotFoundException } from '@nestjs/common';

/**
 * Repository para tipos_servicio
 * Implementa acceso a datos con Prisma ORM siguiendo arquitectura CQRS
 * 
 * RESPONSABILIDADES:
 * - CRUD completo con validaciones FK
 * - Normalización codigo_tipo (UPPER/TRIM)
 * - Soft delete (activo: false)
 * - Queries custom (por categoria, tipo equipo)
 * - Includes quirúrgicos (no masivos)
 * 
 * PATRONES:
 * - Repository Pattern (desacoplamiento ORM)
 * - Validación FK antes INSERT/UPDATE
 * - Mensajes error descriptivos
 */
@Injectable()
export class PrismaTiposServicioRepository {
  constructor(private prisma: PrismaService) { }

  /**
   * Includes QUIRÚRGICOS (selectivos) para performance
   * Solo relaciones necesarias, sin recursión profunda
   */
  private readonly INCLUDE_RELATIONS_DETAIL = {
    tipos_equipo: {
      select: {
        id_tipo_equipo: true,
        codigo_tipo: true,
        nombre_tipo: true,
        categoria: true,
      },
    },
    usuarios_tipos_servicio_creado_porTousuarios: {
      select: {
        id_usuario: true,
        persona: {
          select: {
            id_persona: true,
            primer_nombre: true,
            primer_apellido: true,
            nombre_completo: true,
          },
        },
      },
    },
    usuarios_tipos_servicio_modificado_porTousuarios: {
      select: {
        id_usuario: true,
        persona: {
          select: {
            id_persona: true,
            primer_nombre: true,
            primer_apellido: true,
            nombre_completo: true,
          },
        },
      },
    },
  };

  /**
   * Includes BÁSICOS para listados (sin creado_por/modificado_por)
   */
  private readonly INCLUDE_RELATIONS_LIST = {
    tipos_equipo: {
      select: {
        id_tipo_equipo: true,
        codigo_tipo: true,
        nombre_tipo: true,
      },
    },
  };

  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================

  /**
   * Normaliza codigo_tipo según schema BD
   * Backend responsabilidad: UPPER(TRIM())
   */
  private normalizarCodigoTipo(codigo: string): string {
    return codigo.trim().toUpperCase();
  }

  /**
   * Valida que tipo_equipo existe si se proporciona FK
   * Previene FK constraint errors con mensaje descriptivo
   */
  private async validarTipoEquipo(id_tipo_equipo: number): Promise<void> {
    const tipoEquipo = await this.prisma.tipos_equipo.findUnique({
      where: { id_tipo_equipo },
      select: { id_tipo_equipo: true, nombre_tipo: true },
    });

    if (!tipoEquipo) {
      throw new NotFoundException(
        `Tipo de equipo con ID ${id_tipo_equipo} no encontrado`,
      );
    }
  }

  /**
   * Valida que usuario existe si se proporciona FK
   */
  private async validarUsuario(id_usuario: number, campo: string): Promise<void> {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id_usuario },
      select: { id_usuario: true },
    });

    if (!usuario) {
      throw new NotFoundException(
        `Usuario con ID ${id_usuario} no encontrado (campo: ${campo})`,
      );
    }
  }

  // ============================================================================
  // CREATE
  // ============================================================================

  /**
   * Crear nuevo tipo de servicio
   * 
   * VALIDACIONES:
   * - Normaliza codigo_tipo (UPPER/TRIM)
   * - Valida FK tipo_equipo si se proporciona
   * - Valida FK creado_por si se proporciona
   * 
   * @param data Datos del tipo servicio
   * @returns Tipo servicio creado con relaciones
   */
  async create(data: any): Promise<any> {
    // 1. Normalizar codigo_tipo
    if (data.codigo_tipo) {
      data.codigo_tipo = this.normalizarCodigoTipo(data.codigo_tipo);
    }

    // 2. Validar FK tipo_equipo
    if (data.id_tipo_equipo) {
      await this.validarTipoEquipo(data.id_tipo_equipo);
    }

    // 3. Validar FK creado_por
    if (data.creado_por) {
      await this.validarUsuario(data.creado_por, 'creado_por');
    }

    // 4. Crear registro
    return this.prisma.tipos_servicio.create({
      data: {
        ...data,
        fecha_creacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  // ============================================================================
  // READ (ALL)
  // ============================================================================

  /**
   * Listar tipos servicio con filtros y paginación
   * 
   * FILTROS SOPORTADOS:
   * - activo: boolean
   * - categoria: categoria_servicio_enum
   * - tipoEquipoId: number
   * - search: string (búsqueda ILIKE en nombre_tipo, codigo_tipo, descripcion)
   * - skip/limit: paginación
   * 
   * @param filters Objeto con filtros opcionales
   * @returns Array de tipos servicio
   */
  async findAll(filters?: {
    activo?: boolean;
    categoria?: string;
    tipoEquipoId?: number;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<any[]> {
    return this.prisma.tipos_servicio.findMany({
      where: {
        // Filtro activo (default: solo activos)
        activo: filters?.activo !== undefined ? filters.activo : true,

        // Filtro por categoría
        categoria: filters?.categoria as any,

        // Filtro por tipo equipo: Incluir específicos + globales (null)
        ...(filters?.tipoEquipoId && {
          OR: [
            { id_tipo_equipo: filters.tipoEquipoId },
            { id_tipo_equipo: null },
          ],
        }),

        // Búsqueda global (nombre, codigo, descripcion)
        ...(filters?.search && {
          OR: [
            {
              nombre_tipo: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
            {
              codigo_tipo: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
            {
              descripcion: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          ],
        }),
      },
      include: this.INCLUDE_RELATIONS_LIST,
      orderBy: [
        { orden_visualizacion: 'asc' }, // Priorizar orden manual
        { nombre_tipo: 'asc' },         // Fallback alfabético
      ],
      skip: filters?.skip,
      take: filters?.limit || 50, // Default 50 registros
    });
  }

  // ============================================================================
  // READ (BY ID)
  // ============================================================================

  /**
   * Obtener tipo servicio por ID con relaciones completas
   * 
   * @param id ID del tipo servicio
   * @returns Tipo servicio con relaciones
   * @throws NotFoundException si no existe
   */
  async findById(id: number): Promise<any> {
    const tipoServicio = await this.prisma.tipos_servicio.findUnique({
      where: { id_tipo_servicio: id },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });

    if (!tipoServicio) {
      throw new NotFoundException(
        `Tipo de servicio con ID ${id} no encontrado`,
      );
    }

    return tipoServicio;
  }

  // ============================================================================
  // READ (BY CODIGO)
  // ============================================================================

  /**
   * Obtener tipo servicio por código único
   * Útil para validaciones y lookups
   * 
   * @param codigo Código del tipo (se normaliza automáticamente)
   * @returns Tipo servicio o null si no existe
   */
  async findByCodigo(codigo: string): Promise<any | null> {
    const codigoNormalizado = this.normalizarCodigoTipo(codigo);

    return this.prisma.tipos_servicio.findUnique({
      where: { codigo_tipo: codigoNormalizado },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  // ============================================================================
  // UPDATE
  // ============================================================================

  /**
   * Actualizar tipo servicio
   * 
   * VALIDACIONES:
   * - Verifica que registro existe
   * - Normaliza codigo_tipo si se actualiza
   * - Valida FKs si se actualizan
   * 
   * @param id ID del tipo servicio
   * @param data Datos a actualizar
   * @returns Tipo servicio actualizado
   */
  async update(id: number, data: any): Promise<any> {
    // 1. Verificar que existe
    await this.findById(id);

    // 2. Normalizar codigo_tipo si se actualiza
    if (data.codigo_tipo) {
      data.codigo_tipo = this.normalizarCodigoTipo(data.codigo_tipo);
    }

    // 3. Validar FK tipo_equipo si se actualiza
    if (data.id_tipo_equipo) {
      await this.validarTipoEquipo(data.id_tipo_equipo);
    }

    // 4. Validar FK modificado_por si se proporciona
    if (data.modificado_por) {
      await this.validarUsuario(data.modificado_por, 'modificado_por');
    }

    // 5. Actualizar registro
    return this.prisma.tipos_servicio.update({
      where: { id_tipo_servicio: id },
      data: {
        ...data,
        fecha_modificacion: new Date(),
      },
      include: this.INCLUDE_RELATIONS_DETAIL,
    });
  }

  // ============================================================================
  // DELETE (SOFT)
  // ============================================================================

  /**
   * Soft delete: marcar como inactivo
   * NO elimina físicamente el registro (preserva auditoría)
   * 
   * @param id ID del tipo servicio
   * @returns Tipo servicio desactivado
   */
  async delete(id: number): Promise<any> {
    return this.update(id, { activo: false });
  }

  // ============================================================================
  // QUERIES CUSTOM
  // ============================================================================

  /**
   * Obtener tipos servicio por categoría
   * 
   * @param categoria Categoría del servicio (ENUM)
   * @param soloActivos Filtrar solo activos (default: true)
   * @returns Array de tipos servicio
   */
  async findByCategoria(
    categoria: string,
    soloActivos: boolean = true,
  ): Promise<any[]> {
    return this.prisma.tipos_servicio.findMany({
      where: {
        categoria: categoria as any,
        activo: soloActivos ? true : undefined,
      },
      include: this.INCLUDE_RELATIONS_LIST,
      orderBy: { orden_visualizacion: 'asc' },
    });
  }

  /**
   * Obtener tipos servicio compatibles con un tipo de equipo
   * 
   * @param tipoEquipoId ID del tipo de equipo
   * @param soloActivos Filtrar solo activos (default: true)
   * @returns Array de tipos servicio
   */
  async findByTipoEquipo(
    tipoEquipoId: number,
    soloActivos: boolean = true,
  ): Promise<any[]> {
    return this.prisma.tipos_servicio.findMany({
      where: {
        id_tipo_equipo: tipoEquipoId,
        activo: soloActivos ? true : undefined,
      },
      include: this.INCLUDE_RELATIONS_LIST,
      orderBy: { nombre_tipo: 'asc' },
    });
  }

  /**
   * Obtener tipos servicio que tienen checklist
   * Útil para generar listados de servicios que requieren actividades
   * 
   * @param soloActivos Filtrar solo activos (default: true)
   * @returns Array de tipos servicio
   */
  async findConChecklist(soloActivos: boolean = true): Promise<any[]> {
    return this.prisma.tipos_servicio.findMany({
      where: {
        tiene_checklist: true,
        activo: soloActivos ? true : undefined,
      },
      include: this.INCLUDE_RELATIONS_LIST,
      orderBy: { nombre_tipo: 'asc' },
    });
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  /**
   * Contar registros con filtros opcionales
   * Útil para paginación
   * 
   * @param filters Filtros opcionales (mismo formato que findAll)
   * @returns Total de registros
   */
  async count(filters?: {
    activo?: boolean;
    categoria?: string;
    tipoEquipoId?: number;
    search?: string;
  }): Promise<number> {
    return this.prisma.tipos_servicio.count({
      where: {
        activo: filters?.activo !== undefined ? filters.activo : true,
        categoria: filters?.categoria as any,
        // Filtro por tipo equipo: Incluir específicos + globales (null)
        ...(filters?.tipoEquipoId && {
          OR: [
            { id_tipo_equipo: filters.tipoEquipoId },
            { id_tipo_equipo: null },
          ],
        }),
        ...(filters?.search && {
          OR: [
            { nombre_tipo: { contains: filters.search, mode: 'insensitive' } },
            { codigo_tipo: { contains: filters.search, mode: 'insensitive' } },
            { descripcion: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
    });
  }

  /**
   * Verificar si existe un tipo servicio con un código específico
   * Útil para validaciones de duplicados
   * 
   * @param codigo Código a verificar (se normaliza)
   * @param excludeId ID a excluir de la búsqueda (para updates)
   * @returns true si existe, false si no
   */
  async existsByCodigo(codigo: string, excludeId?: number): Promise<boolean> {
    const codigoNormalizado = this.normalizarCodigoTipo(codigo);

    const count = await this.prisma.tipos_servicio.count({
      where: {
        codigo_tipo: codigoNormalizado,
        id_tipo_servicio: excludeId ? { not: excludeId } : undefined,
      },
    });

    return count > 0;
  }
}
