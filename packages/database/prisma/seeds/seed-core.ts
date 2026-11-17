import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface SeedCoreOptions {
  verbose?: boolean;
}

const CATEGORIAS_ACTIVO = [
  {
    codigo: 'ENERGIA',
    nombre: 'Energía y Generación',
    descripcion: 'Grupos electrógenos, motores estacionarios, UPS y tableros de transferencia',
    icono_ui: 'zap',
    color_hex: '#F59E0B',
    orden: 1,
  },
  {
    codigo: 'HIDRAULICA',
    nombre: 'Hidráulica y Bombeo',
    descripcion: 'Electrobombas, equipos de presión constante y redes contra incendio',
    icono_ui: 'droplets',
    color_hex: '#0EA5E9',
    orden: 2,
  },
  {
    codigo: 'CLIMATIZACION',
    nombre: 'Climatización y HVAC',
    descripcion: 'Chillers, unidades manejadoras de aire, VRF y torres de enfriamiento',
    icono_ui: 'wind',
    color_hex: '#06B6D4',
    orden: 3,
  },
  {
    codigo: 'COMPRESION',
    nombre: 'Aire Comprimido',
    descripcion: 'Compresores de tornillo o pistón, secadores frigoríficos y tanques pulmón',
    icono_ui: 'gauge',
    color_hex: '#6366F1',
    orden: 4,
  },
  {
    codigo: 'TRANSPORTE_VERTICAL',
    nombre: 'Transporte Vertical',
    descripcion: 'Ascensores, montacargas y escaleras mecánicas',
    icono_ui: 'arrow-up-down',
    color_hex: '#10B981',
    orden: 5,
  },
  {
    codigo: 'ACCESOS_AUTOMATICOS',
    nombre: 'Accesos Automáticos',
    descripcion: 'Puertas seccionales, talanqueras y portones motorizados',
    icono_ui: 'door-open',
    color_hex: '#8B5CF6',
    orden: 6,
  },
  {
    codigo: 'SUBESTACIONES',
    nombre: 'Subestaciones y Media Tensión',
    descripcion: 'Transformadores, celdas de media tensión y protecciones eléctricas',
    icono_ui: 'cpu',
    color_hex: '#EF4444',
    orden: 7,
  },
  {
    codigo: 'INFRAESTRUCTURA',
    nombre: 'Infraestructura y Tuberías',
    descripcion: 'Redes de conducción, válvulas industriales y obra mecánica general',
    icono_ui: 'wrench',
    color_hex: '#64748B',
    orden: 8,
  },
  {
    codigo: 'OTRO',
    nombre: 'Otros Activos Técnicos',
    descripcion: 'Maquinaria especializada diversa configurada dinámicamente',
    icono_ui: 'box',
    color_hex: '#94A3B8',
    orden: 9,
  },
] as const;

const ESTADOS_ORDEN = [
  {
    codigo_estado: 'PROGRAMADA',
    nombre_estado: 'Programada',
    descripcion: 'Orden creada y programada, pendiente de asignación de técnico',
    permite_edicion: true,
    permite_eliminacion: false,
    es_estado_final: false,
    color_hex: '#3B82F6',
    icono: 'calendar',
    orden_visualizacion: 1,
  },
  {
    codigo_estado: 'ASIGNADA',
    nombre_estado: 'Asignada sin ejecutar',
    descripcion: 'Técnico asignado a la orden, pendiente de inicio en campo',
    permite_edicion: true,
    permite_eliminacion: false,
    es_estado_final: false,
    color_hex: '#8B5CF6',
    icono: 'user-check',
    orden_visualizacion: 2,
  },
  {
    codigo_estado: 'EN_PROCESO',
    nombre_estado: 'En Proceso',
    descripcion: 'Técnico ejecutando trabajo en campo',
    permite_edicion: false,
    permite_eliminacion: false,
    es_estado_final: false,
    color_hex: '#F59E0B',
    icono: 'settings',
    orden_visualizacion: 3,
  },
  {
    codigo_estado: 'COMPLETADA',
    nombre_estado: 'Completada',
    descripcion: 'Trabajo finalizado por técnico, pendiente de aprobación',
    permite_edicion: false,
    permite_eliminacion: false,
    es_estado_final: true,
    color_hex: '#10B981',
    icono: 'check-circle',
    orden_visualizacion: 4,
  },
  {
    codigo_estado: 'APROBADA',
    nombre_estado: 'Aprobada',
    descripcion: 'Supervisor aprobó el trabajo ejecutado',
    permite_edicion: false,
    permite_eliminacion: false,
    es_estado_final: true,
    color_hex: '#059669',
    icono: 'check-double',
    orden_visualizacion: 5,
  },
  {
    codigo_estado: 'CANCELADA',
    nombre_estado: 'Cancelada',
    descripcion: 'Orden cancelada antes o durante su ejecución',
    permite_edicion: false,
    permite_eliminacion: false,
    es_estado_final: true,
    color_hex: '#DC2626',
    icono: 'x-circle',
    orden_visualizacion: 6,
  },
  {
    codigo_estado: 'EN_ESPERA_REPUESTO',
    nombre_estado: 'En Espera de Repuesto',
    descripcion: 'Orden pausada temporalmente por suministro o repuestos',
    permite_edicion: false,
    permite_eliminacion: false,
    es_estado_final: false,
    color_hex: '#6B7280',
    icono: 'clock',
    orden_visualizacion: 7,
  },
] as const;

const ESTADOS_COTIZACION = [
  {
    codigo_estado: 'BORRADOR',
    nombre_estado: 'Borrador',
    descripcion: 'Cotización en elaboración',
    permite_edicion: true,
    permite_eliminacion: true,
    es_estado_final: false,
    requiere_aprobacion_interna: false,
    color_hex: '#6c757d',
    icono: 'edit',
    orden_visualizacion: 1,
  },
  {
    codigo_estado: 'EN_REVISION',
    nombre_estado: 'En Revisión',
    descripcion: 'Esperando aprobación interna',
    permite_edicion: false,
    permite_eliminacion: false,
    es_estado_final: false,
    requiere_aprobacion_interna: true,
    color_hex: '#ffc107',
    icono: 'clock',
    orden_visualizacion: 2,
  },
  {
    codigo_estado: 'APROBADA_INTERNA',
    nombre_estado: 'Aprobada Internamente',
    descripcion: 'Aprobada para envío al cliente',
    permite_edicion: true,
    permite_eliminacion: false,
    es_estado_final: false,
    requiere_aprobacion_interna: false,
    color_hex: '#28a745',
    icono: 'check',
    orden_visualizacion: 3,
  },
  {
    codigo_estado: 'ENVIADA',
    nombre_estado: 'Enviada a Cliente',
    descripcion: 'Enviada al cliente, en espera de respuesta',
    permite_edicion: true,
    permite_eliminacion: false,
    es_estado_final: false,
    requiere_aprobacion_interna: false,
    color_hex: '#17a2b8',
    icono: 'paper-plane',
    orden_visualizacion: 4,
  },
  {
    codigo_estado: 'APROBADA_CLIENTE',
    nombre_estado: 'Aprobada por Cliente',
    descripcion: 'Aceptada por el cliente',
    permite_edicion: false,
    permite_eliminacion: false,
    es_estado_final: true,
    requiere_aprobacion_interna: false,
    color_hex: '#28a745',
    icono: 'check-double',
    orden_visualizacion: 5,
  },
  {
    codigo_estado: 'RECHAZADA',
    nombre_estado: 'Rechazada',
    descripcion: 'Rechazada por el cliente o internamente',
    permite_edicion: false,
    permite_eliminacion: false,
    es_estado_final: true,
    requiere_aprobacion_interna: false,
    color_hex: '#dc3545',
    icono: 'times-circle',
    orden_visualizacion: 6,
  },
  {
    codigo_estado: 'VENCIDA',
    nombre_estado: 'Vencida',
    descripcion: 'Vigencia superada sin aprobación',
    permite_edicion: false,
    permite_eliminacion: false,
    es_estado_final: true,
    requiere_aprobacion_interna: false,
    color_hex: '#6c757d',
    icono: 'calendar-times',
    orden_visualizacion: 7,
  },
] as const;

const ROLES_CORE = [
  { codigo_rol: 'SUPERADMIN', nombre_rol: 'Super Administrador', nivel_jerarquia: 10 },
  { codigo_rol: 'ADMIN', nombre_rol: 'Administrador', nivel_jerarquia: 9 },
  { codigo_rol: 'GERENTE', nombre_rol: 'Gerente', nivel_jerarquia: 8 },
  { codigo_rol: 'SUPERVISOR', nombre_rol: 'Supervisor Técnico', nivel_jerarquia: 7 },
  { codigo_rol: 'TECNICO_SENIOR', nombre_rol: 'Técnico Senior', nivel_jerarquia: 6 },
  { codigo_rol: 'TECNICO', nombre_rol: 'Técnico de Campo', nivel_jerarquia: 5 },
  { codigo_rol: 'ASESOR_COMERCIAL', nombre_rol: 'Asesor Comercial', nivel_jerarquia: 5 },
  { codigo_rol: 'ASESOR', nombre_rol: 'Asesor', nivel_jerarquia: 4 },
  { codigo_rol: 'AUXILIAR', nombre_rol: 'Auxiliar Administrativo', nivel_jerarquia: 3 },
  { codigo_rol: 'CLIENTE_PORTAL', nombre_rol: 'Cliente Portal', nivel_jerarquia: 1 },
  { codigo_rol: 'CLIENTE', nombre_rol: 'Cliente', nivel_jerarquia: 1 },
] as const;

const PERMISOS_CORE = [
  ['EQUIPOS_READ', 'Ver Equipos', 'EQUIPOS'],
  ['EQUIPOS_CREATE', 'Crear Equipos', 'EQUIPOS'],
  ['EQUIPOS_UPDATE', 'Editar Equipos', 'EQUIPOS'],
  ['EQUIPOS_DELETE', 'Eliminar Equipos', 'EQUIPOS'],
  ['EQUIPOS_FILES', 'Archivos de Equipos', 'EQUIPOS'],
  ['EQUIPOS_EXPORT', 'Exportar Equipos', 'EQUIPOS'],
  ['EQUIPOS_IMPORT', 'Importar Equipos', 'EQUIPOS'],
  ['EQUIPOS_HISTORY', 'Historial de Equipos', 'EQUIPOS'],
  ['ORDENES_READ', 'Ver Órdenes', 'ORDENES'],
  ['ORDENES_CREATE', 'Crear Órdenes', 'ORDENES'],
  ['ORDENES_UPDATE', 'Editar Órdenes', 'ORDENES'],
  ['ORDENES_DELETE', 'Eliminar Órdenes', 'ORDENES'],
  ['ORDENES_ASSIGN', 'Asignar Órdenes', 'ORDENES'],
  ['ORDENES_EXECUTE', 'Ejecutar Órdenes', 'ORDENES'],
  ['ORDENES_EVIDENCE', 'Cargar Evidencias', 'ORDENES'],
  ['ORDENES_SIGNATURE', 'Registrar Firmas', 'ORDENES'],
  ['ORDENES_REPORT', 'Generar Informes de Orden', 'ORDENES'],
  ['ORDENES_APPROVE', 'Aprobar Órdenes', 'ORDENES'],
  ['COTIZACIONES_READ', 'Ver Cotizaciones', 'COTIZACIONES'],
  ['COTIZACIONES_CREATE', 'Crear Cotizaciones', 'COTIZACIONES'],
  ['COTIZACIONES_UPDATE', 'Editar Cotizaciones', 'COTIZACIONES'],
  ['COTIZACIONES_DELETE', 'Eliminar Cotizaciones', 'COTIZACIONES'],
  ['COTIZACIONES_SEND', 'Enviar Cotizaciones', 'COTIZACIONES'],
  ['COTIZACIONES_CONVERT', 'Convertir Cotización a Orden', 'COTIZACIONES'],
  ['COTIZACIONES_VERSION', 'Versionar Cotizaciones', 'COTIZACIONES'],
  ['COTIZACIONES_APPROVE', 'Aprobar Cotizaciones', 'COTIZACIONES'],
  ['INVENTARIO_READ', 'Ver Inventario', 'INVENTARIO'],
  ['INVENTARIO_CREATE', 'Crear Artículos/Movimientos', 'INVENTARIO'],
  ['INVENTARIO_ADJUST', 'Ajustar Inventario', 'INVENTARIO'],
  ['INVENTARIO_TRANSFER', 'Transferir Inventario', 'INVENTARIO'],
  ['INVENTARIO_PURCHASE', 'Órdenes de Compra', 'INVENTARIO'],
  ['INVENTARIO_REPORTS', 'Reportes de Inventario', 'INVENTARIO'],
  ['CLIENTES_READ', 'Ver Clientes', 'CLIENTES'],
  ['CLIENTES_CREATE', 'Crear Clientes', 'CLIENTES'],
  ['CLIENTES_UPDATE', 'Editar Clientes', 'CLIENTES'],
  ['CLIENTES_DELETE', 'Eliminar Clientes', 'CLIENTES'],
  ['CLIENTES_CREDIT', 'Crédito Clientes', 'CLIENTES'],
  ['CLIENTES_PORTAL', 'Acceso Portal Cliente', 'CLIENTES'],
  ['INFORMES_READ', 'Ver Informes', 'INFORMES'],
  ['INFORMES_CREATE', 'Crear Informes', 'INFORMES'],
  ['INFORMES_APPROVE', 'Aprobar Informes', 'INFORMES'],
  ['INFORMES_EXPORT', 'Exportar Informes', 'INFORMES'],
  ['CONFIG_SYSTEM', 'Configurar Sistema y Marca', 'CONFIGURACION'],
  ['CONFIG_USERS', 'Gestionar Usuarios', 'CONFIGURACION'],
  ['CONFIG_ROLES', 'Gestionar Roles y Permisos', 'CONFIGURACION'],
  ['CONFIG_BACKUP', 'Respaldos y Mantenimiento', 'CONFIGURACION'],
] as const;

const ROLE_PERMISOS_MAP: Record<string, string[]> = {
  GERENTE: PERMISOS_CORE.map((p) => p[0]).filter((c) => c !== 'CONFIG_BACKUP'),
  SUPERVISOR: [
    'ORDENES_READ', 'ORDENES_CREATE', 'ORDENES_UPDATE', 'ORDENES_ASSIGN', 'ORDENES_EXECUTE',
    'ORDENES_EVIDENCE', 'ORDENES_SIGNATURE', 'ORDENES_REPORT', 'ORDENES_APPROVE',
    'EQUIPOS_READ', 'EQUIPOS_CREATE', 'EQUIPOS_UPDATE', 'EQUIPOS_FILES', 'EQUIPOS_EXPORT', 'EQUIPOS_HISTORY',
    'CLIENTES_READ', 'INFORMES_READ', 'INFORMES_CREATE', 'INFORMES_APPROVE', 'INFORMES_EXPORT',
    'INVENTARIO_READ', 'INVENTARIO_REPORTS',
  ],
  TECNICO_SENIOR: [
    'ORDENES_READ', 'ORDENES_EXECUTE', 'ORDENES_EVIDENCE', 'ORDENES_SIGNATURE', 'ORDENES_REPORT',
    'EQUIPOS_READ', 'EQUIPOS_FILES', 'CLIENTES_READ', 'INFORMES_READ', 'INFORMES_CREATE', 'INVENTARIO_READ',
  ],
  TECNICO: [
    'ORDENES_READ', 'ORDENES_EXECUTE', 'ORDENES_EVIDENCE', 'ORDENES_SIGNATURE', 'ORDENES_REPORT',
    'EQUIPOS_READ', 'EQUIPOS_FILES', 'CLIENTES_READ', 'INFORMES_READ', 'INFORMES_CREATE', 'INVENTARIO_READ',
  ],
  ASESOR_COMERCIAL: [
    'CLIENTES_READ', 'CLIENTES_CREATE', 'CLIENTES_UPDATE',
    'COTIZACIONES_READ', 'COTIZACIONES_CREATE', 'COTIZACIONES_UPDATE', 'COTIZACIONES_SEND',
    'COTIZACIONES_VERSION', 'COTIZACIONES_APPROVE', 'COTIZACIONES_CONVERT',
    'EQUIPOS_READ', 'ORDENES_READ', 'ORDENES_CREATE', 'INFORMES_READ', 'INVENTARIO_READ',
  ],
  ASESOR: [
    'CLIENTES_READ', 'CLIENTES_CREATE', 'CLIENTES_UPDATE',
    'COTIZACIONES_READ', 'COTIZACIONES_CREATE', 'COTIZACIONES_UPDATE', 'COTIZACIONES_SEND',
    'COTIZACIONES_VERSION', 'COTIZACIONES_APPROVE', 'COTIZACIONES_CONVERT',
    'EQUIPOS_READ', 'ORDENES_READ', 'ORDENES_CREATE', 'INFORMES_READ', 'INVENTARIO_READ',
  ],
  AUXILIAR: [
    'ORDENES_READ', 'ORDENES_CREATE', 'ORDENES_UPDATE', 'ORDENES_ASSIGN',
    'CLIENTES_READ', 'CLIENTES_CREATE', 'CLIENTES_UPDATE',
    'EQUIPOS_READ', 'EQUIPOS_CREATE', 'EQUIPOS_UPDATE', 'EQUIPOS_FILES',
    'INVENTARIO_READ', 'INVENTARIO_CREATE', 'INVENTARIO_TRANSFER', 'INFORMES_READ',
  ],
  CLIENTE_PORTAL: ['CLIENTES_PORTAL', 'ORDENES_READ', 'EQUIPOS_READ', 'INFORMES_READ', 'COTIZACIONES_READ'],
  CLIENTE: ['CLIENTES_PORTAL', 'ORDENES_READ', 'EQUIPOS_READ', 'INFORMES_READ', 'COTIZACIONES_READ'],
};

const SI_MAGNITUDES = [
  {
    codigo_magnitud: 'POTENCIA',
    nombre_magnitud: 'Potencia Activa / Mecánica',
    unidad_base_codigo: 'KW',
    unidades: [
      { codigo: 'KW', nombre: 'Kilovatio', simbolo: 'kW', factor_a: 1, factor_b: 0, base: true },
      { codigo: 'W', nombre: 'Vatio', simbolo: 'W', factor_a: 0.001, factor_b: 0, base: false },
      { codigo: 'HP', nombre: 'Caballo de Fuerza', simbolo: 'HP', factor_a: 0.745699872, factor_b: 0, base: false },
      { codigo: 'BTU_H', nombre: 'BTU por hora', simbolo: 'BTU/h', factor_a: 0.000293071, factor_b: 0, base: false },
    ],
  },
  {
    codigo_magnitud: 'TENSION',
    nombre_magnitud: 'Tensión Eléctrica',
    unidad_base_codigo: 'V',
    unidades: [
      { codigo: 'V', nombre: 'Voltio', simbolo: 'V', factor_a: 1, factor_b: 0, base: true },
      { codigo: 'KV', nombre: 'Kilovoltio', simbolo: 'kV', factor_a: 1000, factor_b: 0, base: false },
      { codigo: 'MV', nombre: 'Milivoltio', simbolo: 'mV', factor_a: 0.001, factor_b: 0, base: false },
    ],
  },
  {
    codigo_magnitud: 'CORRIENTE',
    nombre_magnitud: 'Corriente Eléctrica',
    unidad_base_codigo: 'A',
    unidades: [
      { codigo: 'A', nombre: 'Amperio', simbolo: 'A', factor_a: 1, factor_b: 0, base: true },
      { codigo: 'MA', nombre: 'Miliamperio', simbolo: 'mA', factor_a: 0.001, factor_b: 0, base: false },
    ],
  },
  {
    codigo_magnitud: 'FRECUENCIA',
    nombre_magnitud: 'Frecuencia',
    unidad_base_codigo: 'HZ',
    unidades: [{ codigo: 'HZ', nombre: 'Herzio', simbolo: 'Hz', factor_a: 1, factor_b: 0, base: true }],
  },
  {
    codigo_magnitud: 'PRESION',
    nombre_magnitud: 'Presión',
    unidad_base_codigo: 'BAR',
    unidades: [
      { codigo: 'BAR', nombre: 'Bar', simbolo: 'bar', factor_a: 1, factor_b: 0, base: true },
      { codigo: 'PSI', nombre: 'Libra por Pulgada Cuadrada', simbolo: 'PSI', factor_a: 0.068947573, factor_b: 0, base: false },
      { codigo: 'KPA', nombre: 'Kilopascal', simbolo: 'kPa', factor_a: 0.01, factor_b: 0, base: false },
    ],
  },
  {
    codigo_magnitud: 'TEMPERATURA',
    nombre_magnitud: 'Temperatura',
    unidad_base_codigo: 'C',
    unidades: [
      { codigo: 'C', nombre: 'Grados Celsius', simbolo: '°C', factor_a: 1, factor_b: 0, base: true },
      { codigo: 'F', nombre: 'Grados Fahrenheit', simbolo: '°F', factor_a: 0.5555555556, factor_b: -17.7777777778, base: false },
      { codigo: 'K', nombre: 'Kelvin', simbolo: 'K', factor_a: 1, factor_b: -273.15, base: false },
    ],
  },
  {
    codigo_magnitud: 'TIEMPO_USO',
    nombre_magnitud: 'Tiempo de Operación',
    unidad_base_codigo: 'H',
    unidades: [
      { codigo: 'H', nombre: 'Hora', simbolo: 'h', factor_a: 1, factor_b: 0, base: true },
      { codigo: 'MIN', nombre: 'Minuto', simbolo: 'min', factor_a: 0.0166666667, factor_b: 0, base: false },
    ],
  },
  {
    codigo_magnitud: 'CAUDAL',
    nombre_magnitud: 'Caudal Volumétrico',
    unidad_base_codigo: 'M3H',
    unidades: [
      { codigo: 'M3H', nombre: 'Metro Cúbico por Hora', simbolo: 'm³/h', factor_a: 1, factor_b: 0, base: true },
      { codigo: 'LPM', nombre: 'Litro por Minuto', simbolo: 'L/min', factor_a: 0.06, factor_b: 0, base: false },
      { codigo: 'GPM', nombre: 'Galón por Minuto', simbolo: 'GPM', factor_a: 0.227124707, factor_b: 0, base: false },
      { codigo: 'CFM', nombre: 'Pie Cúbico por Minuto', simbolo: 'CFM', factor_a: 1.699010795, factor_b: 0, base: false },
    ],
  },
  {
    codigo_magnitud: 'VELOCIDAD_ROT',
    nombre_magnitud: 'Velocidad Angular',
    unidad_base_codigo: 'RPM',
    unidades: [{ codigo: 'RPM', nombre: 'Revoluciones por Minuto', simbolo: 'RPM', factor_a: 1, factor_b: 0, base: true }],
  },
  {
    codigo_magnitud: 'LONGITUD',
    nombre_magnitud: 'Longitud / Altura',
    unidad_base_codigo: 'M',
    unidades: [
      { codigo: 'M', nombre: 'Metro', simbolo: 'm', factor_a: 1, factor_b: 0, base: true },
      { codigo: 'CM', nombre: 'Centímetro', simbolo: 'cm', factor_a: 0.01, factor_b: 0, base: false },
      { codigo: 'MM', nombre: 'Milímetro', simbolo: 'mm', factor_a: 0.001, factor_b: 0, base: false },
    ],
  },
  {
    codigo_magnitud: 'MASA',
    nombre_magnitud: 'Masa / Capacidad de Carga',
    unidad_base_codigo: 'KG',
    unidades: [
      { codigo: 'KG', nombre: 'Kilogramo', simbolo: 'kg', factor_a: 1, factor_b: 0, base: true },
      { codigo: 'TON', nombre: 'Tonelada Métrica', simbolo: 't', factor_a: 1000, factor_b: 0, base: false },
    ],
  },
  {
    codigo_magnitud: 'VOLUMEN',
    nombre_magnitud: 'Volumen',
    unidad_base_codigo: 'L',
    unidades: [
      { codigo: 'L', nombre: 'Litro', simbolo: 'L', factor_a: 1, factor_b: 0, base: true },
      { codigo: 'GAL', nombre: 'Galón US', simbolo: 'gal', factor_a: 3.785411784, factor_b: 0, base: false },
    ],
  },
  {
    codigo_magnitud: 'CANTIDAD',
    nombre_magnitud: 'Conteo / Inventario',
    unidad_base_codigo: 'UND',
    unidades: [
      { codigo: 'UND', nombre: 'Unidad', simbolo: 'und', factor_a: 1, factor_b: 0, base: true },
      { codigo: 'KIT', nombre: 'Kit', simbolo: 'kit', factor_a: 1, factor_b: 0, base: false },
      { codigo: 'CICLOS', nombre: 'Ciclos / Maniobras', simbolo: 'ciclos', factor_a: 1, factor_b: 0, base: false },
    ],
  },
] as const;

export async function seedCore(prisma: PrismaClient, options: SeedCoreOptions = {}) {
  const log = options.verbose === false ? () => undefined : console.log;

  // 1. Configuración White-Label singleton
  await prisma.configuracion_organizacion.upsert({
    where: { id_configuracion: 1 },
    update: {},
    create: {
      id_configuracion: 1,
      nombre_comercial: process.env.SEED_ORG_NAME || 'Mi Organización EAM',
      razon_social: process.env.SEED_ORG_RAZON_SOCIAL || 'Mi Organización S.A.',
      tipo_id_fiscal: process.env.SEED_ORG_TAX_TYPE || 'NIT',
      ciudad_defecto: process.env.SEED_ORG_CITY || 'Ciudad',
      pais_defecto: process.env.SEED_ORG_COUNTRY || 'Colombia',
      codigo_pais_iso: process.env.SEED_ORG_ISO || 'CO',
      zona_horaria: process.env.SEED_ORG_TIMEZONE || 'America/Bogota',
      locale: process.env.SEED_ORG_LOCALE || 'es-CO',
      codigo_moneda: process.env.SEED_ORG_CURRENCY || 'USD',
      simbolo_moneda: process.env.SEED_ORG_CURRENCY_SYMBOL || '$',
      decimales_moneda: Number(process.env.SEED_ORG_DECIMALS ?? 2),
      etiqueta_impuesto: process.env.SEED_ORG_TAX_LABEL || 'IVA',
      tasa_impuesto_defecto: Number(process.env.SEED_ORG_TAX_RATE ?? 19),
    },
  });
  log('✅ Configuracion white-label inicializada');

  // 2. Categorías de activos
  for (const cat of CATEGORIAS_ACTIVO) {
    await prisma.categorias_activo.upsert({
      where: { codigo: cat.codigo },
      update: { nombre: cat.nombre, descripcion: cat.descripcion, icono_ui: cat.icono_ui, color_hex: cat.color_hex, orden: cat.orden },
      create: { ...cat, activo: true },
    });
  }
  log(`✅ ${CATEGORIAS_ACTIVO.length} categorías de activos sembradas`);

  // 3. Estados de orden y cotización
  for (const est of ESTADOS_ORDEN) {
    const existing = await prisma.estados_orden.findFirst({ where: { codigo_estado: est.codigo_estado } });
    if (!existing) {
      await prisma.estados_orden.create({ data: { ...est, activo: true } });
    }
  }
  for (const ec of ESTADOS_COTIZACION) {
    const existing = await prisma.estados_cotizacion.findFirst({ where: { codigo_estado: ec.codigo_estado } });
    if (!existing) {
      await prisma.estados_cotizacion.create({ data: { ...ec, activo: true } });
    }
  }
  log('✅ Estados operativos sembrados');

  // 4. Roles, Permisos y matriz roles_permisos
  const roleMap = new Map<string, number>();
  for (const rol of ROLES_CORE) {
    let rec = await prisma.roles.findFirst({ where: { codigo_rol: rol.codigo_rol } });
    if (!rec) {
      rec = await prisma.roles.create({
        data: { ...rol, es_rol_sistema: true, activo: true },
      });
    }
    roleMap.set(rol.codigo_rol, rec.id_rol);
  }

  const permisoMap = new Map<string, number>();
  for (const [codigo, nombre, modulo] of PERMISOS_CORE) {
    let rec = await prisma.permisos.findFirst({ where: { codigo_permiso: codigo } });
    if (!rec) {
      rec = await prisma.permisos.create({
        data: { codigo_permiso: codigo, nombre_permiso: nombre, modulo, activo: true },
      });
    }
    permisoMap.set(codigo, rec.id_permiso);
  }

  const allPermIds = Array.from(permisoMap.values());
  const fullRoles = ['SUPERADMIN', 'ADMIN'].map((r) => roleMap.get(r)!).filter(Boolean);
  for (const idRol of fullRoles) {
    await prisma.roles_permisos.createMany({
      data: allPermIds.map((id_permiso) => ({ id_rol: idRol, id_permiso })),
      skipDuplicates: true,
    });
  }
  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISOS_MAP)) {
    const idRol = roleMap.get(roleCode);
    if (!idRol) continue;
    const permIds = permCodes.map((c) => permisoMap.get(c)).filter((v): v is number => !!v);
    await prisma.roles_permisos.createMany({
      data: permIds.map((id_permiso) => ({ id_rol: idRol, id_permiso })),
      skipDuplicates: true,
    });
  }
  log('✅ RBAC Roles y Permisos sembrados');

  // 5. Magnitudes SI puras y Unidades de Medida
  for (const mag of SI_MAGNITUDES) {
    const m = await prisma.catalogo_magnitudes.upsert({
      where: { codigo_magnitud: mag.codigo_magnitud },
      update: {},
      create: {
        codigo_magnitud: mag.codigo_magnitud,
        nombre_magnitud: mag.nombre_magnitud,
        unidad_base_codigo: mag.unidad_base_codigo,
        es_sistema: true,
        activo: true,
      },
    });
    for (const u of mag.unidades) {
      await prisma.unidades_medida.upsert({
        where: { codigo: u.codigo },
        update: {},
        create: {
          codigo: u.codigo,
          nombre: u.nombre,
          simbolo: u.simbolo,
          tipo_magnitud: mag.codigo_magnitud,
          id_magnitud: m.id_magnitud,
          factor_a: u.factor_a,
          factor_b: u.factor_b,
          es_unidad_base: u.base,
          permite_decimales: true,
          activo: true,
        },
      });
    }
  }
  log(`✅ ${SI_MAGNITUDES.length} magnitudes SI y unidades sembradas`);

  // 6. Administrador inicial gobernado exclusivamente por variables de entorno
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (adminEmail && adminPassword) {
    const adminDoc = process.env.SEED_ADMIN_DOC || 'ADMIN-0001';
    const adminName = process.env.SEED_ADMIN_NAME || 'Administrador';
    let persona = await prisma.personas.findFirst({
      where: {
        tipo_identificacion: 'CC',
        numero_identificacion: adminDoc,
      },
    });
    if (!persona) {
      persona = await prisma.personas.create({
        data: {
          tipo_identificacion: 'CC',
          numero_identificacion: adminDoc,
          tipo_persona: 'NATURAL',
          primer_nombre: adminName,
          primer_apellido: 'Sistema',
          email_principal: adminEmail,
          ciudad: process.env.SEED_ORG_CITY || 'Ciudad',
          pais: process.env.SEED_ORG_COUNTRY || 'Colombia',
          es_empleado: true,
          activo: true,
        },
      });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const usuario = await prisma.usuarios.upsert({
      where: { email: adminEmail },
      update: { password_hash: passwordHash, estado: 'ACTIVO' },
      create: {
        id_persona: persona.id_persona,
        username: adminEmail.split('@')[0].slice(0, 50),
        email: adminEmail,
        password_hash: passwordHash,
        estado: 'ACTIVO',
        debe_cambiar_password: false,
      },
    });

    const adminRoleId = roleMap.get('ADMIN');
    if (adminRoleId) {
      await prisma.usuarios_roles.upsert({
        where: { id_usuario_id_rol: { id_usuario: usuario.id_usuario, id_rol: adminRoleId } },
        update: {},
        create: { id_usuario: usuario.id_usuario, id_rol: adminRoleId },
      });
    }
    log(`✅ Usuario administrador inicial asegurado: ${adminEmail}`);
  } else {
    log('ℹ️  SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD no definidos; se omite creación de usuario admin inicial.');
  }
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedCore(prisma)
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error('❌ Error ejecutando seed-core:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
