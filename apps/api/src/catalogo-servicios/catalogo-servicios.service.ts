import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { Prisma } from '@prisma/client';
import {
  PG_ACCENT_FROM,
  PG_ACCENT_TO,
  tokenizeSearchQuery,
} from '../common/utils/search-tokens.helper';
import { CreateCatalogoServiciosDto } from './dto/create-catalogo-servicios.dto';
import { UpdateCatalogoServiciosDto } from './dto/update-catalogo-servicios.dto';

@Injectable()
export class CatalogoServiciosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateCatalogoServiciosDto) {
    try {
      return await this.prisma.catalogo_servicios.create({
        data: createDto as any,
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al crear catalogo_servicios: ${(error as Error).message}`,
      );
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 50,
    categoria?: string,
    idTipoEquipo?: number,
    idTipoServicio?: number,
    activo?: boolean,
    search?: string,
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (activo !== undefined) {
        where.activo = activo;
      } else {
        where.activo = true;
      }

      if (categoria) {
        where.categoria = categoria;
      }

      if (idTipoServicio) {
        where.id_tipo_servicio = idTipoServicio;
      }

      if (idTipoEquipo) {
        where.OR = [
          { id_tipo_equipo: idTipoEquipo },
          { id_tipo_equipo: null },
        ];
      }

      if (search && search.trim() !== '') {
        const tokens = tokenizeSearchQuery(search);
        if (tokens.length > 0) {
          const tokenClauses = tokens.map((tok) => {
            const pattern = `%${tok}%`;
            return Prisma.sql`(
              translate(lower(COALESCE(cs.nombre_servicio, '')), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) LIKE ${pattern}
              OR translate(lower(COALESCE(cs.codigo_servicio, '')), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) LIKE ${pattern}
              OR translate(lower(COALESCE(cs.categoria::text, '')), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) LIKE ${pattern}
            )`;
          });

          const matchedRows = await this.prisma.$queryRaw<{ id_servicio: number }[]>(
            Prisma.sql`
              SELECT cs.id_servicio
              FROM catalogo_servicios cs
              WHERE ${Prisma.join(tokenClauses, ' AND ')}
            `,
          );

          const matchedIds = matchedRows.map((r) => r.id_servicio);
          const searchIdCondition = { id_servicio: { in: matchedIds } };
          if (where.OR) {
            where.AND = [{ OR: where.OR }, searchIdCondition];
            delete where.OR;
          } else {
            where.AND = [searchIdCondition];
          }
        }
      }
      
      const [data, total] = await Promise.all([
        this.prisma.catalogo_servicios.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id_servicio: 'asc' },
          include: {
            tipos_equipo: true,
            tipos_servicio: true,
          },
        }),
        this.prisma.catalogo_servicios.count({ where }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Error al obtener catalogo_servicios: ${(error as Error).message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.catalogo_servicios.findUnique({
        where: { id_servicio: id },
      });

      if (!record) {
        throw new NotFoundException(`CatalogoServicios con ID ${id} no encontrado`);
      }

      return record;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener catalogo_servicios: ${(error as Error).message}`,
      );
    }
  }

  async update(id: number, updateDto: UpdateCatalogoServiciosDto) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.catalogo_servicios.update({
        where: { id_servicio: id },
        data: updateDto as any,
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al actualizar catalogo_servicios: ${(error as Error).message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.findOne(id); // Verifica existencia

      return await this.prisma.catalogo_servicios.delete({
        where: { id_servicio: id },
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al eliminar catalogo_servicios: ${(error as Error).message}`,
      );
    }
  }
}
