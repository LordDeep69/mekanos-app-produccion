import { PrismaService } from '@mekanos/database';
import { Injectable, NotFoundException } from '@nestjs/common';

/**
 * Repository para tipos_servicio
 * Implementa acceso a datos con Prisma ORM siguiendo arquitectura CQRS
 *
 * RESPONSABILIDADES:
 * - CRUD completo con validaciones FK y soporte multi-arquetipo (aplica_a: string[])
 * - Sincronización bidireccional aplica_a <-> id_tipo_equipo
 * - Normalización codigo_tipo (UPPER/TRIM)
 * - Soft delete (activo: false)
 * - Queries custom con filtrado Zero-Trust por Tipo de Equipo
 */
@Injectable()
export class PrismaTiposServicioRepository {
  constructor(private prisma: PrismaService) {}

  private readonly INCLUDE_RELATIONS_DETAIL = {
    tipos_equipo: {
      select: {
        id_tipo_equipo: true,
        codigo_tipo: true,
        nombre_tipo: true,
        categoria: true,
      },
    },
  };

  private readonly INCLUDE_RELATIONS_LIST = {
    tipos_equipo: {
      select: {
        id_tipo_equipo: true,
        codigo_tipo: true,
        nombre_tipo: true,
      },
    },
  };

  private normalizarCodigoTipo(codigo: string): string {
    return codigo.trim().toUpperCase();
  }

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

  /**
   * Expande códigos hermanos históricos de tipos_equipo (GEN/GENERADOR, BOM/BOMBA, MOT/MOTOR)
   * y conserva intacto cualquier otro código de arquetipo presente o futuro (ej. ELEV, HVAC, COMP).
   */
  private expandirCodigosSinonimos(codigos: string[]): string[] {
    const set = new Set<string>();
    for (const raw of codigos) {
      const c = String(raw || '').trim().toUpperCase();
      if (!c) continue;
      set.add(c);
      if (c === 'GEN' || c === 'GENERADOR') {
        set.add('GEN');
        set.add('GENERADOR');
      } else if (c === 'BOM' || c === 'BOMBA') {
        set.add('BOM');
        set.add('BOMBA');
      } else if (c === 'MOT' || c === 'MOTOR') {
        set.add('MOT');
        set.add('MOTOR');
      }
    }
    return Array.from(set);
  }

  /**
   * Sincroniza bidireccionalmente `aplica_a` (String[]) y `id_tipo_equipo` (Int?):
   * - Si `aplica_a` se envía vacío `[]` -> es Universal (`id_tipo_equipo = null`, `aplica_a = []`).
   * - Si `aplica_a` tiene 1 o N códigos -> resuelve el `id_tipo_equipo` del primer código para mantener la FK principal.
   * - Si no se envió `aplica_a` pero sí `id_tipo_equipo` -> pobla `aplica_a` desde el código de ese `id_tipo_equipo`.
   */
  private async sincronizarAlcanceArquetipos(
    data: any,
    isUpdate = false,
  ): Promise<void> {
    if (Array.isArray(data.aplica_a)) {
      const codigosLimpios = Array.from(
        new Set(
          data.aplica_a
            .map((c: string) => String(c || '').trim().toUpperCase())
            .filter(Boolean),
        ),
      );

      if (codigosLimpios.length === 0) {
        if (!isUpdate && data.id_tipo_equipo) {
          const te = await this.prisma.tipos_equipo.findUnique({
            where: { id_tipo_equipo: Number(data.id_tipo_equipo) },
            select: { codigo_tipo: true },
          });
          data.aplica_a = te?.codigo_tipo
            ? this.expandirCodigosSinonimos([te.codigo_tipo])
            : [];
        } else {
          data.aplica_a = [];
          data.id_tipo_equipo = null;
        }
      } else {
        data.aplica_a = codigosLimpios;
        // Resolver el id_tipo_equipo principal a partir del primer código seleccionado
        const primerCodigo = codigosLimpios[0];
        const tePrincipal = await this.prisma.tipos_equipo.findFirst({
          where: {
            codigo_tipo: {
              equals: primerCodigo,
              mode: 'insensitive',
            },
          },
          select: { id_tipo_equipo: true },
        });
        if (tePrincipal) {
          data.id_tipo_equipo = tePrincipal.id_tipo_equipo;
        }
      }
      return;
    }

    // Si aplica_a no vino en el payload pero id_tipo_equipo sí fue especificado
    if (data.id_tipo_equipo !== undefined) {
      if (data.id_tipo_equipo === null) {
        data.aplica_a = [];
      } else {
        const te = await this.prisma.tipos_equipo.findUnique({
          where: { id_tipo_equipo: Number(data.id_tipo_equipo) },
          select: { codigo_tipo: true },
        });
        if (te?.codigo_tipo) {
          data.aplica_a = [te.codigo_tipo.trim().toUpperCase()];
        }
      }
    }
  }

  /**
   * Resuelve los IDs y códigos compatibles para un `tipoEquipoId` dado
   */
  private async resolverFiltroTipoEquipo(tipoEquipoId: number): Promise<{
    ids: number[];
    codigos: string[];
  }> {
    const ids = new Set<number>([tipoEquipoId]);
    const codigosRaw: string[] = [];

    try {
      const te = await this.prisma.tipos_equipo.findUnique({
        where: { id_tipo_equipo: tipoEquipoId },
        select: { codigo_tipo: true, nombre_tipo: true },
      });

      if (te?.codigo_tipo) {
        const code = te.codigo_tipo.trim().toUpperCase();
        codigosRaw.push(code);

        if (code === 'GEN' || code === 'GENERADOR') {
          ids.add(1);
          ids.add(3);
        } else if (code === 'BOM' || code === 'BOMBA') {
          ids.add(2);
          ids.add(5);
        } else if (code === 'MOT' || code === 'MOTOR') {
          ids.add(4);
          ids.add(6);
        }
      }
    } catch {
      // Mantiene al menos el tipoEquipoId original
    }

    return {
      ids: Array.from(ids),
      codigos: this.expandirCodigosSinonimos(codigosRaw),
    };
  }

  // ============================================================================
  // CREATE
  // ============================================================================

  async create(data: any): Promise<any> {
    if (data.codigo_tipo) {
      data.codigo_tipo = this.normalizarCodigoTipo(data.codigo_tipo);
    }

    await this.sincronizarAlcanceArquetipos(data, false);

    if (data.id_tipo_equipo) {
      await this.validarTipoEquipo(data.id_tipo_equipo);
    }

    if (data.creado_por) {
      await this.validarUsuario(data.creado_por, 'creado_por');
    }

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

  async findAll(filters?: {
    activo?: boolean;
    categoria?: string;
    tipoEquipoId?: number;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<any[]> {
    let filtroEquipoOr: any[] | null = null;

    if (filters?.tipoEquipoId) {
      const { ids, codigos } = await this.resolverFiltroTipoEquipo(
        filters.tipoEquipoId,
      );
      filtroEquipoOr = [
        { id_tipo_equipo: { in: ids } },
        ...(codigos.length > 0 ? [{ aplica_a: { hasSome: codigos } }] : []),
        {
          AND: [
            { id_tipo_equipo: null },
            { aplica_a: { isEmpty: true } },
          ],
        },
      ];
    }

    return this.prisma.tipos_servicio.findMany({
      where: {
        ...(filters?.activo !== undefined && { activo: filters.activo }),
        categoria: filters?.categoria as any,
        ...(filtroEquipoOr && { OR: filtroEquipoOr }),
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
        { orden_visualizacion: 'asc' },
        { nombre_tipo: 'asc' },
      ],
      skip: filters?.skip,
      take: filters?.limit || 50,
    });
  }

  // ============================================================================
  // READ (BY ID & CODIGO)
  // ============================================================================

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

  async update(id: number, data: any): Promise<any> {
    await this.findById(id);

    if (data.codigo_tipo) {
      data.codigo_tipo = this.normalizarCodigoTipo(data.codigo_tipo);
    }

    await this.sincronizarAlcanceArquetipos(data, true);

    if (data.id_tipo_equipo) {
      await this.validarTipoEquipo(data.id_tipo_equipo);
    }

    if (data.modificado_por) {
      await this.validarUsuario(data.modificado_por, 'modificado_por');
    }

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

  async delete(id: number): Promise<any> {
    return this.update(id, { activo: false });
  }

  // ============================================================================
  // QUERIES CUSTOM
  // ============================================================================

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

  async findByTipoEquipo(
    tipoEquipoId: number,
    soloActivos: boolean = true,
  ): Promise<any[]> {
    const { ids, codigos } = await this.resolverFiltroTipoEquipo(tipoEquipoId);
    return this.prisma.tipos_servicio.findMany({
      where: {
        activo: soloActivos ? true : undefined,
        OR: [
          { id_tipo_equipo: { in: ids } },
          ...(codigos.length > 0 ? [{ aplica_a: { hasSome: codigos } }] : []),
        ],
      },
      include: this.INCLUDE_RELATIONS_LIST,
      orderBy: { nombre_tipo: 'asc' },
    });
  }

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

  async count(filters?: {
    activo?: boolean;
    categoria?: string;
    tipoEquipoId?: number;
    search?: string;
  }): Promise<number> {
    let filtroEquipoOr: any[] | null = null;

    if (filters?.tipoEquipoId) {
      const { ids, codigos } = await this.resolverFiltroTipoEquipo(
        filters.tipoEquipoId,
      );
      filtroEquipoOr = [
        { id_tipo_equipo: { in: ids } },
        ...(codigos.length > 0 ? [{ aplica_a: { hasSome: codigos } }] : []),
        {
          AND: [
            { id_tipo_equipo: null },
            { aplica_a: { isEmpty: true } },
          ],
        },
      ];
    }

    return this.prisma.tipos_servicio.count({
      where: {
        ...(filters?.activo !== undefined && { activo: filters.activo }),
        categoria: filters?.categoria as any,
        ...(filtroEquipoOr && { OR: filtroEquipoOr }),
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
