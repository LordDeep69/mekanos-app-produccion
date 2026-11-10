import { PrismaService } from '@mekanos/database';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTiposServicioDetalleCompletoQuery } from './get-tipos-servicio-detalle-completo.query';

const LEGACY_PROTECTED_EQUIP_CODES = new Set([
  'GEN',
  'GENERADOR',
  'BOM',
  'BOMBA',
  'MOT',
  'MOTOR',
  'COMP',
  'COMPRESOR',
]);

function expandEquipCodes(rawCodes: string[]): string[] {
  const out = new Set<string>();
  for (const raw of rawCodes) {
    const c = (raw || '').trim().toUpperCase();
    if (!c) continue;
    out.add(c);
    if (c === 'GEN' || c === 'GENERADOR') {
      out.add('GEN');
      out.add('GENERADOR');
    } else if (c === 'BOM' || c === 'BOMBA') {
      out.add('BOM');
      out.add('BOMBA');
    } else if (c === 'MOT' || c === 'MOTOR') {
      out.add('MOT');
      out.add('MOTOR');
    } else if (c === 'COMP' || c === 'COMPRESOR') {
      out.add('COMP');
      out.add('COMPRESOR');
    }
  }
  return Array.from(out);
}

@QueryHandler(GetTiposServicioDetalleCompletoQuery)
export class GetTiposServicioDetalleCompletoHandler
  implements IQueryHandler<GetTiposServicioDetalleCompletoQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTiposServicioDetalleCompletoQuery) {
    const { id } = query;

    const tipoServicio = await this.prisma.tipos_servicio.findUnique({
      where: { id_tipo_servicio: id },
      include: {
        tipos_equipo: {
          include: {
            tipo_equipo_modulos: {
              include: {
                modulo: true,
              },
              orderBy: { orden_visual: 'asc' },
            },
          },
        },
        catalogo_actividades: {
          where: { activo: true },
          include: {
            catalogo_sistemas: true,
            parametros_medicion: true,
          },
          orderBy: [
            { catalogo_sistemas: { orden_visualizacion: 'asc' } },
            { orden_ejecucion: 'asc' },
            { id_actividad_catalogo: 'asc' },
          ],
        },
        _count: {
          select: {
            catalogo_actividades: { where: { activo: true } },
            ordenes_servicio: true,
          },
        },
      },
    });

    if (!tipoServicio) {
      throw new NotFoundException(`Tipo de servicio con ID ${id} no encontrado`);
    }

    const baseCodes: string[] = [];
    if (Array.isArray(tipoServicio.aplica_a)) {
      baseCodes.push(...tipoServicio.aplica_a);
    }
    if (tipoServicio.tipos_equipo?.codigo_tipo) {
      baseCodes.push(tipoServicio.tipos_equipo.codigo_tipo);
    }
    const compatibleCodes = expandEquipCodes(baseCodes);

    // Salvaguarda 2: Garantizar que las Partes EAM del arquetipo existan en catalogo_sistemas
    let allSistemas = await this.prisma.catalogo_sistemas.findMany({
      where: { activo: true },
      orderBy: [{ orden_visualizacion: 'asc' }, { nombre_sistema: 'asc' }],
    });

    const primaryEqCode = tipoServicio.tipos_equipo?.codigo_tipo?.trim().toUpperCase() || compatibleCodes[0] || null;
    const modulosArquetipo = tipoServicio.tipos_equipo?.tipo_equipo_modulos || [];

    if (primaryEqCode && !LEGACY_PROTECTED_EQUIP_CODES.has(primaryEqCode) && modulosArquetipo.length > 0) {
      const normTokens = (str: string) =>
        str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length >= 4 && !['sistema', 'parte', 'control', 'para'].includes(w));

      let mutated = false;
      for (const tem of modulosArquetipo) {
        const mod = tem.modulo;
        if (!mod?.activo) continue;
        const modTokens = normTokens(mod.nombre_modulo);

        let match = allSistemas.find((s) => s.id_modulo === mod.id_modulo);
        if (!match) {
          match = allSistemas.find((s) => {
            const aplica = (s.aplica_a || []).map((a) => a.toUpperCase());
            const sameName = s.nombre_sistema.trim().toLowerCase() === mod.nombre_modulo.trim().toLowerCase();
            if (sameName) return true;
            if (!aplica.includes(primaryEqCode) || s.id_modulo != null) return false;
            const sysTokens = normTokens(s.nombre_sistema);
            return modTokens.some((t) => sysTokens.includes(t));
          });
        }

        if (match) {
          const curAplica = (match.aplica_a || []).map((a) => a.toUpperCase());
          if (match.id_modulo !== mod.id_modulo || !curAplica.includes(primaryEqCode)) {
            await this.prisma.catalogo_sistemas.update({
              where: { id_sistema: match.id_sistema },
              data: {
                id_modulo: match.id_modulo ?? mod.id_modulo,
                aplica_a: Array.from(new Set([...curAplica, primaryEqCode])),
              },
            });
            mutated = true;
          }
        } else {
          const rawCode = `SIS_${mod.codigo_modulo.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`.slice(0, 50);
          await this.prisma.catalogo_sistemas.create({
            data: {
              codigo_sistema: rawCode,
              nombre_sistema: mod.nombre_modulo.trim().slice(0, 100),
              descripcion: mod.descripcion || `Subsistema sincronizado desde parte EAM (${mod.codigo_modulo})`,
              aplica_a: [primaryEqCode],
              orden_visualizacion: tem.orden_visual ?? 1,
              icono: mod.icono || 'layers',
              color_hex: (mod.color_ui || '#3B82F6').slice(0, 7),
              id_modulo: mod.id_modulo,
              activo: true,
            },
          });
          mutated = true;
        }
      }

      if (mutated) {
        allSistemas = await this.prisma.catalogo_sistemas.findMany({
          where: { activo: true },
          orderBy: [{ orden_visualizacion: 'asc' }, { nombre_sistema: 'asc' }],
        });
      }
    }

    // Filtrar subsistemas disponibles para este Tipo de Servicio
    const usedSistemaIds = new Set(
      tipoServicio.catalogo_actividades
        .map((a) => a.id_sistema)
        .filter((x): x is number => typeof x === 'number'),
    );
    const modulosIdsSet = new Set(modulosArquetipo.map((m) => m.id_modulo));

    const sistemasDisponibles = allSistemas
      .filter((s) => {
        if (usedSistemaIds.has(s.id_sistema)) return true;
        if (s.id_modulo && modulosIdsSet.has(s.id_modulo)) return true;
        const sAplica = (s.aplica_a || []).map((a) => a.toUpperCase());
        if (compatibleCodes.length === 0) return true;
        return sAplica.some((code) => compatibleCodes.includes(code));
      })
      .map((s) => ({
        id_sistema: s.id_sistema,
        codigo_sistema: s.codigo_sistema,
        nombre_sistema: s.nombre_sistema,
        orden_visualizacion: s.orden_visualizacion,
        id_modulo: s.id_modulo ?? null,
        aplica_a: s.aplica_a ?? [],
      }));

    // Agrupar actividades por sistema
    const actividadesPorSistema = new Map<
      string,
      { id_sistema: number | null; nombre_sistema: string; codigo_sistema: string; acts: any[] }
    >();

    for (const actividad of tipoServicio.catalogo_actividades) {
      const sistema = actividad.catalogo_sistemas;
      const nombreSistema = (sistema?.nombre_sistema || 'General').trim();
      const codigoSistema = sistema?.codigo_sistema || 'GENERAL';
      const key = sistema ? `ID_${sistema.id_sistema}` : 'GENERAL';

      if (!actividadesPorSistema.has(key)) {
        actividadesPorSistema.set(key, {
          id_sistema: actividad.id_sistema ?? null,
          nombre_sistema: nombreSistema,
          codigo_sistema: codigoSistema,
          acts: [],
        });
      }
      actividadesPorSistema.get(key)!.acts.push(actividad);
    }

    const sistemasConActividades = [];
    for (const [, group] of actividadesPorSistema) {
      sistemasConActividades.push({
        id_sistema: group.id_sistema,
        nombre_sistema: group.nombre_sistema,
        codigo_sistema: group.codigo_sistema,
        actividades: group.acts.map((a) => ({
          id_actividad_catalogo: a.id_actividad_catalogo,
          codigo_actividad: a.codigo_actividad,
          descripcion_actividad: a.descripcion_actividad,
          tipo_actividad: a.tipo_actividad,
          orden_ejecucion: a.orden_ejecucion,
          id_sistema: a.id_sistema ?? null,
          id_tipo_equipo: a.id_tipo_equipo ?? tipoServicio.id_tipo_equipo ?? null,
          id_plantilla_origen: a.id_plantilla_origen ?? null,
          es_obligatoria: a.es_obligatoria ?? true,
          tiempo_estimado_minutos: a.tiempo_estimado_minutos,
          instrucciones: a.instrucciones ?? null,
          precauciones: a.precauciones ?? null,
          observaciones: a.observaciones ?? null,
          id_parametro_medicion: a.id_parametro_medicion ?? null,
          parametro_medicion: a.parametros_medicion
            ? {
                id: a.parametros_medicion.id_parametro_medicion,
                codigo: a.parametros_medicion.codigo_parametro,
                nombre: a.parametros_medicion.nombre_parametro,
                unidad: a.parametros_medicion.unidad_medida,
                rango_min:
                  a.parametros_medicion.valor_minimo_normal != null
                    ? Number(a.parametros_medicion.valor_minimo_normal)
                    : undefined,
                rango_max:
                  a.parametros_medicion.valor_maximo_normal != null
                    ? Number(a.parametros_medicion.valor_maximo_normal)
                    : undefined,
                min_critico:
                  a.parametros_medicion.valor_minimo_critico != null
                    ? Number(a.parametros_medicion.valor_minimo_critico)
                    : undefined,
                max_critico:
                  a.parametros_medicion.valor_maximo_critico != null
                    ? Number(a.parametros_medicion.valor_maximo_critico)
                    : undefined,
                ideal:
                  a.parametros_medicion.valor_ideal != null
                    ? Number(a.parametros_medicion.valor_ideal)
                    : undefined,
              }
            : null,
        })),
        total_actividades: group.acts.length,
      });
    }

    sistemasConActividades.sort((a, b) => {
      if (a.nombre_sistema.toUpperCase() === 'GENERAL') return 1;
      if (b.nombre_sistema.toUpperCase() === 'GENERAL') return -1;
      return 0;
    });

    return {
      id_tipo_servicio: tipoServicio.id_tipo_servicio,
      codigo_tipo: tipoServicio.codigo_tipo,
      nombre_tipo: tipoServicio.nombre_tipo,
      descripcion: tipoServicio.descripcion,
      plantilla_observacion: tipoServicio.plantilla_observacion,
      activo: tipoServicio.activo,
      categoria: tipoServicio.categoria,
      color_hex: tipoServicio.color_hex,
      icono: tipoServicio.icono,
      tiene_checklist: tipoServicio.tiene_checklist,
      duracion_estimada_horas: tipoServicio.duracion_estimada_horas,
      id_tipo_equipo: tipoServicio.id_tipo_equipo ?? null,
      aplica_a: compatibleCodes,
      tipo_equipo: tipoServicio.tipos_equipo
        ? {
            id: tipoServicio.tipos_equipo.id_tipo_equipo,
            codigo: tipoServicio.tipos_equipo.codigo_tipo,
            nombre: tipoServicio.tipos_equipo.nombre_tipo,
          }
        : null,
      estadisticas: {
        total_actividades: tipoServicio._count.catalogo_actividades,
        total_ordenes_historicas: tipoServicio._count.ordenes_servicio,
        total_sistemas: sistemasDisponibles.length || sistemasConActividades.length,
      },
      sistemas_disponibles: sistemasDisponibles,
      sistemas_con_actividades: sistemasConActividades,
    };
  }
}
