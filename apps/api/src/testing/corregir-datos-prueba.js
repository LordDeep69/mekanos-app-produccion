/**
 * Script para corregir datos de prueba para RUTA 9
 * Crea una persona natural para el técnico y actualiza relaciones
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function corregirDatosPrueba() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔧 CORRIGIENDO DATOS DE PRUEBA');
    console.log('═══════════════════════════════════════════════════════');

    try {
        // 1. Crear/actualizar persona natural para el técnico
        console.log('\n1️⃣ Creando persona natural para técnico...');

        let personaTecnico = await prisma.personas.findFirst({
            where: {
                tipo_persona: 'NATURAL',
                primer_nombre: 'Carlos'
            }
        });

        if (!personaTecnico) {
            personaTecnico = await prisma.personas.create({
                data: {
                    tipo_identificacion: 'CC',
                    numero_identificacion: '1234567890',
                    tipo_persona: 'NATURAL',
                    primer_nombre: 'Carlos',
                    segundo_nombre: 'Andrés',
                    primer_apellido: 'Pérez',
                    segundo_apellido: 'García',
                    nombre_completo: 'Carlos Andrés Pérez García',
                    email_principal: 'carlos.tecnico@mekanos.com',
                    telefono_principal: '3001234567',
                    celular: '3001234567',
                    direccion_principal: 'Calle 50 #45-30, Cartagena',
                    ciudad: 'CARTAGENA',
                    departamento: 'BOLÍVAR',
                    pais: 'COLOMBIA',
                    es_empleado: true,
                    activo: true,
                }
            });
            console.log('   ✅ Persona técnico creada:', personaTecnico.id_persona);
        } else {
            console.log('   ℹ️ Persona técnico ya existe:', personaTecnico.id_persona);
        }

        // 2. Actualizar empleado técnico para apuntar a persona natural
        console.log('\n2️⃣ Actualizando empleado técnico...');
        await prisma.empleados.update({
            where: { id_empleado: 1 },
            data: { id_persona: personaTecnico.id_persona }
        });
        console.log('   ✅ Empleado 1 ahora apunta a persona:', personaTecnico.id_persona);

        // 3. Actualizar dirección del cliente
        console.log('\n3️⃣ Actualizando dirección del cliente...');
        await prisma.personas.update({
            where: { id_persona: 2 }, // Empresa Test S.A.S.
            data: {
                direccion_principal: 'Av. Pedro de Heredia, Sector Manga, Cartagena',
                ciudad: 'CARTAGENA',
                departamento: 'BOLÍVAR'
            }
        });
        console.log('   ✅ Cliente actualizado con dirección');

        // 4. Crear/verificar tipo de servicio y asignar a orden
        console.log('\n4️⃣ Verificando tipo de servicio...');
        let tipoServicio = await prisma.tipos_servicio.findFirst({
            where: { codigo: 'PREV_A' }
        });

        if (!tipoServicio) {
            tipoServicio = await prisma.tipos_servicio.create({
                data: {
                    codigo: 'PREV_A',
                    nombre: 'MANTENIMIENTO PREVENTIVO TIPO A',
                    descripcion: 'Mantenimiento preventivo completo',
                    activo: true
                }
            });
            console.log('   ✅ Tipo servicio creado:', tipoServicio.id_tipo_servicio);
        } else {
            console.log('   ℹ️ Tipo servicio existe:', tipoServicio.id_tipo_servicio);
        }

        // 5. Crear nueva orden de prueba con todos los datos
        console.log('\n5️⃣ Creando nueva orden de prueba completa...');

        // Obtener el estado EN_PROCESO
        const estadoEnProceso = await prisma.estados_orden.findFirst({
            where: { codigo_estado: 'EN_PROCESO' }
        });

        const nuevaOrden = await prisma.ordenes_servicio.create({
            data: {
                numero_orden: 'OS-TEST-COMPLETA-001',
                id_cliente: 1,
                id_equipo: 1,
                id_tipo_servicio: tipoServicio.id_tipo_servicio,
                id_tecnico_asignado: 1,
                id_estado: estadoEnProceso.id_estado,
                fecha_programada: new Date(),
                prioridad: 'MEDIA',
                es_recurrente: false,
                creado_por: 1,
            }
        });
        console.log('   ✅ Nueva orden creada:', nuevaOrden.id_orden_servicio, '-', nuevaOrden.numero_orden);

        // 6. Verificar resultado
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ DATOS CORREGIDOS');
        console.log('═══════════════════════════════════════════════════════');

        const ordenVerificada = await prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: nuevaOrden.id_orden_servicio },
            include: {
                cliente: { include: { persona: true } },
                equipo: { include: { tipo_equipo: true } },
                tecnico: { include: { persona: true } },
                tipo_servicio: true,
            }
        });

        console.log('\nNueva orden:', ordenVerificada.numero_orden);
        console.log('Cliente:', ordenVerificada.cliente?.persona?.razon_social);
        console.log('Dirección:', ordenVerificada.cliente?.persona?.direccion_principal);
        console.log('Equipo:', ordenVerificada.equipo?.nombre_equipo);
        console.log('Serie:', ordenVerificada.equipo?.numero_serie_equipo);
        console.log('Técnico:', `${ordenVerificada.tecnico?.persona?.primer_nombre} ${ordenVerificada.tecnico?.persona?.primer_apellido}`);
        console.log('Tipo Servicio:', ordenVerificada.tipo_servicio?.nombre);

        console.log('\n⚠️ IMPORTANTE: Sincroniza datos en la app móvil para ver la nueva orden.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

corregirDatosPrueba();
