-- ============================================================================
-- MEKANOS S.A.S - Migración Fase 1: Metamodelo Universal de Activos EAM
-- ============================================================================
-- Estrategia: Estrictamente Aditiva e Idempotente (Zero-Downtime, Zero-DataLoss)
-- PostgreSQL / Supabase Producción
-- ============================================================================

BEGIN;

-- 1. Nivel -1: catalogo_magnitudes
CREATE TABLE IF NOT EXISTS catalogo_magnitudes (
  id_magnitud SERIAL PRIMARY KEY,
  codigo_magnitud VARCHAR(50) NOT NULL UNIQUE,
  nombre_magnitud VARCHAR(100) NOT NULL,
  descripcion TEXT,
  unidad_base_codigo VARCHAR(10),
  es_sistema BOOLEAN NOT NULL DEFAULT TRUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. unidades_medida (evolución aditiva)
ALTER TABLE unidades_medida
  ADD COLUMN IF NOT EXISTS id_magnitud INTEGER,
  ADD COLUMN IF NOT EXISTS factor_a DECIMAL(18, 10) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS factor_b DECIMAL(18, 10) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS es_unidad_base BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_unidades_medida_magnitud ON unidades_medida (id_magnitud);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_unidades_medida_magnitud'
  ) THEN
    ALTER TABLE unidades_medida
      ADD CONSTRAINT fk_unidades_medida_magnitud
      FOREIGN KEY (id_magnitud) REFERENCES catalogo_magnitudes(id_magnitud) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Nivel 0: atributos_tecnicos
CREATE TABLE IF NOT EXISTS atributos_tecnicos (
  id_atributo SERIAL PRIMARY KEY,
  codigo_atributo VARCHAR(60) NOT NULL UNIQUE,
  nombre_atributo VARCHAR(120) NOT NULL,
  descripcion TEXT,
  tipo_control VARCHAR(30) NOT NULL,
  id_magnitud INTEGER REFERENCES catalogo_magnitudes(id_magnitud) ON DELETE SET NULL,
  unidad_defecto_codigo VARCHAR(10) REFERENCES unidades_medida(codigo) ON DELETE SET NULL,
  rol_semantico VARCHAR(40) NOT NULL DEFAULT 'ESTANDAR',
  opciones_json JSONB,
  validacion_json JSONB,
  es_sistema BOOLEAN NOT NULL DEFAULT FALSE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_atributos_rol_semantico ON atributos_tecnicos (rol_semantico);
CREATE INDEX IF NOT EXISTS idx_atributos_magnitud ON atributos_tecnicos (id_magnitud);

-- 4. Nivel 1: modulos_tecnicos
CREATE TABLE IF NOT EXISTS modulos_tecnicos (
  id_modulo SERIAL PRIMARY KEY,
  codigo_modulo VARCHAR(50) NOT NULL UNIQUE,
  nombre_modulo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  icono VARCHAR(50),
  color_ui VARCHAR(20),
  es_sistema BOOLEAN NOT NULL DEFAULT FALSE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

-- 5. modulo_atributos (puente N:M)
CREATE TABLE IF NOT EXISTS modulo_atributos (
  id_modulo_atributo SERIAL PRIMARY KEY,
  id_modulo INTEGER NOT NULL REFERENCES modulos_tecnicos(id_modulo) ON DELETE CASCADE,
  id_atributo INTEGER NOT NULL REFERENCES atributos_tecnicos(id_atributo) ON DELETE RESTRICT,
  orden_visual INTEGER NOT NULL DEFAULT 1,
  obligatorio BOOLEAN NOT NULL DEFAULT FALSE,
  es_kpi BOOLEAN NOT NULL DEFAULT FALSE,
  es_filtrable BOOLEAN NOT NULL DEFAULT FALSE,
  visible_en_pdf BOOLEAN NOT NULL DEFAULT TRUE,
  rol_semantico_override VARCHAR(40),
  grupo_visual VARCHAR(60),
  valor_defecto TEXT,
  fecha_creacion TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_modulo_atributos_modulo_atributo UNIQUE (id_modulo, id_atributo)
);

CREATE INDEX IF NOT EXISTS idx_modulo_atributos_modulo ON modulo_atributos (id_modulo);
CREATE INDEX IF NOT EXISTS idx_modulo_atributos_atributo ON modulo_atributos (id_atributo);

-- 6. Nivel 2: tipos_equipo (evolución aditiva)
ALTER TABLE tipos_equipo
  ADD COLUMN IF NOT EXISTS icono_ui VARCHAR(50),
  ADD COLUMN IF NOT EXISTS color_hex VARCHAR(20),
  ADD COLUMN IF NOT EXISTS prefijo_codigo VARCHAR(20),
  ADD COLUMN IF NOT EXISTS unidad_uso VARCHAR(20) NOT NULL DEFAULT 'HORAS',
  ADD COLUMN IF NOT EXISTS etiqueta_contador VARCHAR(50) NOT NULL DEFAULT 'Horómetro',
  ADD COLUMN IF NOT EXISTS usa_plantilla_universal BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS version_esquema INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bloques_opcionales JSONB;

-- 7. tipo_equipo_modulos (puente arquetipo - módulos)
CREATE TABLE IF NOT EXISTS tipo_equipo_modulos (
  id_tipo_equipo_modulo SERIAL PRIMARY KEY,
  id_tipo_equipo INTEGER NOT NULL REFERENCES tipos_equipo(id_tipo_equipo) ON DELETE CASCADE,
  id_modulo INTEGER NOT NULL REFERENCES modulos_tecnicos(id_modulo) ON DELETE RESTRICT,
  orden_visual INTEGER NOT NULL DEFAULT 1,
  obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
  etiqueta_local VARCHAR(100),
  overrides_json JSONB,
  fecha_creacion TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_tipo_equipo_modulos_tipo_modulo UNIQUE (id_tipo_equipo, id_modulo)
);

CREATE INDEX IF NOT EXISTS idx_tipo_equipo_modulos_tipo ON tipo_equipo_modulos (id_tipo_equipo);
CREATE INDEX IF NOT EXISTS idx_tipo_equipo_modulos_modulo ON tipo_equipo_modulos (id_modulo);

-- 8. tipo_equipo_planes (planes de mantenimiento preventivo base)
CREATE TABLE IF NOT EXISTS tipo_equipo_planes (
  id_plan SERIAL PRIMARY KEY,
  id_tipo_equipo INTEGER NOT NULL REFERENCES tipos_equipo(id_tipo_equipo) ON DELETE CASCADE,
  id_tipo_servicio INTEGER NOT NULL REFERENCES tipos_servicio(id_tipo_servicio) ON DELETE RESTRICT,
  nombre_plan VARCHAR(120) NOT NULL,
  frecuencia_dias INTEGER,
  frecuencia_uso DECIMAL(10, 1),
  criterio_intervalo VARCHAR(30) NOT NULL DEFAULT 'LO_QUE_OCURRA_PRIMERO',
  es_plan_por_defecto BOOLEAN NOT NULL DEFAULT TRUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_tipo_equipo_planes_tipo_servicio UNIQUE (id_tipo_equipo, id_tipo_servicio)
);

CREATE INDEX IF NOT EXISTS idx_tipo_equipo_planes_tipo ON tipo_equipo_planes (id_tipo_equipo);
CREATE INDEX IF NOT EXISTS idx_tipo_equipo_planes_servicio ON tipo_equipo_planes (id_tipo_servicio);

-- 9. Nivel 3: modelos_equipo (Modelos Maestros OEM)
CREATE TABLE IF NOT EXISTS modelos_equipo (
  id_modelo_equipo SERIAL PRIMARY KEY,
  id_tipo_equipo INTEGER NOT NULL REFERENCES tipos_equipo(id_tipo_equipo) ON DELETE RESTRICT,
  codigo_modelo VARCHAR(60) NOT NULL UNIQUE,
  marca VARCHAR(100) NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  nombre_comercial VARCHAR(150),
  especificaciones_base JSONB NOT NULL DEFAULT '{}'::jsonb,
  plantilla_parametros_config JSONB,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_modelos_equipo_tipo ON modelos_equipo (id_tipo_equipo);
CREATE INDEX IF NOT EXISTS idx_modelos_equipo_marca_modelo ON modelos_equipo (marca, modelo);

-- 10. modelos_equipo_bom (Kits BOM de repuestos predeterminados)
CREATE TABLE IF NOT EXISTS modelos_equipo_bom (
  id_modelo_bom SERIAL PRIMARY KEY,
  id_modelo_equipo INTEGER NOT NULL REFERENCES modelos_equipo(id_modelo_equipo) ON DELETE CASCADE,
  id_componente INTEGER NOT NULL REFERENCES catalogo_componentes(id_componente) ON DELETE RESTRICT,
  cantidad_sugerida DECIMAL(10, 2) NOT NULL DEFAULT 1.0,
  rol_bom VARCHAR(30) NOT NULL DEFAULT 'TITULAR',
  notas TEXT,
  fecha_creacion TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_modelos_equipo_bom_modelo_componente UNIQUE (id_modelo_equipo, id_componente)
);

CREATE INDEX IF NOT EXISTS idx_modelos_equipo_bom_modelo ON modelos_equipo_bom (id_modelo_equipo);
CREATE INDEX IF NOT EXISTS idx_modelos_equipo_bom_componente ON modelos_equipo_bom (id_componente);

-- 11. Nivel 4: equipos (evolución aditiva)
ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS id_modelo_equipo INTEGER,
  ADD COLUMN IF NOT EXISTS especificaciones JSONB,
  ADD COLUMN IF NOT EXISTS esquema_version INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_equipos_modelo_equipo'
  ) THEN
    ALTER TABLE equipos
      ADD CONSTRAINT fk_equipos_modelo_equipo
      FOREIGN KEY (id_modelo_equipo) REFERENCES modelos_equipo(id_modelo_equipo) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_equipos_especificaciones_gin ON equipos USING gin (especificaciones jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_equipos_modelo_equipo ON equipos (id_modelo_equipo);

-- 12. equipos_atributos_filtro (Proyección B-Tree para consultas ultrarrápidas)
CREATE TABLE IF NOT EXISTS equipos_atributos_filtro (
  id_filtro SERIAL PRIMARY KEY,
  id_equipo INTEGER NOT NULL REFERENCES equipos(id_equipo) ON DELETE CASCADE,
  codigo_atributo VARCHAR(60) NOT NULL,
  valor_num_base DECIMAL(18, 6),
  valor_texto VARCHAR(255),
  unidad_base_codigo VARCHAR(10),
  fecha_actualizacion TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_equipos_attr_filtro_num ON equipos_atributos_filtro (codigo_atributo, valor_num_base);
CREATE INDEX IF NOT EXISTS idx_equipos_attr_filtro_texto ON equipos_atributos_filtro (codigo_atributo, valor_texto);
CREATE INDEX IF NOT EXISTS idx_equipos_attr_filtro_equipo ON equipos_atributos_filtro (id_equipo);

-- 13. parametros_medicion (evolución aditiva)
ALTER TABLE parametros_medicion
  ADD COLUMN IF NOT EXISTS unidad_codigo VARCHAR(10);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_parametros_medicion_unidad_codigo'
  ) THEN
    ALTER TABLE parametros_medicion
      ADD CONSTRAINT fk_parametros_medicion_unidad_codigo
      FOREIGN KEY (unidad_codigo) REFERENCES unidades_medida(codigo) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_parametros_medicion_unidad_codigo ON parametros_medicion (unidad_codigo);

COMMIT;
