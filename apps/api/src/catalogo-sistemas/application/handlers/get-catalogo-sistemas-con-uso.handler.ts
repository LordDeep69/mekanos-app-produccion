import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../database/prisma.service';
import { GetCatalogoSistemasConUsoQuery } from '../queries/get-catalogo-sistemas-con-uso.query';

@QueryHandler(GetCatalogoSistemasConUsoQuery)
export class GetCatalogoSistemasConUsoHandler implements IQueryHandler<GetCatalogoSistemasConUsoQuery> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: GetCatalogoSistemasConUsoQuery): Promise<{
        data: any[];
        meta: { total: number; page: number; limit: number };
    }> {
        const { page, limit } = query;
        const skip = (page - 1) * limit;

        const [data, total] = await this.prisma.$transaction([
            this.prisma.catalogo_sistemas.findMany({
                skip,
                take: limit,
                orderBy: { orden_visualizacion: 'asc' },
                include: {
                    _count: {
                        select: {
                            catalogo_actividades: {
                                where: { activo: true }
                            }
                        }
                    }
                },
            }),
            this.prisma.catalogo_sistemas.count(),
        ]);

        // Transformar datos para incluir indicadores de uso
        const transformedData = data.map(sistema => ({
            ...sistema,
            total_actividades: sistema._count.catalogo_actividades,
            tiene_actividades: sistema._count.catalogo_actividades > 0,
            nivel_uso: this.getNivelUso(sistema._count.catalogo_actividades),
        }));

        return {
            data: transformedData,
            meta: {
                total,
                page,
                limit,
            },
        };
    }

    private getNivelUso(totalActividades: number): 'alto' | 'medio' | 'bajo' | 'sin_uso' {
        if (totalActividades === 0) return 'sin_uso';
        if (totalActividades >= 10) return 'alto';
        if (totalActividades >= 5) return 'medio';
        return 'bajo';
    }
}
