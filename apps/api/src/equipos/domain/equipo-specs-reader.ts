/**
 * MEKANOS S.A.S - Motor Universal de Activos EAM
 * 
 * EquipoSpecsReader: Puerta de Lectura Unificada Zero-Trust
 * 
 * Desacopla a los consumidores (PDF, cierre de órdenes, listados, móvil)
 * de las tablas satélite rígidas (equipos_generador, equipos_bomba, equipos_motor)
 * y de las futuras especificaciones JSONB dinámicas.
 */

export type CategoriaCanonicaEquipo = 
  | 'GENERADOR'
  | 'BOMBA'
  | 'MOTOR'
  | 'COMPRESOR'
  | 'HVAC'
  | 'ELEVADOR'
  | 'OTRO';

export interface CapacidadPrincipal {
  valor: number;
  unidad: string;
  texto: string;
}

export interface DatosFluidos {
  capacidadAceiteLitros?: number;
  capacidadAceiteGalonesAprox?: number;
  tipoAceite?: string;
  capacidadRefrigeranteLitros?: number;
  tipoRefrigerante?: string;
}

export interface KpiHeader {
  codigo: string;
  etiqueta: string;
  valorTexto: string;
  icono?: string;
}

export interface EquipoSpecsUnificadas {
  marca: string;
  modelo?: string;
  serie: string;
  categoriaCanonica: CategoriaCanonicaEquipo;
  capacidadPrincipal?: CapacidadPrincipal;
  fluidos?: DatosFluidos;
  kpis: KpiHeader[];
}

export class EquipoSpecsReader {
  /**
   * Resuelve la categoría canónica unificada mapeando los tipos duplicados
   * (GEN vs GENERADOR, BOM vs BOMBA, etc.) de forma lógica e inmediata.
   */
  static getCategoriaCanonica(equipo: any): CategoriaCanonicaEquipo {
    if (!equipo) return 'OTRO';

    const codigoTipo = (
      equipo.tipos_equipo?.codigo_tipo ||
      equipo.codigo_tipo ||
      equipo.tipo_equipo ||
      ''
    ).toUpperCase().trim();

    const nombreTipo = (
      equipo.tipos_equipo?.nombre_tipo ||
      equipo.nombre_tipo ||
      ''
    ).toUpperCase().trim();

    // 1. Mapeo por código exacto o prefijo
    if (codigoTipo === 'GEN' || codigoTipo === 'GENERADOR' || nombreTipo.includes('GENERADOR') || nombreTipo.includes('PLANTA')) {
      // Excepción detectada en auditoría: 14 equipos tipados como GENERADOR que son bombas
      if (equipo.equipos_bomba && !equipo.equipos_generador && (equipo.codigo_equipo?.startsWith('EQ-BOMBA-') || equipo.codigo_equipo?.startsWith('BOMBA-'))) {
        return 'BOMBA';
      }
      return 'GENERADOR';
    }

    if (codigoTipo === 'BOM' || codigoTipo === 'BOMBA' || nombreTipo.includes('BOMBA') || nombreTipo.includes('HIDRÁULICA')) {
      return 'BOMBA';
    }

    if (codigoTipo === 'COMP' || codigoTipo === 'COMPRESOR' || nombreTipo.includes('COMPRESOR')) {
      return 'COMPRESOR';
    }

    if (codigoTipo === 'MOT' || codigoTipo === 'MOTOR' || nombreTipo.includes('MOTOR')) {
      return 'MOTOR';
    }

    if (codigoTipo.includes('HVAC') || codigoTipo.includes('CLIMA') || nombreTipo.includes('ACONDICIONADO') || nombreTipo.includes('CHILLER')) {
      return 'HVAC';
    }

    if (codigoTipo.includes('ELEV') || nombreTipo.includes('ELEVADOR') || nombreTipo.includes('ASCENSOR')) {
      return 'ELEVADOR';
    }

    // 2. Fallback a presencia de satélites
    if (equipo.equipos_generador) return 'GENERADOR';
    if (equipo.equipos_bomba) return 'BOMBA';
    if (equipo.equipos_motor) return 'MOTOR';

    return 'OTRO';
  }

  /**
   * Resuelve la marca principal de un activo de forma universal
   */
  static getMarca(equipo: any): string {
    if (!equipo) return 'N/A';

    // 1. Si existen especificaciones dinámicas con rol semántico
    const specMarca = this.buscarEnEspecificaciones(equipo, ['marca_principal', 'marca']);
    if (specMarca) return specMarca;

    // 2. Fallback a satélites según jerarquía exacta del PDF legado
    const gen = equipo.equipos_generador;
    const bom = equipo.equipos_bomba;
    const mot = equipo.equipos_motor;

    if (gen) {
      return (gen.marca_generador || mot?.marca_motor || 'N/A').trim();
    }
    if (bom) {
      return (bom.marca_bomba || 'N/A').trim();
    }
    if (mot) {
      return (mot.marca_motor || 'N/A').trim();
    }

    // 3. Fallback a campo directo o nombre del equipo
    return equipo.marca || equipo.nombre_equipo || 'N/A';
  }

  /**
   * Resuelve el modelo principal del equipo
   */
  static getModelo(equipo: any): string | undefined {
    if (!equipo) return undefined;

    const specModelo = this.buscarEnEspecificaciones(equipo, ['modelo_principal', 'modelo']);
    if (specModelo) return specModelo;

    const gen = equipo.equipos_generador;
    const bom = equipo.equipos_bomba;
    const mot = equipo.equipos_motor;

    const modelo = gen?.modelo_generador || bom?.modelo_bomba || mot?.modelo_motor || equipo.modelo;
    if (modelo && modelo.trim() !== '') {
      return modelo.trim();
    }
    return undefined;
  }

  /**
   * Resuelve el número de serie principal del equipo
   */
  static getSerie(equipo: any): string {
    if (!equipo) return 'N/A';

    const specSerie = this.buscarEnEspecificaciones(equipo, ['serie_principal', 'serie']);
    if (specSerie) return specSerie;

    const gen = equipo.equipos_generador;
    const bom = equipo.equipos_bomba;
    const mot = equipo.equipos_motor;

    const serie = (
      gen?.numero_serie_generador ||
      bom?.numero_serie_bomba ||
      mot?.numero_serie_motor ||
      equipo.numero_serie_equipo ||
      equipo.serie ||
      'N/A'
    ).trim();

    return serie.toUpperCase() === 'N/A' || serie === '' ? (equipo.numero_serie_equipo || 'N/A') : serie;
  }

  /**
   * Resuelve la capacidad o potencia principal del activo (kVA, HP, m³/h, BTU...)
   */
  static getCapacidadPrincipal(equipo: any): CapacidadPrincipal | null {
    if (!equipo) return null;

    const gen = equipo.equipos_generador;
    const bom = equipo.equipos_bomba;
    const mot = equipo.equipos_motor;

    // 1. Generador: kVA > kW
    if (gen?.potencia_kva) {
      const v = Number(gen.potencia_kva);
      if (Number.isFinite(v) && v > 0) return { valor: v, unidad: 'kVA', texto: `${v} kVA` };
    }
    if (gen?.potencia_kw) {
      const v = Number(gen.potencia_kw);
      if (Number.isFinite(v) && v > 0) return { valor: v, unidad: 'kW', texto: `${v} kW` };
    }

    // 2. Bomba: Caudal m³/h > Potencia hidráulica kW
    if (bom?.caudal_maximo_m3h) {
      const v = Number(bom.caudal_maximo_m3h);
      if (Number.isFinite(v) && v > 0) return { valor: v, unidad: 'm³/h', texto: `${v} m³/h` };
    }
    if (bom?.potencia_hidraulica_kw) {
      const v = Number(bom.potencia_hidraulica_kw);
      if (Number.isFinite(v) && v > 0) return { valor: v, unidad: 'kW', texto: `${v} kW` };
    }

    // 3. Motor: HP > kW
    if (mot?.potencia_hp) {
      const v = Number(mot.potencia_hp);
      if (Number.isFinite(v) && v > 0) return { valor: v, unidad: 'HP', texto: `${v} HP` };
    }
    if (mot?.potencia_kw) {
      const v = Number(mot.potencia_kw);
      if (Number.isFinite(v) && v > 0) return { valor: v, unidad: 'kW', texto: `${v} kW` };
    }

    return null;
  }

  /**
   * Resuelve capacidades de fluidos (aceite y refrigerante) y calcula
   * automáticamente la equivalencia comercial en Galones.
   */
  static getFluidos(equipo: any): DatosFluidos | null {
    if (!equipo) return null;

    const mot = equipo.equipos_motor;
    const litrosAceite = mot?.capacidad_aceite_litros ? Number(mot.capacidad_aceite_litros) : undefined;
    const litrosRefrig = mot?.capacidad_refrigerante_litros ? Number(mot.capacidad_refrigerante_litros) : undefined;

    if (!litrosAceite && !litrosRefrig) return null;

    const galonesAprox = litrosAceite ? Number((litrosAceite * 0.264172).toFixed(1)) : undefined;

    return {
      capacidadAceiteLitros: litrosAceite,
      capacidadAceiteGalonesAprox: galonesAprox,
      tipoAceite: mot?.tipo_aceite || undefined,
      capacidadRefrigeranteLitros: litrosRefrig,
      tipoRefrigerante: mot?.tipo_refrigerante || undefined,
    };
  }

  /**
   * Extrae los KPIs de cabecera formateados (máximo 4) para tarjetas y vistas resumidas
   */
  static getKpisHeader(equipo: any): KpiHeader[] {
    if (!equipo) return [];

    const kpis: KpiHeader[] = [];

    // KPI 1: Capacidad Principal
    const cap = this.getCapacidadPrincipal(equipo);
    if (cap) {
      kpis.push({
        codigo: 'capacidad_principal',
        etiqueta: 'Potencia / Capacidad',
        valorTexto: cap.texto,
        icono: 'Zap',
      });
    }

    // KPI 2: Motor / Impulsor
    const mot = equipo.equipos_motor;
    if (mot?.marca_motor && mot.marca_motor.toUpperCase() !== 'N/A') {
      const motText = [mot.marca_motor, mot.modelo_motor].filter(Boolean).join(' ').trim();
      kpis.push({
        codigo: 'motor',
        etiqueta: 'Motor',
        valorTexto: motText,
        icono: 'Settings',
      });
    }

    // KPI 3: RPM o Frecuencia
    if (mot?.velocidad_nominal_rpm) {
      const rpm = Number(mot.velocidad_nominal_rpm);
      if (Number.isFinite(rpm) && rpm > 0) {
        kpis.push({
          codigo: 'rpm',
          etiqueta: 'Velocidad',
          valorTexto: `${rpm} RPM`,
          icono: 'Gauge',
        });
      }
    }

    // KPI 4: Horómetro de uso
    const horas = Number(equipo.horas_actuales || 0);
    if (horas > 0) {
      kpis.push({
        codigo: 'horas_actuales',
        etiqueta: 'Horómetro',
        valorTexto: `${horas.toLocaleString()} hrs`,
        icono: 'Timer',
      });
    }

    return kpis.slice(0, 4);
  }

  /**
   * Unifica y retorna la ficha completa normalizada
   */
  static leer(equipo: any): EquipoSpecsUnificadas {
    return {
      marca: this.getMarca(equipo),
      modelo: this.getModelo(equipo),
      serie: this.getSerie(equipo),
      categoriaCanonica: this.getCategoriaCanonica(equipo),
      capacidadPrincipal: this.getCapacidadPrincipal(equipo) || undefined,
      fluidos: this.getFluidos(equipo) || undefined,
      kpis: this.getKpisHeader(equipo),
    };
  }

  /**
   * Helper privado para buscar atributos dentro de un contenedor JSONB de especificaciones
   */
  private static buscarEnEspecificaciones(equipo: any, claves: string[]): string | undefined {
    const specs = equipo.especificaciones || equipo.especificaciones_tecnicas || equipo.metadata?.especificaciones;
    if (!specs || typeof specs !== 'object') return undefined;

    // Búsqueda directa en primer nivel
    for (const c of claves) {
      if (specs[c] && typeof specs[c] === 'string' && specs[c].trim() !== '') {
        return specs[c].trim();
      }
    }

    // Búsqueda dentro de módulos anidados: specs.motor?.marca, specs.alternador?.marca, etc.
    for (const modKey of Object.keys(specs)) {
      const mod = specs[modKey];
      if (mod && typeof mod === 'object') {
        for (const c of claves) {
          if (mod[c] && typeof mod[c] === 'string' && mod[c].trim() !== '') {
            return mod[c].trim();
          }
        }
      }
    }

    return undefined;
  }
}
