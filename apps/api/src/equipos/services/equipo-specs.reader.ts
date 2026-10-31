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

export interface AtributoPlaca {
  etiqueta: string;
  valor: string;
  rolSemantico?: string;
}

export interface BloquePlaca {
  nombreModulo: string;
  atributos: AtributoPlaca[];
}

export interface DatosPlacaUniversal {
  categoriaCanonica: CategoriaCanonicaEquipo;
  marca: string;
  modelo?: string;
  serie: string;
  capacidadPrincipal?: CapacidadPrincipal;
  kpis: KpiHeader[];
  bloques: BloquePlaca[];
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

    // 1. JSONB dinámico si está presente
    const specCap = this.buscarEnEspecificaciones(equipo, ['potencia_principal', 'capacidad_principal', 'capacidad']);
    if (specCap) {
      const match = specCap.match(/^([\d.]+)\s*(.*)$/);
      if (match) {
        return {
          valor: Number(match[1]),
          unidad: match[2] || '',
          texto: specCap,
        };
      }
    }

    const gen = equipo.equipos_generador;
    const bom = equipo.equipos_bomba;
    const mot = equipo.equipos_motor;

    // 2. Generador: kVA > kW
    if (gen?.potencia_kva) {
      const v = Number(gen.potencia_kva);
      if (Number.isFinite(v) && v > 0) return { valor: v, unidad: 'kVA', texto: `${v} kVA` };
    }
    if (gen?.potencia_kw) {
      const v = Number(gen.potencia_kw);
      if (Number.isFinite(v) && v > 0) return { valor: v, unidad: 'kW', texto: `${v} kW` };
    }

    // 3. Bomba: Caudal m³/h > Potencia hidráulica kW
    if (bom?.caudal_maximo_m3h) {
      const v = Number(bom.caudal_maximo_m3h);
      if (Number.isFinite(v) && v > 0) return { valor: v, unidad: 'm³/h', texto: `${v} m³/h` };
    }
    if (bom?.potencia_hidraulica_kw) {
      const v = Number(bom.potencia_hidraulica_kw);
      if (Number.isFinite(v) && v > 0) return { valor: v, unidad: 'kW', texto: `${v} kW` };
    }

    // 4. Motor: HP > kW
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
   * Genera la estructura completa de la Placa Técnica Universal
   * adaptativa para PDF y Frontend.
   */
  static getPlacaUniversal(equipo: any): DatosPlacaUniversal {
    if (!equipo) {
      return {
        categoriaCanonica: 'OTRO',
        marca: 'N/A',
        serie: 'N/A',
        kpis: [],
        bloques: [],
      };
    }

    const categoriaCanonica = this.getCategoriaCanonica(equipo);
    const marca = this.getMarca(equipo);
    const modelo = this.getModelo(equipo);
    const serie = this.getSerie(equipo);
    const capacidadPrincipal = this.getCapacidadPrincipal(equipo) || undefined;
    const kpis = this.getKpisHeader(equipo);

    const bloques: BloquePlaca[] = [];

    // 1. Módulos dinámicos desde JSONB si existen
    const specs = equipo.especificaciones || equipo.especificaciones_tecnicas || equipo.metadata?.especificaciones;
    if (specs && typeof specs === 'object' && Object.keys(specs).length > 0) {
      for (const [modKey, modVal] of Object.entries(specs)) {
        if (modVal && typeof modVal === 'object' && !Array.isArray(modVal)) {
          const atributos: AtributoPlaca[] = [];
          for (const [attrKey, attrVal] of Object.entries(modVal as Record<string, any>)) {
            if (attrVal !== undefined && attrVal !== null && String(attrVal).trim() !== '') {
              atributos.push({
                etiqueta: attrKey.replace(/_/g, ' ').toUpperCase(),
                valor: String(attrVal),
                rolSemantico: attrKey,
              });
            }
          }
          if (atributos.length > 0) {
            bloques.push({
              nombreModulo: modKey.replace(/_/g, ' ').toUpperCase(),
              atributos,
            });
          }
        }
      }
    }

    // 2. Satélites legados si no hubo JSONB estructurado
    if (bloques.length === 0) {
      const gen = equipo.equipos_generador;
      const mot = equipo.equipos_motor;
      const bom = equipo.equipos_bomba;

      if (gen) {
        const atributosGen: AtributoPlaca[] = [];
        if (gen.marca_generador) atributosGen.push({ etiqueta: 'Marca Alternador', valor: gen.marca_generador, rolSemantico: 'marca' });
        if (gen.modelo_generador) atributosGen.push({ etiqueta: 'Modelo Alternador', valor: gen.modelo_generador, rolSemantico: 'modelo' });
        if (gen.numero_serie_generador) atributosGen.push({ etiqueta: 'Serie Alternador', valor: gen.numero_serie_generador, rolSemantico: 'serie' });
        if (gen.potencia_kva) atributosGen.push({ etiqueta: 'Potencia Aparente', valor: `${gen.potencia_kva} kVA`, rolSemantico: 'potencia_principal' });
        if (gen.potencia_kw) atributosGen.push({ etiqueta: 'Potencia Activa', valor: `${gen.potencia_kw} kW` });
        if (gen.voltaje_generador) atributosGen.push({ etiqueta: 'Voltaje Generador', valor: `${gen.voltaje_generador} V` });
        if (gen.frecuencia_hz) atributosGen.push({ etiqueta: 'Frecuencia', valor: `${gen.frecuencia_hz} Hz` });
        if (gen.numero_fases) atributosGen.push({ etiqueta: 'Fases', valor: String(gen.numero_fases) });
        if (gen.factor_potencia) atributosGen.push({ etiqueta: 'Factor de Potencia', valor: String(gen.factor_potencia) });
        if (gen.tipo_alternador) atributosGen.push({ etiqueta: 'Tipo de Alternador', valor: gen.tipo_alternador });

        if (atributosGen.length > 0) {
          bloques.push({ nombreModulo: 'ALTERNADOR / GENERADOR', atributos: atributosGen });
        }
      }

      if (mot) {
        const atributosMot: AtributoPlaca[] = [];
        if (mot.marca_motor) atributosMot.push({ etiqueta: 'Marca Motor', valor: mot.marca_motor, rolSemantico: 'marca_motor' });
        if (mot.modelo_motor) atributosMot.push({ etiqueta: 'Modelo Motor', valor: mot.modelo_motor, rolSemantico: 'modelo_motor' });
        if (mot.numero_serie_motor) atributosMot.push({ etiqueta: 'Serie Motor', valor: mot.numero_serie_motor, rolSemantico: 'serie_motor' });
        if (mot.potencia_hp) atributosMot.push({ etiqueta: 'Potencia Motor', valor: `${mot.potencia_hp} HP` });
        if (mot.potencia_kw) atributosMot.push({ etiqueta: 'Potencia Eléctrica', valor: `${mot.potencia_kw} kW` });
        if (mot.velocidad_nominal_rpm) atributosMot.push({ etiqueta: 'Velocidad', valor: `${mot.velocidad_nominal_rpm} RPM` });
        if (mot.numero_cilindros) atributosMot.push({ etiqueta: 'Cilindros', valor: String(mot.numero_cilindros) });
        if (mot.aspiracion) atributosMot.push({ etiqueta: 'Aspiración', valor: mot.aspiracion });
        if (mot.capacidad_aceite_litros) {
          const gals = (Number(mot.capacidad_aceite_litros) * 0.264172).toFixed(1);
          atributosMot.push({ etiqueta: 'Capacidad de Aceite', valor: `${mot.capacidad_aceite_litros} L (~${gals} Gal)` });
        }
        if (mot.tipo_aceite) atributosMot.push({ etiqueta: 'Tipo de Aceite', valor: mot.tipo_aceite });
        if (mot.capacidad_refrigerante_litros) atributosMot.push({ etiqueta: 'Capacidad Refrigerante', valor: `${mot.capacidad_refrigerante_litros} L` });
        if (mot.tipo_refrigerante) atributosMot.push({ etiqueta: 'Tipo Refrigerante', valor: mot.tipo_refrigerante });

        if (atributosMot.length > 0) {
          bloques.push({ nombreModulo: 'MOTOR COMBUSTIÓN / ACCIONAMIENTO', atributos: atributosMot });
        }
      }

      if (bom) {
        const atributosBom: AtributoPlaca[] = [];
        if (bom.marca_bomba) atributosBom.push({ etiqueta: 'Marca Bomba', valor: bom.marca_bomba, rolSemantico: 'marca' });
        if (bom.modelo_bomba) atributosBom.push({ etiqueta: 'Modelo Bomba', valor: bom.modelo_bomba, rolSemantico: 'modelo' });
        if (bom.numero_serie_bomba) atributosBom.push({ etiqueta: 'Serie Bomba', valor: bom.numero_serie_bomba, rolSemantico: 'serie' });
        if (bom.caudal_maximo_m3h) atributosBom.push({ etiqueta: 'Caudal Máximo', valor: `${bom.caudal_maximo_m3h} m³/h`, rolSemantico: 'potencia_principal' });
        if (bom.presion_maxima_psi) atributosBom.push({ etiqueta: 'Presión Máxima', valor: `${bom.presion_maxima_psi} PSI` });
        if (bom.tipo_bomba) atributosBom.push({ etiqueta: 'Tipo de Bomba', valor: bom.tipo_bomba });
        if (bom.diametro_succion_pulg || bom.diametro_descarga_pulg) {
          atributosBom.push({ etiqueta: 'Succión / Descarga', valor: `${bom.diametro_succion_pulg || '-'}" / ${bom.diametro_descarga_pulg || '-'}"` });
        }
        if (bom.potencia_hidraulica_kw) atributosBom.push({ etiqueta: 'Potencia Hidráulica', valor: `${bom.potencia_hidraulica_kw} kW` });

        if (atributosBom.length > 0) {
          bloques.push({ nombreModulo: 'BOMBA HIDRÁULICA', atributos: atributosBom });
        }
      }
    }

    // Fallback general si no hay bloques técnicos detallados
    if (bloques.length === 0) {
      const atributosBase: AtributoPlaca[] = [
        { etiqueta: 'Equipo', valor: equipo.nombre_equipo || 'N/A' },
        { etiqueta: 'Código', valor: equipo.codigo_equipo || 'N/A' },
        { etiqueta: 'Serie', valor: serie, rolSemantico: 'serie' },
        { etiqueta: 'Marca', valor: marca, rolSemantico: 'marca' },
      ];
      if (modelo) {
        atributosBase.push({ etiqueta: 'Modelo', valor: modelo, rolSemantico: 'modelo' });
      }
      bloques.push({
        nombreModulo: 'DATOS DE IDENTIFICACIÓN',
        atributos: atributosBase,
      });
    }

    return {
      categoriaCanonica,
      marca,
      modelo,
      serie,
      capacidadPrincipal,
      kpis,
      bloques,
    };
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
