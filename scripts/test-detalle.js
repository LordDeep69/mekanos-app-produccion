const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getDetalleComponente(idComponente) {
  try {
    const componente = await prisma.catalogo_componentes.findUnique({
      where: { id_componente: idComponente },
      include: {
        tipos_componente: true,
        categorias_componente: true,
        proveedores: {
          include: {
            persona: {
              select: {
                razon_social: true,
                nombre_completo: true,
                numero_identificacion: true,
                email_principal: true,
                telefono_principal: true,
                celular: true,
              },
            },
          },
        },
        lotes_componentes: {
          where: { cantidad_actual: { gt: 0 } },
          orderBy: { fecha_ingreso: 'desc' },
        },
      },
    });

    if (!componente) {
      console.log(`Componente ${idComponente} no encontrado`);
      return;
    }

    const stockActual = componente.stock_actual || 0;
    const stockMinimo = componente.stock_minimo || 0;
    let estadoStock = 'OK';
    if (stockActual === 0) estadoStock = 'AGOTADO';
    else if (stockActual <= stockMinimo * 0.5 && stockMinimo > 0) estadoStock = 'CRITICO';
    else if (stockActual <= stockMinimo && stockMinimo > 0) estadoStock = 'BAJO';

    const precioCompra = componente.precio_compra ? Number(componente.precio_compra) : 0;
    const valorStock = stockActual * precioCompra;

    const [totalMovimientos, ultimosMovimientos] = await Promise.all([
      prisma.movimientos_inventario.count({ where: { id_componente: idComponente } }),
      prisma.movimientos_inventario.findMany({
        where: { id_componente: idComponente },
        orderBy: { fecha_movimiento: 'desc' },
        take: 10,
        include: {
          ubicaciones_bodega: { select: { id_ubicacion: true, codigo_ubicacion: true, zona: true } },
          lotes_componentes: { select: { id_lote: true, codigo_lote: true } },
        },
      }),
    ]);

    const comp = componente;

    const res = {
      id_componente: componente.id_componente,
      codigo_interno: componente.codigo_interno || `ART-${componente.id_componente}`,
      referencia_fabricante: componente.referencia_fabricante,
      descripcion_corta: componente.descripcion_corta,
      descripcion_detallada: componente.descripcion_detallada,
      marca: componente.marca,
      activo: componente.activo,

      tipo: {
        id: comp.tipos_componente?.id_tipo_componente,
        nombre: comp.tipos_componente?.nombre_tipo || comp.tipos_componente?.nombre_componente || 'General',
        codigo: comp.tipos_componente?.codigo_tipo,
      },
      categoria: {
        id: comp.categorias_componente?.id_categoria,
        nombre: comp.categorias_componente?.nombre_categoria || 'Sin Categoría',
        codigo: comp.categorias_componente?.codigo_categoria,
      },

      especificaciones_tecnicas: componente.especificaciones_tecnicas,
      unidad_medida: componente.unidad_medida || 'UND',
      observaciones: componente.observaciones,

      stock: {
        actual: stockActual,
        minimo: stockMinimo,
        estado: estadoStock,
        valor_total: valorStock,
        es_inventariable: componente.es_inventariable,
      },

      precios: {
        compra: precioCompra,
        venta: componente.precio_venta ? Number(componente.precio_venta) : null,
        moneda: componente.moneda || 'COP',
      },

      proveedor: comp.proveedores ? {
        id: comp.proveedores.id_proveedor,
        nombre: comp.proveedores.persona?.razon_social || comp.proveedores.persona?.nombre_completo,
        nit: comp.proveedores.persona?.numero_identificacion,
        telefono: comp.proveedores.persona?.telefono_principal || comp.proveedores.persona?.celular,
        email: comp.proveedores.persona?.email_principal,
      } : null,

      lotes_activos: (componente.lotes_componentes || []).map((l) => ({
        id_lote: l.id_lote,
        codigo_lote: l.codigo_lote,
        numero_lote_fabricante: l.numero_factura_proveedor,
        cantidad_inicial: Number(l.cantidad_inicial),
        cantidad_actual: Number(l.cantidad_actual),
        fecha_vencimiento: l.fecha_vencimiento,
        estado_lote: l.estado_lote,
        fecha_ingreso: l.fecha_ingreso,
      })),

      ultimos_movimientos: ultimosMovimientos.map((m) => ({
        id_movimiento: m.id_movimiento,
        fecha: m.fecha_movimiento,
        tipo: m.tipo_movimiento,
        origen: m.origen_movimiento,
        cantidad: Number(m.cantidad),
        costo_unitario: m.costo_unitario ? Number(m.costo_unitario) : null,
        bodega: m.ubicaciones_bodega?.codigo_ubicacion || 'BOD-CENTRAL',
        lote: m.lotes_componentes?.codigo_lote || '--',
        justificacion: m.justificacion,
        realizado_por: m.usuarios_movimientos_inventario_realizado_porTousuarios?.persona
          ? `${m.usuarios_movimientos_inventario_realizado_porTousuarios.persona.primer_nombre} ${m.usuarios_movimientos_inventario_realizado_porTousuarios.persona.primer_apellido}`
          : 'Administrador del Sistema',
      })),

      metricas: {
        total_movimientos: totalMovimientos,
      },

      auditoria: {
        fecha_creacion: componente.fecha_creacion,
        creado_por: 'Administrador del Sistema',
        fecha_modificacion: componente.fecha_modificacion,
        modificado_por: 'Administrador del Sistema',
      },
    };
    console.log('SUCCESS for component', idComponente, res);
  } catch (err) {
    console.error('ERROR in getDetalleComponente:', err);
  } finally {
    await prisma.$disconnect();
  }
}

getDetalleComponente(2);
