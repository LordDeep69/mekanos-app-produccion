/**
 * AJUSTE DE ACTIVIDADES MANTENIMIENTO TIPO A
 * ===========================================
 * Corrige las opciones de respuesta de actividades según su lógica:
 * 1. Actividades de nivel/porcentaje → Agregar opción "OTRO VALOR"
 * 2. Actividades incorrectas con porcentaje → Cambiar a B/M/C/NA
 * 3. Actividades SÍ/NO → Cambiar opciones correctas
 * 
 * Ejecutar: npx ts-node packages/database/ajustar-actividades-tipo-a.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['warn', 'error'],
});

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
    const icons = { info: '📋', success: '✅', error: '❌', warn: '⚠️' };
    console.log(`${icons[type]} ${message}`);
}

function separator(title?: string) {
    console.log('\n' + '═'.repeat(70));
    if (title) console.log(`  ${title}`);
    console.log('═'.repeat(70));
}

async function main() {
    try {
        separator('ANÁLISIS Y AJUSTE DE ACTIVIDADES TIPO A');

        // 1. Obtener ID del tipo de servicio GEN_PREV_A
        const tipoServicio = await prisma.tipos_servicio.findFirst({
            where: { codigo_tipo: 'GEN_PREV_A' }
        });

        if (!tipoServicio) {
            log('No se encontró el tipo de servicio GEN_PREV_A', 'error');
            return;
        }

        log(`Tipo de servicio encontrado: ${tipoServicio.nombre_tipo} (ID: ${tipoServicio.id_tipo_servicio})`, 'success');

        // 2. Obtener todas las actividades del Tipo A
        const actividades = await prisma.catalogo_actividades.findMany({
            where: {
                id_tipo_servicio: tipoServicio.id_tipo_servicio,
                activo: true
            },
            orderBy: { orden_ejecucion: 'asc' }
        });

        log(`Total de actividades encontradas: ${actividades.length}`, 'info');

        separator('PASO 1: ACTIVIDADES DE NIVEL/PORCENTAJE - AGREGAR "OTRO VALOR"');

        // Actividades que deben tener opción "OTRO VALOR" para niveles/porcentajes
        const actividadesNivel = [
            'REVISAR NIVEL DE COMBUSTIBLE',
            'REVISAR NIVEL DE ACEITE',
        ];

        for (const descripcion of actividadesNivel) {
            const actividad = actividades.find(a =>
                a.descripcion_actividad.toUpperCase().includes(descripcion)
            );

            if (actividad && actividad.tipo_actividad === 'INSPECCION') {
                log(`\nAnalizando: ${actividad.descripcion_actividad}`, 'info');
                log(`  Tipo actual: ${actividad.tipo_actividad}`, 'info');

                // Cambiar a tipo MEDICION para que tenga opciones de nivel
                await prisma.catalogo_actividades.update({
                    where: { id_actividad_catalogo: actividad.id_actividad_catalogo },
                    data: {
                        tipo_actividad: 'MEDICION',
                        observaciones: 'Ajustado: Cambio a MEDICION para permitir ingreso de valores de nivel/porcentaje'
                    }
                });

                log(`  ✓ Cambiado a tipo MEDICION (permite valores numéricos)`, 'success');
            }
        }

        separator('PASO 2: ACTIVIDADES INCORRECTAS CON PORCENTAJE → B/M/C/NA');

        // Actividades que deben ser INSPECCION (B/M/C/NA) no MEDICION
        const actividadesInspeccion = [
            'REVISAR TANQUE DE COMBUSTIBLE',
            'REVISAR ELECTROLITOS DE BATERÍA',
            'REVISAR ELECTROLITOS DE BATERIA',
            'REVISAR SISTEMA DE CARGA DE BATERÍAS',
            'REVISAR SISTEMA DE CARGA DE BATERIAS',
            'REVISAR CARGADOR DE BATERÍA',
            'REVISAR CARGADOR DE BATERIA',
        ];

        for (const descripcion of actividadesInspeccion) {
            const actividad = actividades.find(a =>
                a.descripcion_actividad.toUpperCase().includes(descripcion.toUpperCase())
            );

            if (actividad) {
                log(`\nAnalizando: ${actividad.descripcion_actividad}`, 'info');
                log(`  Tipo actual: ${actividad.tipo_actividad}`, 'info');

                if (actividad.tipo_actividad === 'MEDICION') {
                    await prisma.catalogo_actividades.update({
                        where: { id_actividad_catalogo: actividad.id_actividad_catalogo },
                        data: {
                            tipo_actividad: 'INSPECCION',
                            id_parametro_medicion: null, // Eliminar vinculación con parámetro
                            observaciones: 'Ajustado: Cambio a INSPECCION para opciones B/M/C/NA (no requiere valores numéricos)'
                        }
                    });

                    log(`  ✓ Cambiado a tipo INSPECCION (B/M/C/NA)`, 'success');
                } else {
                    log(`  ✓ Ya es tipo INSPECCION`, 'success');
                }
            }
        }

        separator('PASO 3: ACTIVIDADES SÍ/NO → OPCIONES CORRECTAS');

        // Actividades que son preguntas SÍ/NO
        const actividadesSiNo = [
            'EL EQUIPO REQUIERE PINTURA',
            'EL EQUIPO CUENTA CON CARGADOR DE BATERÍA',
            'EL EQUIPO CUENTA CON CARGADOR DE BATERIA',
            'EL CUARTO DE MÁQUINAS CUENTA CON BOMBA DE TRASIEGO',
            'EL CUARTO DE MAQUINAS CUENTA CON BOMBA DE TRASIEGO',
            'EL CUARTO DE MÁQUINAS SE ENCUENTRA ASEADO Y ORDENADO',
            'EL CUARTO DE MAQUINAS SE ENCUENTRA ASEADO Y ORDENADO',
            'EL CUARTO DE MÁQUINAS CUENTA CON BUENA ILUMINACIÓN',
            'EL CUARTO DE MAQUINAS CUENTA CON BUENA ILUMINACION',
        ];

        for (const descripcion of actividadesSiNo) {
            const actividad = actividades.find(a =>
                a.descripcion_actividad.toUpperCase().includes(descripcion.toUpperCase())
            );

            if (actividad) {
                log(`\nAnalizando: ${actividad.descripcion_actividad}`, 'info');
                log(`  Tipo actual: ${actividad.tipo_actividad}`, 'info');

                // Cambiar a tipo VERIFICACION para preguntas SÍ/NO
                if (actividad.tipo_actividad !== 'VERIFICACION') {
                    await prisma.catalogo_actividades.update({
                        where: { id_actividad_catalogo: actividad.id_actividad_catalogo },
                        data: {
                            tipo_actividad: 'VERIFICACION',
                            id_parametro_medicion: null,
                            observaciones: 'Ajustado: Cambio a VERIFICACION para opciones SÍ/NO'
                        }
                    });

                    log(`  ✓ Cambiado a tipo VERIFICACION (SÍ/NO)`, 'success');
                } else {
                    log(`  ✓ Ya es tipo VERIFICACION`, 'success');
                }
            }
        }

        separator('RESUMEN DE CAMBIOS');

        // Contar actividades por tipo después de los cambios
        const actividadesActualizadas = await prisma.catalogo_actividades.findMany({
            where: {
                id_tipo_servicio: tipoServicio.id_tipo_servicio,
                activo: true
            }
        });

        const conteo = {
            INSPECCION: actividadesActualizadas.filter(a => a.tipo_actividad === 'INSPECCION').length,
            MEDICION: actividadesActualizadas.filter(a => a.tipo_actividad === 'MEDICION').length,
            VERIFICACION: actividadesActualizadas.filter(a => a.tipo_actividad === 'VERIFICACION').length,
            CAMBIO: actividadesActualizadas.filter(a => a.tipo_actividad === 'CAMBIO').length,
            LIMPIEZA: actividadesActualizadas.filter(a => a.tipo_actividad === 'LIMPIEZA').length,
            LUBRICACION: actividadesActualizadas.filter(a => a.tipo_actividad === 'LUBRICACION').length,
            AJUSTE: actividadesActualizadas.filter(a => a.tipo_actividad === 'AJUSTE').length,
            PRUEBA: actividadesActualizadas.filter(a => a.tipo_actividad === 'PRUEBA').length,
        };

        log('\nDistribución de actividades por tipo:', 'info');
        log(`  INSPECCION (B/M/C/NA):        ${conteo.INSPECCION}`, 'info');
        log(`  MEDICION (Valores numéricos): ${conteo.MEDICION}`, 'info');
        log(`  VERIFICACION (SÍ/NO):         ${conteo.VERIFICACION}`, 'info');
        log(`  CAMBIO:                        ${conteo.CAMBIO}`, 'info');
        log(`  LIMPIEZA:                      ${conteo.LIMPIEZA}`, 'info');
        log(`  LUBRICACION:                   ${conteo.LUBRICACION}`, 'info');
        log(`  AJUSTE:                        ${conteo.AJUSTE}`, 'info');
        log(`  PRUEBA:                        ${conteo.PRUEBA}`, 'info');

        separator('PROCESO COMPLETADO EXITOSAMENTE');
        log('Todos los ajustes han sido aplicados correctamente', 'success');

    } catch (error) {
        log(`Error en el proceso: ${error}`, 'error');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
