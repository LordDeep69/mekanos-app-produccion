/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  GEOCODIFICACIÓN DE UBICACIONES DE CLIENTES — MEKANOS S.A.S.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Propósito: llenar masivamente, cliente por cliente:
 *   • personas.url_ubicacion      → URL de Google Maps (varchar 500)
 *   • personas.direccion_principal → dirección formateada (varchar 300)
 *
 * Arquitectura en DOS FASES (del planteamiento original, endurecida):
 *
 *   FASE 1 — CONSULTAR (dry-run, NO ESCRIBE NADA)
 *       Recorre los clientes, consulta al proveedor de geocodificación y
 *       construye un PLAN con la acción propuesta por registro.
 *       El plan se guarda en disco (JSON) y se muestra en pantalla.
 *
 *   FASE 2 — APLICAR
 *       Toma el plan YA REVISADO y lo escribe en una sola transacción.
 *       Garantiza que lo que viste en la Fase 1 es exactamente lo que se
 *       escribe. Si el plan no existe o está vencido, no hace nada.
 *
 * Proveedores:
 *   --proveedor nominatim  (por defecto) Libre, sin API key. Ideal para piloto.
 *   --proveedor google      Requiere GOOGLE_MAPS_API_KEY. Recomendado para el
 *                           lote completo (Nominatim prohíbe el geocoding masivo).
 *
 * La URL guardada SIEMPRE abre en Google Maps, sin importar el proveedor.
 *
 * ── USO ──────────────────────────────────────────────────────────────────
 *   # Piloto: UN solo cliente, solo consulta (no escribe)
 *   node src/testing/geocodificar-ubicaciones-clientes.js --cliente 45
 *
 *   # Revisar el plan y aplicarlo
 *   node src/testing/geocodificar-ubicaciones-clientes.js --aplicar
 *
 *   # Lote completo (sin --cliente)
 *   node src/testing/geocodificar-ubicaciones-clientes.js
 *
 *   # Forzar re-geocodificación de quienes ya tienen URL
 *   node src/testing/geocodificar-ubicaciones-clientes.js --sobrescribir
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ['error'] });

// ── CLI ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opt = (nombre, defecto = null) => {
  const i = args.indexOf(nombre);
  return i !== -1 && args[i + 1] ? args[i + 1] : defecto;
};
const tiene = (nombre) => args.includes(nombre);

const OPTS = {
  cliente: opt('--cliente'),            // id_cliente para piloto
  proveedor: (opt('--proveedor') || 'nominatim').toLowerCase(),
  aplicar: tiene('--aplicar'),          // Fase 2
  sobrescribir: tiene('--sobrescribir'), // pisa valores existentes
  plan: opt('--plan', path.join(__dirname, 'plan-geocodificacion.json')),
  limite: Number(opt('--limite', 0)) || 0,
};

const USER_AGENT = 'MekanosDev-Geocoder/1.0 (soporte@mekanos.com.co)';

/** Pausa para respetar el rate-limit de 1 req/s de Nominatim. */
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// ── CONSTRUCCIÓN DE LA CONSULTA ──────────────────────────────────────────
/**
 * Sesga la búsqueda con los datos que ya existen en personas.
 * Buscar solo el nombre devuelve con facilidad el negocio equivocado.
 */
function construirConsulta(persona) {
  const nombre = (persona.razon_social || persona.nombre_comercial || '').trim();
  const direccion = (persona.direccion_principal || '').trim();

  // La dirección es mucho más fiable que el nombre para geocodificar:
  // `direccion_principal` casi siempre contiene una calle real.
  const partes = [];
  if (nombre) partes.push(nombre);
  if (direccion && direccion.length >= 8) partes.push(direccion);
  if (persona.ciudad) partes.push(persona.ciudad);
  if (persona.departamento) partes.push(persona.departamento);
  if (persona.pais) partes.push(persona.pais);

  return { nombre, direccion, consulta: partes.filter(Boolean).join(', ') };
}

/** Construye la URL de Google Maps a partir de coordenadas. Sin API key. */
function urlGoogleMaps(lat, lon, etiqueta) {
  const coords = `${Number(lat).toFixed(6)},${Number(lon).toFixed(6)}`;
  // Esquema oficial de URL de Google Maps: abre un pin en las coordenadas.
  return `https://www.google.com/maps/search/?api=1&query=${coords}`;
}

// ── PROVEEDOR: NOMINATIM (OpenStreetMap) ─────────────────────────────────
async function geocodificarNominatim(consulta) {
  const url =
    'https://nominatim.openstreetmap.org/search' +
    `?q=${encodeURIComponent(consulta)}` +
    '&format=jsonv2&limit=1&addressdetails=1';

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'es' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

  const datos = await res.json();
  if (!Array.isArray(datos) || datos.length === 0) {
    return { encontrado: false, motivo: 'Sin resultados' };
  }

  const r = datos[0];
  return {
    encontrado: true,
    proveedor: 'nominatim',
    lat: Number(r.lat),
    lon: Number(r.lon),
    // 'importance' va de ~0 a 1; es el mejor indicador de confianza que expone.
    confianza: Number(r.importance ?? 0),
    coincidencia: r.display_name || '',
    // Nominatim NO devuelve dirección formateada normalizada como Google.
    direccionFormateada: r.display_name || '',
  };
}

// ── PROVEEDOR: GOOGLE PLACES (New) TEXT SEARCH ───────────────────────────
async function geocodificarGoogle(consulta) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Falta GOOGLE_MAPS_API_KEY en apps/api/.env. ' +
        'Conseguir la key y habilitar "Places API (New)" en Google Cloud Console.',
    );
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.displayName',
        'places.formattedAddress',
        'places.googleMapsUri',
        'places.location',
        'places.confidence',
        'places.businessStatus',
      ].join(','),
    },
    body: JSON.stringify({ textQuery: consulta, languageCode: 'es', regionCode: 'CO' }),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const cuerpo = await res.text();
    throw new Error(`Google Places HTTP ${res.status}: ${cuerpo.slice(0, 300)}`);
  }

  const datos = await res.json();
  const p = datos.places?.[0];
  if (!p) return { encontrado: false, motivo: 'Sin resultados' };

  return {
    encontrado: true,
    proveedor: 'google',
    lat: p.location?.latitude,
    lon: p.location?.longitude,
    confianza: typeof p.confidence === 'number' ? p.confidence : null,
    coincidencia: p.displayName?.text || '',
    direccionFormateada: p.formattedAddress || '',
    // Google entrega directamente la URL de Maps del lugar.
    urlGoogle: p.googleMapsUri || null,
    estadoNegocio: p.businessStatus || null,
  };
}

// ── ORQUESTADOR ──────────────────────────────────────────────────────────
async function geocodificar(consulta) {
  if (OPTS.proveedor === 'google') return geocodificarGoogle(consulta);
  return geocodificarNominatim(consulta);
}

// ── FASE 1: CONSULTAR ────────────────────────────────────────────────────
async function faseConsultar() {
  const where = OPTS.cliente
    ? { id_cliente: Number(OPTS.cliente) }
    : {};

  const clientes = await prisma.clientes.findMany({
    where,
    orderBy: { id_cliente: 'asc' },
    select: {
      id_cliente: true,
      codigo_cliente: true,
      nombre_sede: true,
      persona: {
        select: {
          id_persona: true,
          razon_social: true,
          nombre_comercial: true,
          direccion_principal: true,
          url_ubicacion: true,
          ciudad: true,
          departamento: true,
          pais: true,
        },
      },
    },
  });

  const seleccion = OPTS.limite ? clientes.slice(0, OPTS.limite) : clientes;

  console.log('═'.repeat(74));
  console.log('  FASE 1 — CONSULTAR (no se escribe nada)');
  console.log('═'.repeat(74));
  console.log(`  Proveedor      : ${OPTS.proveedor}`);
  console.log(`  Clientes       : ${seleccion.length}`);
  console.log(`  Sobrescribir   : ${OPTS.sobrescribir ? 'SÍ' : 'no'}`);
  console.log(`  Plan de salida : ${OPTS.plan}`);
  console.log('═'.repeat(74));
  console.log('');

  const plan = [];
  let indice = 0;

  for (const c of seleccion) {
    indice++;
    const p = c.persona;

    if (!p) {
      plan.push({
        id_cliente: c.id_cliente,
        nombre: '(sin persona)',
        accion: 'OMITIDO',
        motivo: 'El cliente no tiene persona vinculada',
      });
      console.log(`[${indice}/${seleccion.length}] #${c.id_cliente} — SIN PERSONA, omitido`);
      continue;
    }

    const { nombre, direccion, consulta } = construirConsulta(p);
    const etiqueta = nombre || `Cliente #${c.id_cliente}`;

    if (!consulta) {
      plan.push({
        id_cliente: c.id_cliente,
        id_persona: p.id_persona,
        nombre: etiqueta,
        accion: 'OMITIDO',
        motivo: 'Sin nombre, dirección ni ciudad: nada con qué buscar',
      });
      console.log(`[${indice}/${seleccion.length}] #${c.id_cliente} ${etiqueta} — SIN DATOS`);
      continue;
    }

    if (p.url_ubicacion && !OPTS.sobrescribir) {
      plan.push({
        id_cliente: c.id_cliente,
        id_persona: p.id_persona,
        nombre: etiqueta,
        accion: 'OMITIDO',
        motivo: 'Ya tiene url_ubicacion (usar --sobrescribir para forzar)',
        url_anterior: p.url_ubicacion,
      });
      console.log(`[${indice}/${seleccion.length}] #${c.id_cliente} ${etiqueta} — ya tiene URL`);
      if (OPTS.proveedor === 'nominatim') await dormir(1100);
      continue;
    }

    let res;
    try {
      res = await geocodificar(consulta);
    } catch (err) {
      plan.push({
        id_cliente: c.id_cliente,
        id_persona: p.id_persona,
        nombre: etiqueta,
        accion: 'ERROR',
        motivo: err.message,
        consulta,
      });
      console.log(`[${indice}/${seleccion.length}] #${c.id_cliente} ${etiqueta} — ERROR: ${err.message}`);
      continue;
    }

    if (!res.encontrado) {
      plan.push({
        id_cliente: c.id_cliente,
        id_persona: p.id_persona,
        nombre: etiqueta,
        accion: 'SIN_RESULTADO',
        motivo: res.motivo,
        consulta,
      });
      console.log(`[${indice}/${seleccion.length}] #${c.id_cliente} ${etiqueta} — SIN RESULTADO`);
      if (OPTS.proveedor === 'nominatim') await dormir(1100);
      continue;
    }

    const urlFinal = res.urlGoogle || urlGoogleMaps(res.lat, res.lon, etiqueta);
    const dirFinal = res.direccionFormateada;

    const urlNecesaria = !p.url_ubicacion || p.url_ubicacion !== urlFinal;
    const dirNecesaria = !p.direccion_principal; // no pisar texto escrito a mano

    let accion;
    if (urlNecesaria && p.url_ubicacion) accion = 'SOBRESCRIBIR_URL';
    else if (urlNecesaria) accion = 'LLENAR';
    else accion = 'YA_ACTUALIZADO';

    plan.push({
      id_cliente: c.id_cliente,
      id_persona: p.id_persona,
      nombre: etiqueta,
      consulta,
      accion,
      confianza: res.confianza,
      coincidencia: res.coincidencia,
      fuente: res.proveedor,
      url_anterior: p.url_ubicacion,
      dir_anterior: p.direccion_principal,
      url_propuesta: urlFinal,
      dir_propuesta: dirNecesaria ? dirFinal : null,
      dir_ya_escrita: !dirNecesaria,
      motivo: null,
    });

    const marca = res.confianza != null ? `conf=${res.confianza.toFixed(2)}` : 'conf=n/a';
    console.log(
      `[${indice}/${seleccion.length}] #${c.id_cliente} ${etiqueta} — ${accion} (${marca})`,
    );
    console.log(`    ↳ ${res.coincidencia.slice(0, 110)}`);
    console.log(`    ↳ ${urlFinal}`);

    if (OPTS.proveedor === 'nominatim') await dormir(1100);
  }

  // Persistir el plan para la Fase 2
  const planFinal = {
    generado_en: new Date().toISOString(),
    proveedor: OPTS.proveedor,
    sobrescribir: OPTS.sobrescribir,
    total: plan.length,
    items: plan,
  };
  fs.writeFileSync(OPTS.plan, JSON.stringify(planFinal, null, 2), 'utf8');

  // Resumen
  const porAccion = plan.reduce((acc, i) => {
    acc[i.accion] = (acc[i.accion] || 0) + 1;
    return acc;
  }, {});

  console.log('');
  console.log('─'.repeat(74));
  console.log('RESUMEN DEL PLAN (nada se ha escrito aún)');
  console.log('─'.repeat(74));
  for (const [k, v] of Object.entries(porAccion)) console.log(`  ${k.padEnd(18)}: ${v}`);
  console.log('');
  console.log(`Plan guardado en: ${OPTS.plan}`);
  console.log('Siguiente paso — revisarlo y ejecutar:');
  console.log(`  node src/testing/geocodificar-ubicaciones-clientes.js --aplicar`);
}

// ── FASE 2: APLICAR ──────────────────────────────────────────────────────
async function faseAplicar() {
  if (!fs.existsSync(OPTS.plan)) {
    console.error(`✗ No existe el plan: ${OPTS.plan}`);
    console.error('  Ejecute primero la Fase 1 (sin --aplicar).');
    process.exitCode = 1;
    return;
  }

  const plan = JSON.parse(fs.readFileSync(OPTS.plan, 'utf8'));
  const elegibles = plan.items.filter((i) =>
    ['LLENAR', 'SOBRESCRIBIR_URL'].includes(i.accion),
  );

  console.log('═'.repeat(74));
  console.log('  FASE 2 — APLICAR');
  console.log('═'.repeat(74));
  console.log(`  Plan generado : ${plan.generado_en}`);
  console.log(`  Total items   : ${plan.total}`);
  console.log(`  A escribir    : ${elegibles.length}`);
  console.log('═'.repeat(74));

  if (elegibles.length === 0) {
    console.log('Nada que escribir.');
    return;
  }

  let escritos = 0;
  const errores = [];

  // Una sola transacción: o se aplica el plan completo, o no se aplica nada.
  await prisma.$transaction(async (tx) => {
    for (const item of elegibles) {
      try {
        const data = { url_ubicacion: item.url_propuesta };
        // Solo completa la dirección descriptiva si está vacía: es texto escrito
        // a mano con referencias operativas que no deben perderse.
        if (item.dir_propuesta && !item.dir_ya_escrita) {
          data.direccion_principal = item.dir_propuesta;
        }

        await tx.personas.update({
          where: { id_persona: item.id_persona },
          data,
        });
        escritos++;
        console.log(
          `  ✓ #${item.id_cliente} ${item.nombre} → ${item.dir_propuesta ? 'URL + DIR' : 'URL'}`,
        );
      } catch (err) {
        errores.push({ id_cliente: item.id_cliente, error: err.message });
        // Relanzar revierte TODA la transacción: evita escrituras parciales.
        throw new Error(
          `Fallo en cliente #${item.id_cliente}: ${err.message}. ` +
            `Transacción revertida, no se escribió nada.`,
        );
      }
    }
  });

  console.log('');
  console.log(`✓ Transacción confirmada: ${escritos} personas actualizadas.`);

  if (OPTS.proveedor === 'nominatim') {
    console.log('');
    console.log('⚠ Nota: Nominatim prohíbe el geocoding masivo en su política de uso.');
    console.log('  Para las 187 ejecuciones use --proveedor google (requiere API key).');
  }
}

// ── MAIN ─────────────────────────────────────────────────────────────────
(async function main() {
  try {
    if (OPTS.aplicar) {
      await faseAplicar();
    } else {
      await faseConsultar();
    }
  } catch (err) {
    console.error('');
    console.error('✗ ERROR FATAL:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
