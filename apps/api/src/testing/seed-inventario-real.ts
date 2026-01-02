// ═══════════════════════════════════════════════════════════════════════════════
// SEED INVENTARIO REAL - DATOS LOGÍSTICOS MEKANOS
// ═══════════════════════════════════════════════════════════════════════════════
// Crea:
// - 20 referencias de componentes reales (filtros, aceites, correas, etc.)
// - Ubicaciones de bodega
// - Movimientos iniciales de entrada para stock positivo
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:3000/api';

async function apiCall(
    method: string,
    endpoint: string,
    body?: any,
): Promise<{ status: number; data: any }> {
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json().catch(() => ({}));

    return { status: response.status, data };
}

// ─────────────────────────────────────────────────────────────────────────────
// UBICACIONES DE BODEGA
// ─────────────────────────────────────────────────────────────────────────────

const UBICACIONES = [
    { codigo_ubicacion: 'A-01-01', zona: 'FILTROS', pasillo: 'A', estante: '01', nivel: '01' },
    { codigo_ubicacion: 'A-01-02', zona: 'FILTROS', pasillo: 'A', estante: '01', nivel: '02' },
    { codigo_ubicacion: 'A-01-03', zona: 'FILTROS', pasillo: 'A', estante: '01', nivel: '03' },
    { codigo_ubicacion: 'A-02-01', zona: 'FILTROS', pasillo: 'A', estante: '02', nivel: '01' },
    { codigo_ubicacion: 'B-01-01', zona: 'LUBRICANTES', pasillo: 'B', estante: '01', nivel: '01' },
    { codigo_ubicacion: 'B-01-02', zona: 'LUBRICANTES', pasillo: 'B', estante: '01', nivel: '02' },
    { codigo_ubicacion: 'B-02-01', zona: 'LUBRICANTES', pasillo: 'B', estante: '02', nivel: '01' },
    { codigo_ubicacion: 'C-01-01', zona: 'CORREAS', pasillo: 'C', estante: '01', nivel: '01' },
    { codigo_ubicacion: 'C-01-02', zona: 'CORREAS', pasillo: 'C', estante: '01', nivel: '02' },
    { codigo_ubicacion: 'D-01-01', zona: 'BATERIAS', pasillo: 'D', estante: '01', nivel: '01' },
    { codigo_ubicacion: 'E-01-01', zona: 'REPUESTOS', pasillo: 'E', estante: '01', nivel: '01' },
    { codigo_ubicacion: 'E-02-01', zona: 'REPUESTOS', pasillo: 'E', estante: '02', nivel: '01' },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES REALES (20 REFERENCIAS)
// ─────────────────────────────────────────────────────────────────────────────

const COMPONENTES = [
    // FILTROS DE ACEITE
    {
        referencia_fabricante: '1R-0719',
        marca: 'CAT',
        descripcion_corta: 'Filtro de Aceite CAT',
        tipo: 'FILTRO',
        precio_compra: 85000,
        precio_venta: 120000,
        stock_inicial: 15,
        stock_minimo: 5,
    },
    {
        referencia_fabricante: 'W719/45',
        marca: 'MANN',
        descripcion_corta: 'Filtro de Aceite MANN',
        tipo: 'FILTRO',
        precio_compra: 45000,
        precio_venta: 65000,
        stock_inicial: 20,
        stock_minimo: 8,
    },
    {
        referencia_fabricante: 'LF3000',
        marca: 'FLEETGUARD',
        descripcion_corta: 'Filtro de Aceite Fleetguard',
        tipo: 'FILTRO',
        precio_compra: 55000,
        precio_venta: 78000,
        stock_inicial: 12,
        stock_minimo: 5,
    },
    // FILTROS DE AIRE
    {
        referencia_fabricante: '6I-2503',
        marca: 'CAT',
        descripcion_corta: 'Filtro de Aire Primario CAT',
        tipo: 'FILTRO',
        precio_compra: 180000,
        precio_venta: 250000,
        stock_inicial: 8,
        stock_minimo: 3,
    },
    {
        referencia_fabricante: 'C30810',
        marca: 'MANN',
        descripcion_corta: 'Filtro de Aire MANN',
        tipo: 'FILTRO',
        precio_compra: 95000,
        precio_venta: 135000,
        stock_inicial: 10,
        stock_minimo: 4,
    },
    {
        referencia_fabricante: 'AF25550',
        marca: 'FLEETGUARD',
        descripcion_corta: 'Filtro de Aire Fleetguard',
        tipo: 'FILTRO',
        precio_compra: 88000,
        precio_venta: 125000,
        stock_inicial: 6,
        stock_minimo: 3,
    },
    // FILTROS DE COMBUSTIBLE
    {
        referencia_fabricante: '1R-0749',
        marca: 'CAT',
        descripcion_corta: 'Filtro de Combustible CAT',
        tipo: 'FILTRO',
        precio_compra: 95000,
        precio_venta: 135000,
        stock_inicial: 18,
        stock_minimo: 6,
    },
    {
        referencia_fabricante: 'FS19732',
        marca: 'FLEETGUARD',
        descripcion_corta: 'Separador Agua/Combustible',
        tipo: 'FILTRO',
        precio_compra: 120000,
        precio_venta: 168000,
        stock_inicial: 10,
        stock_minimo: 4,
    },
    // ACEITES
    {
        referencia_fabricante: 'RIMULA-R4-15W40',
        marca: 'SHELL',
        descripcion_corta: 'Aceite Shell Rimula R4 15W40 (Galón)',
        tipo: 'LUBRICANTE',
        precio_compra: 85000,
        precio_venta: 110000,
        stock_inicial: 50,
        stock_minimo: 20,
    },
    {
        referencia_fabricante: 'DELVAC-MX-15W40',
        marca: 'MOBIL',
        descripcion_corta: 'Aceite Mobil Delvac MX 15W40 (Galón)',
        tipo: 'LUBRICANTE',
        precio_compra: 92000,
        precio_venta: 120000,
        stock_inicial: 40,
        stock_minimo: 15,
    },
    {
        referencia_fabricante: 'DEO-ULE-15W40',
        marca: 'CAT',
        descripcion_corta: 'Aceite CAT DEO ULE 15W40 (Galón)',
        tipo: 'LUBRICANTE',
        precio_compra: 145000,
        precio_venta: 195000,
        stock_inicial: 25,
        stock_minimo: 10,
    },
    {
        referencia_fabricante: 'TELLUS-S2-46',
        marca: 'SHELL',
        descripcion_corta: 'Aceite Hidráulico Shell Tellus S2 46 (Galón)',
        tipo: 'LUBRICANTE',
        precio_compra: 78000,
        precio_venta: 105000,
        stock_inicial: 30,
        stock_minimo: 12,
    },
    // CORREAS
    {
        referencia_fabricante: '7M-7456',
        marca: 'CAT',
        descripcion_corta: 'Correa Alternador CAT',
        tipo: 'CORREA',
        precio_compra: 125000,
        precio_venta: 175000,
        stock_inicial: 5,
        stock_minimo: 2,
    },
    {
        referencia_fabricante: '6PK2120',
        marca: 'GATES',
        descripcion_corta: 'Correa Poly-V Gates',
        tipo: 'CORREA',
        precio_compra: 65000,
        precio_venta: 95000,
        stock_inicial: 8,
        stock_minimo: 3,
    },
    {
        referencia_fabricante: 'AVX13X1500',
        marca: 'DAYCO',
        descripcion_corta: 'Correa Trapecial Dayco',
        tipo: 'CORREA',
        precio_compra: 35000,
        precio_venta: 55000,
        stock_inicial: 12,
        stock_minimo: 5,
    },
    // BATERÍAS
    {
        referencia_fabricante: '4C-4205',
        marca: 'CAT',
        descripcion_corta: 'Batería 12V 200Ah CAT',
        tipo: 'BATERIA',
        precio_compra: 850000,
        precio_venta: 1150000,
        stock_inicial: 4,
        stock_minimo: 2,
    },
    {
        referencia_fabricante: 'N200-MF',
        marca: 'WILLARD',
        descripcion_corta: 'Batería 12V 200Ah Willard',
        tipo: 'BATERIA',
        precio_compra: 680000,
        precio_venta: 920000,
        stock_inicial: 6,
        stock_minimo: 2,
    },
    // REPUESTOS VARIOS
    {
        referencia_fabricante: '0445120231',
        marca: 'BOSCH',
        descripcion_corta: 'Inyector Common Rail Bosch',
        tipo: 'INYECTOR',
        precio_compra: 1250000,
        precio_venta: 1650000,
        stock_inicial: 4,
        stock_minimo: 2,
    },
    {
        referencia_fabricante: '3406-WP',
        marca: 'CAT',
        descripcion_corta: 'Bomba de Agua CAT 3406',
        tipo: 'BOMBA',
        precio_compra: 2800000,
        precio_venta: 3600000,
        stock_inicial: 2,
        stock_minimo: 1,
    },
    {
        referencia_fabricante: 'RE546336',
        marca: 'JOHN DEERE',
        descripcion_corta: 'Filtro Hidráulico John Deere',
        tipo: 'FILTRO',
        precio_compra: 185000,
        precio_venta: 255000,
        stock_inicial: 6,
        stock_minimo: 2,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   📦 SEED INVENTARIO REAL - MEKANOS S.A.S                    ║');
    console.log('║   Fecha: ' + new Date().toLocaleString().padEnd(45) + '║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    try {
        // Verificar servidor
        const { status } = await apiCall('GET', '/health').catch(() => ({ status: 0, data: {} }));
        if (status !== 200) {
            throw new Error('Servidor no disponible. Ejecuta: pnpm run dev');
        }
        console.log('\n✅ Servidor conectado');

        // ─────────────────────────────────────────────────────────────────────────
        // PASO 1: CREAR UBICACIONES
        // ─────────────────────────────────────────────────────────────────────────
        console.log('\n📍 Creando ubicaciones de bodega...');
        let ubicacionesCreadas = 0;

        for (const ub of UBICACIONES) {
            const { status } = await apiCall('POST', '/ubicaciones-bodega', ub);
            if (status === 201) {
                ubicacionesCreadas++;
                console.log(`   ✅ ${ub.codigo_ubicacion} (${ub.zona})`);
            } else if (status === 409) {
                console.log(`   ⏭️  ${ub.codigo_ubicacion} ya existe`);
            } else {
                console.log(`   ❌ ${ub.codigo_ubicacion} - Error ${status}`);
            }
        }
        console.log(`   Total: ${ubicacionesCreadas} ubicaciones nuevas`);

        // ─────────────────────────────────────────────────────────────────────────
        // PASO 2: OBTENER O CREAR TIPO DE COMPONENTE
        // ─────────────────────────────────────────────────────────────────────────
        console.log('\n🏷️  Verificando tipos de componente...');
        const { data: tiposExistentes } = await apiCall('GET', '/tipos-componente');

        let tipoDefault: number;
        if (tiposExistentes?.length > 0) {
            tipoDefault = tiposExistentes[0].id_tipo_componente;
            console.log(`   Usando tipo existente: ${tiposExistentes[0].nombre_componente} (ID: ${tipoDefault})`);
        } else {
            // Crear tipo genérico
            const { data: nuevoTipo } = await apiCall('POST', '/tipos-componente', {
                codigo_tipo: 'REP-GEN',
                nombre_componente: 'Repuesto General',
                descripcion: 'Categoría general de repuestos',
                activo: true,
            });
            tipoDefault = nuevoTipo?.id_tipo_componente || 1;
            console.log(`   Creado tipo: Repuesto General (ID: ${tipoDefault})`);
        }

        // ─────────────────────────────────────────────────────────────────────────
        // PASO 3: CREAR COMPONENTES CON STOCK INICIAL
        // ─────────────────────────────────────────────────────────────────────────
        console.log('\n📦 Creando componentes y stock inicial...');
        let componentesCreados = 0;
        let entradasCreadas = 0;

        for (const comp of COMPONENTES) {
            // Crear componente
            const { status, data } = await apiCall('POST', '/catalogo-componentes', {
                id_tipo_componente: tipoDefault,
                referencia_fabricante: comp.referencia_fabricante,
                marca: comp.marca,
                descripcion_corta: comp.descripcion_corta,
                precio_compra: comp.precio_compra,
                precio_venta: comp.precio_venta,
                stock_minimo: comp.stock_minimo,
                stock_actual: 0, // Empezamos en 0, el stock se agrega via movimientos
                unidad_medida: comp.tipo === 'LUBRICANTE' ? 'GALON' : 'UNIDAD',
                es_inventariable: true,
                activo: true,
            });

            if (status === 201 || status === 200) {
                componentesCreados++;
                const idComponente = data?.id_componente;
                console.log(`   ✅ ${comp.referencia_fabricante} - ${comp.marca} (ID: ${idComponente})`);

                // Crear entrada inicial
                if (idComponente) {
                    const { status: statusEntrada } = await apiCall('POST', '/inventario/entrada', {
                        id_componente: idComponente,
                        cantidad: comp.stock_inicial,
                        costo_unitario: comp.precio_compra,
                        observaciones: 'SEED: Inventario inicial',
                        realizado_por: 1,
                    });

                    if (statusEntrada === 201) {
                        entradasCreadas++;
                        console.log(`      📥 Entrada: ${comp.stock_inicial} unidades @ $${comp.precio_compra.toLocaleString()}`);
                    }
                }
            } else if (status === 409) {
                console.log(`   ⏭️  ${comp.referencia_fabricante} ya existe`);
            } else {
                console.log(`   ❌ ${comp.referencia_fabricante} - Error ${status}`);
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // RESUMEN FINAL
        // ─────────────────────────────────────────────────────────────────────────
        console.log('\n╔═══════════════════════════════════════════════════════════════╗');
        console.log('║                    📋 RESUMEN SEED                            ║');
        console.log('╠═══════════════════════════════════════════════════════════════╣');
        console.log(`║ 📍 Ubicaciones creadas:    ${ubicacionesCreadas.toString().padStart(3)}                              ║`);
        console.log(`║ 📦 Componentes creados:    ${componentesCreados.toString().padStart(3)}                              ║`);
        console.log(`║ 📥 Entradas registradas:   ${entradasCreadas.toString().padStart(3)}                              ║`);
        console.log('╠═══════════════════════════════════════════════════════════════╣');

        // Obtener valor total
        const { data: dashboard } = await apiCall('GET', '/inventario/dashboard');
        const valorTotal = dashboard?.kpis?.valor_inventario || 0;
        const totalItems = dashboard?.kpis?.total_items || 0;

        console.log(`║ 💰 Valor Total Inventario: $${valorTotal.toLocaleString().padStart(15)}         ║`);
        console.log(`║ 📊 Total Items en Sistema: ${totalItems.toString().padStart(3)}                              ║`);
        console.log('╚═══════════════════════════════════════════════════════════════╝');

        console.log('\n🎉 SEED COMPLETADO - Inventario listo para pruebas');

    } catch (error) {
        console.error('\n❌ ERROR:', error);
        process.exit(1);
    }
}

main();
