/**
 * MEKANOS - Habilitación y Saneamiento del BOM de Equipos (Matriz de Repuestos Compatibles)
 *
 * Reutiliza la tabla existente `componentes_equipo` (FK equipos + catalogo_componentes).
 *  1. DDL idempotente: secuencia autoincremental para `id_componente_equipo`
 *  2. Índice único parcial anti-duplicados.
 *  3. Siembra y corrección idempotente de repuestos compatibles homologados:
 *     - AQUANOVA-GEN-1 (Motor Doosan P126TI-II: Cárter 30 L / 7.9 GAL, Filtro Aire, Filtro Aceite)
 *     - GEN-EDIF-JA1MNK (OS-202610-0004)
 *     - GEN-EDIF-T86FEH (OS-202610-0021)
 *     - GEN-CLI-DDQU49
 *
 * Uso: node packages/database/scripts/bom-equipos-setup.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SEED = {
  'AQUANOVA-GEN-1': [
    { id_componente: 9, cat: 'FILTRO_AIRE', label: 'Filtro de Aire', tipo: 1, qty: 1, horas: 500, nota: 'Filtro de Aire primario MANN para motor Doosan' },
    { id_componente: 6, cat: 'FILTRO_ACEITE', label: 'Filtro de Aceite', tipo: 3, qty: 1, horas: 250, nota: 'Filtro de Aceite MANN para motor Doosan' },
    { id_componente: 15, cat: 'LUBRICANTE_MOTOR', label: 'Aceite de Motor', tipo: 11, qty: 7.92, horas: 250, nota: 'Cárter Doosan 30 L (≈ 7.9 GAL), SAE 15W40' },
  ],
  'GEN-CLI-DDQU49': [
    { id_componente: 4, cat: 'FILTRO_ACEITE', label: 'Filtro de Aceite', tipo: 3, qty: 1, horas: 250, nota: 'Filtro de aceite motor Cummins 6BT5.9' },
    { id_componente: 15, cat: 'LUBRICANTE_MOTOR', label: 'Aceite de Motor', tipo: 11, qty: 4.33, horas: 250, nota: 'Cárter 16.4 L (≈ 4.33 gal) SAE 15W40' },
    { id_componente: 10, cat: 'FILTRO_AIRE', label: 'Filtro de Aire', tipo: 1, qty: 1, horas: 500, nota: null },
    { id_componente: 12, cat: 'FILTRO_SEPARADOR_AGUA', label: 'Filtro Separador de Agua', tipo: 4, qty: 1, horas: 500, nota: null },
  ],
  'GEN-EDIF-JA1MNK': [
    { id_componente: 6, cat: 'FILTRO_ACEITE', label: 'Filtro de Aceite', tipo: 3, qty: 1, horas: 250, nota: 'Filtro de Aceite MANN' },
    { id_componente: 15, cat: 'LUBRICANTE_MOTOR', label: 'Aceite de Motor', tipo: 11, qty: 5, horas: 250, nota: 'SAE 15W40' },
    { id_componente: 9, cat: 'FILTRO_AIRE', label: 'Filtro de Aire', tipo: 1, qty: 1, horas: 500, nota: 'Filtro de Aire MANN' },
    { id_componente: 13, cat: 'LUBRICANTE_MOTOR', label: 'Aceite de Motor', tipo: 11, qty: 5, horas: 250, nota: 'Alternativa homologada 15W40' },
  ],
  'GEN-EDIF-T86FEH': [
    { id_componente: 6, cat: 'FILTRO_ACEITE', label: 'Filtro de Aceite', tipo: 3, qty: 1, horas: 250, nota: 'Filtro de Aceite MANN' },
    { id_componente: 15, cat: 'LUBRICANTE_MOTOR', label: 'Aceite de Motor', tipo: 11, qty: 5, horas: 250, nota: 'SAE 15W40' },
    { id_componente: 9, cat: 'FILTRO_AIRE', label: 'Filtro de Aire', tipo: 1, qty: 1, horas: 500, nota: 'Filtro de Aire MANN' },
    { id_componente: 13, cat: 'LUBRICANTE_MOTOR', label: 'Aceite de Motor', tipo: 11, qty: 5, horas: 250, nota: 'Alternativa homologada 15W40' },
  ],
};

async function main() {
  // 1. DDL idempotente
  await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS componentes_equipo_id_componente_equipo_seq`);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE componentes_equipo ALTER COLUMN id_componente_equipo SET DEFAULT nextval('componentes_equipo_id_componente_equipo_seq')`
  );
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE componentes_equipo_id_componente_equipo_seq OWNED BY componentes_equipo.id_componente_equipo`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval('componentes_equipo_id_componente_equipo_seq', GREATEST((SELECT COALESCE(MAX(id_componente_equipo),0) FROM componentes_equipo), 1), true)`
  );
  console.log('✅ Secuencia componentes_equipo sincronizada');

  // 2. Índice único parcial anti-duplicados (equipo + componente activos)
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_componente_equipo_activo ON componentes_equipo (id_equipo, id_componente) WHERE activo IS NOT FALSE AND id_componente IS NOT NULL`
  );
  console.log('✅ Índice único parcial (equipo, componente) activo');

  // 3. Siembra y Saneamiento
  for (const [codigo, items] of Object.entries(SEED)) {
    const eq = await prisma.equipos.findFirst({ where: { codigo_equipo: codigo }, select: { id_equipo: true } });
    if (!eq) { console.log(`⚠️ Equipo ${codigo} no existe, omitido`); continue; }

    for (const it of items) {
      const existe = await prisma.componentes_equipo.findFirst({
        where: { id_equipo: eq.id_equipo, id_componente: it.id_componente, activo: { not: false } },
      });

      if (existe) {
        // Saneamiento de datos si existía con especificaciones desactualizadas o de prueba
        await prisma.componentes_equipo.update({
          where: { id_componente_equipo: existe.id_componente_equipo },
          data: {
            id_tipo_componente: it.tipo,
            posicion_descripcion: it.label,
            unidades_por_cambio: Math.max(1, Math.ceil(it.qty)),
            especificaciones_adicionales: {
              categoria_aplicacion: it.cat,
              cantidad_requerida: it.qty,
              frecuencia_cambio_horas: it.horas,
            },
            notas: it.nota,
            activo: true,
          },
        });
        console.log(`  ~ Saneado BOM ${codigo} <- componente ${it.id_componente} (${it.cat}) [qty: ${it.qty}]`);
      } else {
        await prisma.componentes_equipo.create({
          data: {
            id_equipo: eq.id_equipo,
            id_tipo_componente: it.tipo,
            id_componente: it.id_componente,
            posicion_descripcion: it.label,
            unidades_por_cambio: Math.max(1, Math.ceil(it.qty)),
            especificaciones_adicionales: {
              categoria_aplicacion: it.cat,
              cantidad_requerida: it.qty,
              frecuencia_cambio_horas: it.horas,
            },
            notas: it.nota,
            activo: true,
            creado_por: 1,
          },
        });
        console.log(`  + BOM ${codigo} <- componente ${it.id_componente} (${it.cat}) [qty: ${it.qty}]`);
      }
    }
  }
  console.log('✅ Siembra y saneamiento BOM completados con éxito');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
