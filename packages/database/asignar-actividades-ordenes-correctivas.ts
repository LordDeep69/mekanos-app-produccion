/**
 * Script para asignar actividades a órdenes correctivas existentes
 * 
 * Los correctivos no tienen checklists estándares - dependen del escenario.
 * Para pruebas, asignamos UNA actividad genérica a cada orden correctiva.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Asignando actividades a órdenes correctivas...\n');

    await prisma.$transaction(async (tx) => {
        // 1. Obtener únicamente las órdenes objetivo (GCORR-* / BCORR-*)
        const ordenesTarget = await tx.ordenes_servicio.findMany({
            where: {
                OR: [
                    { numero_orden: { startsWith: 'GCORR-', mode: 'insensitive' } },
                    { numero_orden: { startsWith: 'BCORR-', mode: 'insensitive' } },
                ],
            },
            select: {
                id_orden_servicio: true,
                numero_orden: true,
                id_tipo_servicio: true,
                tipo_servicio: {
                    select: {
                        id_tipo_servicio: true,
                        codigo_tipo: true,
                        nombre_tipo: true,
                    },
                },
                _count: { select: { actividades_ejecutadas: true } },
            },
            orderBy: { numero_orden: 'asc' },
        });

        console.log(`📦 Órdenes target (GCORR/BCORR) encontradas: ${ordenesTarget.length}`);

        if (ordenesTarget.length === 0) {
            console.log('⚠️  No se encontraron órdenes GCORR-* ni BCORR-* (nada que hacer).');
            return;
        }

        // 2. Filtrar las que no tienen actividades
        const ordenesSinActividades = ordenesTarget.filter((o) => o._count.actividades_ejecutadas === 0);
        console.log(`⚠️  Órdenes SIN actividades (antes): ${ordenesSinActividades.length}`);

        if (ordenesSinActividades.length === 0) {
            console.log('✅ Todas las órdenes GCORR/BCORR ya tienen al menos 1 actividad asignada.');
            return;
        }

        // 3. Garantizar que exista al menos UNA actividad de catálogo por tipo
        const actividadBasePorTipo = new Map<number, { id_actividad_catalogo: number; codigo_actividad: string }>();
        for (const orden of ordenesTarget) {
            const tipoId = orden.id_tipo_servicio;
            if (!tipoId) {
                console.log(`   ⚠️  ${orden.numero_orden}: id_tipo_servicio es NULL. Se omitirá esta orden.`);
                continue;
            }
            if (actividadBasePorTipo.has(tipoId)) continue;

            const existente = await tx.catalogo_actividades.findFirst({
                where: {
                    id_tipo_servicio: tipoId,
                    activo: true,
                },
                select: {
                    id_actividad_catalogo: true,
                    codigo_actividad: true,
                },
                orderBy: { orden_ejecucion: 'asc' },
            });

            if (existente) {
                actividadBasePorTipo.set(tipoId, existente);
                continue;
            }

            const codigoTipo = orden.tipo_servicio?.codigo_tipo || `TIPO_${tipoId}`;
            const codigoActividad = `${codigoTipo}_AUTO_01`.toUpperCase().slice(0, 50);

            const creada = await tx.catalogo_actividades.create({
                data: {
                    id_tipo_servicio: tipoId,
                    codigo_actividad: codigoActividad,
                    descripcion_actividad: 'Actividad genérica automática para órdenes correctivas',
                    tipo_actividad: 'INSPECCION',
                    orden_ejecucion: 1,
                    es_obligatoria: true,
                    activo: true,
                },
                select: {
                    id_actividad_catalogo: true,
                    codigo_actividad: true,
                },
            });

            console.log(`   🧩 Catálogo: creada actividad "${creada.codigo_actividad}" para tipo ${codigoTipo} (id_tipo_servicio=${tipoId})`);
            actividadBasePorTipo.set(tipoId, creada);
        }

        // 4. Asignar exactamente UNA actividad ejecutada por orden (solo si está en 0)
        console.log('\n📝 Asignando actividades ejecutadas a órdenes sin actividades...');
        let asignadas = 0;

        for (const orden of ordenesSinActividades) {
            const tipoId = orden.id_tipo_servicio;
            if (!tipoId) {
                console.log(`   ⚠️  ${orden.numero_orden}: id_tipo_servicio es NULL. No se puede asignar.`);
                continue;
            }

            const actividad = actividadBasePorTipo.get(tipoId);
            if (!actividad) {
                console.log(`   ⚠️  ${orden.numero_orden}: No se encontró/creó actividad base para id_tipo_servicio=${tipoId}`);
                continue;
            }

            await tx.actividades_ejecutadas.create({
                data: {
                    id_orden_servicio: orden.id_orden_servicio,
                    id_actividad_catalogo: actividad.id_actividad_catalogo,
                    sistema: 'GENERAL',
                    ejecutada: false,
                    fecha_registro: new Date(),
                },
            });

            console.log(`   ✅ ${orden.numero_orden}: Asignada "${actividad.codigo_actividad}"`);
            asignadas++;
        }

        // 5. Verificación post: cada orden target debe quedar con >= 1 actividad
        const verificacion = await tx.actividades_ejecutadas.groupBy({
            by: ['id_orden_servicio'],
            where: {
                id_orden_servicio: { in: ordenesTarget.map((o) => o.id_orden_servicio) },
            },
            _count: { id_actividad_ejecutada: true },
        });

        const mapCount = new Map<number, number>();
        for (const v of verificacion) {
            mapCount.set(v.id_orden_servicio, v._count.id_actividad_ejecutada);
        }

        const ordenesAunEnCero = ordenesTarget.filter((o) => (mapCount.get(o.id_orden_servicio) || 0) === 0);

        console.log(`\n📊 RESUMEN:`);
        console.log(`   Órdenes target: ${ordenesTarget.length}`);
        console.log(`   Órdenes sin actividades (antes): ${ordenesSinActividades.length}`);
        console.log(`   Actividades asignadas: ${asignadas}`);
        console.log(`   Órdenes aún en 0 (después): ${ordenesAunEnCero.length}`);

        if (ordenesAunEnCero.length > 0) {
            console.log('⚠️  Órdenes que quedaron sin actividades (revisar):');
            for (const o of ordenesAunEnCero) {
                console.log(`      - ${o.numero_orden} (id_orden_servicio=${o.id_orden_servicio})`);
            }
        }
    });

    console.log('\n✅ Proceso completado');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
