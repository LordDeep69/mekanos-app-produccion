-- ============================================================================
-- FASE 1: Upgrade Idempotente Segura para Instancia Existente PostgreSQL
-- Cimientos White-Label, RBAC Permisos, Integridad DDL (Secuencias + FKs)
-- ============================================================================
BEGIN;

-- 1. Crear secuencias nativas y asignar DEFAULT nextval() + setval en 23 tablas
DO $$
DECLARE
  r RECORD;
  seq_name TEXT;
  max_val BIGINT;
  has_rows BOOLEAN;
BEGIN
  FOR r IN (
    SELECT t_name, c_name FROM (VALUES
      ('certificaciones_tecnicas', 'id_certificacion'),
      ('contactos_adicionales', 'id_contacto'),
      ('devoluciones_proveedor', 'id_devolucion'),
      ('equipos_contrato', 'id_equipo_contrato'),
      ('estados_cotizacion', 'id_estado'),
      ('gastos_orden', 'id_gasto'),
      ('historial_contrato', 'id_historial'),
      ('historial_envios', 'id_envio'),
      ('historial_estados_equipo', 'id_historial'),
      ('items_cotizacion_componentes', 'id_item_componente'),
      ('items_cotizacion_servicios', 'id_item_servicio'),
      ('items_propuesta', 'id_item_propuesta'),
      ('motivos_rechazo', 'id_motivo_rechazo'),
      ('notificaciones', 'id_notificacion'),
      ('permisos', 'id_permiso'),
      ('plantillas_informe', 'id_plantilla_informe'),
      ('plantillas_parametros', 'id_plantilla'),
      ('propuestas_correctivo', 'id_propuesta'),
      ('remisiones', 'id_remision'),
      ('remisiones_detalle', 'id_detalle_remision'),
      ('roles', 'id_rol'),
      ('tipos_componente', 'id_tipo_componente'),
      ('versiones_cotizacion', 'id_version')
    ) AS v(t_name, c_name)
  ) LOOP
    seq_name := r.t_name || '_' || r.c_name || '_seq';
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS public.%I', seq_name);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT nextval(%L)', r.t_name, r.c_name, 'public.' || seq_name);
    EXECUTE format('ALTER SEQUENCE public.%I OWNED BY public.%I.%I', seq_name, r.t_name, r.c_name);
    EXECUTE format('SELECT COALESCE(MAX(%I), 0), COUNT(*) > 0 FROM public.%I', r.c_name, r.t_name)
      INTO max_val, has_rows;
    IF has_rows THEN
      EXECUTE format('SELECT setval(%L, %s, true)', 'public.' || seq_name, GREATEST(max_val, 1));
    ELSE
      EXECUTE format('SELECT setval(%L, 1, false)', 'public.' || seq_name);
    END IF;
  END LOOP;
END $$;

-- 2. Corregir las 73 FKs con ON DELETE SET NULL sobre columnas NOT NULL
DO $$
DECLARE
  r RECORD;
  new_def TEXT;
  target_table TEXT;
  is_cascade BOOLEAN;
BEGIN
  FOR r IN (
    SELECT con.oid,
           con.conname,
           cls.relname AS table_name,
           ref_cls.relname AS ref_table_name,
           pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_class ref_cls ON ref_cls.oid = con.confrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE nsp.nspname = 'public'
      AND con.contype = 'f'
      AND con.confdeltype = 'n'
      AND EXISTS (
        SELECT 1
        FROM pg_attribute att
        WHERE att.attrelid = con.conrelid
          AND att.attnum = ANY(con.conkey)
          AND att.attnotnull = true
      )
  ) LOOP
    is_cascade := (r.table_name, r.ref_table_name) IN (
      ('actividades_ejecutadas', 'ordenes_servicio'),
      ('archivos_equipo', 'equipos'),
      ('bitacoras_informes', 'bitacoras'),
      ('bitacoras_informes', 'informes'),
      ('certificaciones_tecnicas', 'empleados'),
      ('componentes_equipo', 'equipos'),
      ('componentes_usados', 'ordenes_servicio'),
      ('detalle_servicios_orden', 'ordenes_servicio'),
      ('equipos_bomba', 'equipos'),
      ('equipos_contrato', 'contratos_mantenimiento'),
      ('equipos_generador', 'equipos'),
      ('equipos_motor', 'equipos'),
      ('evidencias_fotograficas', 'ordenes_servicio'),
      ('gastos_orden', 'ordenes_servicio'),
      ('historial_contrato', 'contratos_mantenimiento'),
      ('historial_estados_equipo', 'equipos'),
      ('historial_estados_orden', 'ordenes_servicio'),
      ('informes', 'ordenes_servicio'),
      ('items_cotizacion_componentes', 'cotizaciones'),
      ('items_cotizacion_servicios', 'cotizaciones'),
      ('items_propuesta', 'propuestas_correctivo'),
      ('lecturas_horometro', 'equipos'),
      ('mediciones_servicio', 'ordenes_servicio'),
      ('ordenes_actividades_plan', 'ordenes_servicio'),
      ('ordenes_compra_detalle', 'ordenes_compra'),
      ('ordenes_equipos', 'ordenes_servicio'),
      ('remisiones_detalle', 'remisiones'),
      ('roles_permisos', 'permisos'),
      ('roles_permisos', 'roles'),
      ('usuarios_roles', 'roles'),
      ('versiones_cotizacion', 'cotizaciones')
    );

    new_def := regexp_replace(
      r.def,
      'ON DELETE SET NULL',
      CASE WHEN is_cascade THEN 'ON DELETE CASCADE' ELSE 'ON DELETE NO ACTION' END,
      'i'
    );
    IF new_def = r.def THEN
      RAISE EXCEPTION 'No se pudo reemplazar ON DELETE SET NULL en % (%): %', r.conname, r.table_name, r.def;
    END IF;

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.table_name, r.conname);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s', r.table_name, r.conname, new_def);
  END LOOP;
END $$;

-- 3. Crear tabla singleton white-label configuracion_organizacion
CREATE TABLE IF NOT EXISTS public.configuracion_organizacion (
  id_configuracion                   INTEGER      NOT NULL DEFAULT 1,
  nombre_comercial                   VARCHAR(150) NOT NULL DEFAULT 'Mi Organización',
  razon_social                       VARCHAR(200) NOT NULL DEFAULT 'Mi Organización S.A.',
  tipo_id_fiscal                     VARCHAR(30)  NOT NULL DEFAULT 'NIT',
  numero_id_fiscal                   VARCHAR(60),
  eslogan                            VARCHAR(255),
  sitio_web                          VARCHAR(255),
  email_contacto                     VARCHAR(255),
  telefono_principal                 VARCHAR(50),
  telefono_soporte                   VARCHAR(50),
  direccion_linea1                   VARCHAR(300),
  ciudad_defecto                     VARCHAR(100) NOT NULL DEFAULT 'Ciudad',
  departamento_defecto               VARCHAR(100),
  pais_defecto                       VARCHAR(100) NOT NULL DEFAULT 'Colombia',
  codigo_pais_iso                    VARCHAR(5)   NOT NULL DEFAULT 'CO',
  logo_principal_url                 VARCHAR(500),
  logo_claro_url                     VARCHAR(500),
  isotipo_url                        VARCHAR(500),
  favicon_url                        VARCHAR(500),
  color_primario                     VARCHAR(20)  NOT NULL DEFAULT '#1E40AF',
  color_secundario                   VARCHAR(20)  NOT NULL DEFAULT '#0F172A',
  color_acento                       VARCHAR(20)  NOT NULL DEFAULT '#0EA5E9',
  color_exito                        VARCHAR(20)  NOT NULL DEFAULT '#16A34A',
  color_alerta                       VARCHAR(20)  NOT NULL DEFAULT '#D97706',
  color_peligro                      VARCHAR(20)  NOT NULL DEFAULT '#DC2626',
  zona_horaria                       VARCHAR(80)  NOT NULL DEFAULT 'America/Bogota',
  locale                             VARCHAR(20)  NOT NULL DEFAULT 'es-CO',
  codigo_moneda                      VARCHAR(10)  NOT NULL DEFAULT 'COP',
  simbolo_moneda                     VARCHAR(10)  NOT NULL DEFAULT '$',
  decimales_moneda                   INTEGER      NOT NULL DEFAULT 0,
  etiqueta_impuesto                  VARCHAR(30)  NOT NULL DEFAULT 'IVA',
  tasa_impuesto_defecto              DECIMAL(5,2) NOT NULL DEFAULT 19.00,
  prefijo_orden                      VARCHAR(20)  NOT NULL DEFAULT 'OS',
  prefijo_cotizacion                 VARCHAR(20)  NOT NULL DEFAULT 'COT',
  prefijo_informe                    VARCHAR(20)  NOT NULL DEFAULT 'INF',
  prefijo_remision                   VARCHAR(20)  NOT NULL DEFAULT 'REM',
  prefijo_oc                         VARCHAR(20)  NOT NULL DEFAULT 'OC',
  prefijo_contrato                   VARCHAR(20)  NOT NULL DEFAULT 'CONT',
  prefijo_propuesta                  VARCHAR(20)  NOT NULL DEFAULT 'PROP',
  texto_pie_pdf                      TEXT,
  texto_disclaimer_repuestos_cliente TEXT,
  garantia_meses_defecto             INTEGER      NOT NULL DEFAULT 3,
  validez_cotizacion_dias_defecto    INTEGER      NOT NULL DEFAULT 30,
  requiere_firma_cliente_defecto     BOOLEAN      NOT NULL DEFAULT true,
  storage_prefijo_raiz               VARCHAR(100) NOT NULL DEFAULT 'eam-media',
  politica_retencion_mobile_dias     INTEGER      NOT NULL DEFAULT 30,
  modulo_comercial_activo            BOOLEAN      NOT NULL DEFAULT true,
  modulo_inventario_activo           BOOLEAN      NOT NULL DEFAULT true,
  fecha_creacion                     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion                 TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por                     INTEGER,
  CONSTRAINT configuracion_organizacion_pkey PRIMARY KEY (id_configuracion),
  CONSTRAINT chk_configuracion_organizacion_singleton CHECK (id_configuracion = 1)
);

-- 4. Crear catalogo extensible de categorias de activo y puente N:M tipos_componente <-> tipos_equipo
CREATE TABLE IF NOT EXISTS public.categorias_activo (
  id_categoria_activo SERIAL       PRIMARY KEY,
  codigo              VARCHAR(40)  NOT NULL,
  nombre              VARCHAR(100) NOT NULL,
  descripcion         TEXT,
  icono_ui            VARCHAR(50),
  color_hex           VARCHAR(20),
  orden               INTEGER      NOT NULL DEFAULT 0,
  activo              BOOLEAN      NOT NULL DEFAULT true,
  fecha_creacion      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS categorias_activo_codigo_key
  ON public.categorias_activo (codigo);
CREATE INDEX IF NOT EXISTS idx_categorias_activo_activo_orden
  ON public.categorias_activo (activo, orden);

ALTER TABLE public.tipos_equipo
  ADD COLUMN IF NOT EXISTS id_categoria_activo INTEGER;

ALTER TABLE public.tipos_equipo
  ALTER COLUMN categoria DROP NOT NULL,
  ALTER COLUMN categoria SET DEFAULT 'OTRO'::categoria_equipo_enum;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tipos_equipo_categoria_activo'
  ) THEN
    ALTER TABLE public.tipos_equipo
      ADD CONSTRAINT fk_tipos_equipo_categoria_activo
      FOREIGN KEY (id_categoria_activo)
      REFERENCES public.categorias_activo (id_categoria_activo)
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tipos_componente_tipo_equipo (
  id_tipo_componente INTEGER      NOT NULL,
  id_tipo_equipo     INTEGER      NOT NULL,
  fecha_creacion     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tipos_componente_tipo_equipo_pkey PRIMARY KEY (id_tipo_componente, id_tipo_equipo),
  CONSTRAINT fk_tc_te_tipo_componente FOREIGN KEY (id_tipo_componente)
    REFERENCES public.tipos_componente (id_tipo_componente) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_tc_te_tipo_equipo FOREIGN KEY (id_tipo_equipo)
    REFERENCES public.tipos_equipo (id_tipo_equipo) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_tc_te_tipo_equipo
  ON public.tipos_componente_tipo_equipo (id_tipo_equipo);

ALTER TABLE public.tipos_componente
  ADD COLUMN IF NOT EXISTS aplica_todos_tipos BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.tipos_componente
  ALTER COLUMN aplica_a DROP NOT NULL,
  ALTER COLUMN aplica_a SET DEFAULT 'AMBOS'::aplicabilidad_enum;

-- 5. Evolucion de cuentas_email hacia SMTP agnostico + GMAIL_OAUTH2 opcional
ALTER TABLE public.cuentas_email
  ADD COLUMN IF NOT EXISTS tipo_proveedor    VARCHAR(20) NOT NULL DEFAULT 'GMAIL_OAUTH2',
  ADD COLUMN IF NOT EXISTS nombre_remitente  VARCHAR(150),
  ADD COLUMN IF NOT EXISTS smtp_host         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_port         INTEGER,
  ADD COLUMN IF NOT EXISTS smtp_secure       BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS smtp_user         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_password_enc TEXT;

ALTER TABLE public.cuentas_email
  ALTER COLUMN gmail_client_id DROP NOT NULL,
  ALTER COLUMN gmail_client_secret DROP NOT NULL,
  ALTER COLUMN gmail_refresh_token DROP NOT NULL;

-- 6. Campos agnosticos de lectura de uso en equipos y ampliacion VarChar(20) en unidades
ALTER TABLE public.equipos
  ADD COLUMN IF NOT EXISTS lectura_uso_actual       DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_ultima_lectura_uso TIMESTAMP(6);

ALTER TABLE public.parametros_medicion
  ALTER COLUMN unidad_codigo TYPE VARCHAR(20);
ALTER TABLE public.equipos_atributos_filtro
  ALTER COLUMN unidad_base_codigo TYPE VARCHAR(20);
ALTER TABLE public.catalogo_componentes
  ALTER COLUMN codigo_unidad_medida TYPE VARCHAR(20);

-- 7. Backfills seguros de datos existentes
UPDATE public.equipos
   SET lectura_uso_actual = horas_actuales,
       fecha_ultima_lectura_uso = fecha_ultima_lectura_horas
 WHERE horas_actuales IS NOT NULL
   AND (lectura_uso_actual IS NULL OR lectura_uso_actual = 0);

INSERT INTO public.categorias_activo (codigo, nombre, descripcion, icono_ui, color_hex, orden)
VALUES
  ('ENERGIA', 'Energía y Generación', 'Grupos electrógenos, motores diésel, UPS y tableros de transferencia', 'zap', '#F59E0B', 1),
  ('HIDRAULICA', 'Hidráulica y Bombeo', 'Electrobombas, sistemas de presión constante, redes contra incendio', 'droplets', '#0EA5E9', 2),
  ('CLIMATIZACION', 'Climatización y HVAC', 'Chillers, manejadoras, VRF, torres de enfriamiento', 'wind', '#06B6D4', 3),
  ('COMPRESION', 'Aire Comprimido', 'Compresores rotativos/pistón, secadores y tanques pulmón', 'gauge', '#6366F1', 4),
  ('TRANSPORTE_VERTICAL', 'Transporte Vertical', 'Ascensores, montacargas, escaleras eléctricas', 'arrow-up-down', '#10B981', 5),
  ('ACCESOS_AUTOMATICOS', 'Accesos Automáticos', 'Puertas seccionales, talanqueras, portones industriales', 'door-open', '#8B5CF6', 6),
  ('SUBESTACIONES', 'Subestaciones y Media Tensión', 'Transformadores, celdas de media tensión, seccionadores', 'cpu', '#EF4444', 7),
  ('INFRAESTRUCTURA', 'Infraestructura y Tuberías', 'Líneas de conducción, válvulas, obra mecánica general', 'wrench', '#64748B', 8),
  ('OTRO', 'Otros Activos Técnicos', 'Activos industriales especializados y maquinaria diversa', 'box', '#94A3B8', 9)
ON CONFLICT (codigo) DO NOTHING;

UPDATE public.tipos_equipo te
   SET id_categoria_activo = ca.id_categoria_activo
  FROM public.categorias_activo ca
 WHERE te.id_categoria_activo IS NULL
   AND ca.codigo = CASE
     WHEN te.codigo_tipo IN ('ELEV', 'ASCENSOR') THEN 'TRANSPORTE_VERTICAL'
     WHEN te.categoria IS NOT NULL THEN te.categoria::text
     ELSE 'OTRO'
   END;

-- Migrar aplicabilidad de tipos_componente a relacion N:M
UPDATE public.tipos_componente
   SET aplica_todos_tipos = CASE WHEN aplica_a = 'AMBOS' OR aplica_a IS NULL THEN true ELSE false END;

INSERT INTO public.tipos_componente_tipo_equipo (id_tipo_componente, id_tipo_equipo)
SELECT tc.id_tipo_componente, te.id_tipo_equipo
  FROM public.tipos_componente tc
  JOIN public.tipos_equipo te
    ON (tc.aplica_a = 'GENERADOR' AND te.codigo_tipo IN ('GENERADOR', 'GEN', 'MOTOR', 'MOT'))
    OR (tc.aplica_a = 'BOMBA' AND te.codigo_tipo IN ('BOMBA', 'BOM'))
ON CONFLICT (id_tipo_componente, id_tipo_equipo) DO NOTHING;

-- Singleton inicial configuracion_organizacion (solo si no existe)
INSERT INTO public.configuracion_organizacion (id_configuracion)
VALUES (1)
ON CONFLICT (id_configuracion) DO NOTHING;

-- 8. Backfill RBAC roles_permisos y rol ADMIN para cuenta admin principal sin roles
INSERT INTO public.usuarios_roles (id_usuario, id_rol, fecha_asignacion)
SELECT u.id_usuario, r.id_rol, NOW()
  FROM public.usuarios u
  JOIN public.roles r ON r.codigo_rol = 'ADMIN'
 WHERE u.username = 'admin'
   AND NOT EXISTS (
     SELECT 1 FROM public.usuarios_roles ur WHERE ur.id_usuario = u.id_usuario
   )
ON CONFLICT (id_usuario, id_rol) DO NOTHING;

INSERT INTO public.roles_permisos (id_rol, id_permiso, fecha_asignacion)
SELECT r.id_rol, p.id_permiso, NOW()
  FROM public.roles r
  CROSS JOIN public.permisos p
 WHERE r.codigo_rol IN ('ADMIN', 'SUPERADMIN')
   AND p.modulo <> 'testing'
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

INSERT INTO public.roles_permisos (id_rol, id_permiso, fecha_asignacion)
SELECT r.id_rol, p.id_permiso, NOW()
  FROM public.roles r
  CROSS JOIN public.permisos p
 WHERE r.codigo_rol = 'GERENTE'
   AND p.modulo <> 'testing'
   AND p.codigo_permiso NOT IN ('CONFIG_BACKUP')
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

INSERT INTO public.roles_permisos (id_rol, id_permiso, fecha_asignacion)
SELECT r.id_rol, p.id_permiso, NOW()
  FROM public.roles r
  JOIN public.permisos p ON p.codigo_permiso IN (
    'ORDENES_READ', 'ORDENES_CREATE', 'ORDENES_UPDATE', 'ORDENES_ASSIGN', 'ORDENES_EXECUTE',
    'ORDENES_EVIDENCE', 'ORDENES_SIGNATURE', 'ORDENES_REPORT', 'ORDENES_APPROVE',
    'EQUIPOS_READ', 'EQUIPOS_CREATE', 'EQUIPOS_UPDATE', 'EQUIPOS_FILES', 'EQUIPOS_EXPORT', 'EQUIPOS_HISTORY',
    'CLIENTES_READ', 'INFORMES_READ', 'INFORMES_CREATE', 'INFORMES_APPROVE', 'INFORMES_EXPORT',
    'INVENTARIO_READ', 'INVENTARIO_REPORTS'
  )
 WHERE r.codigo_rol = 'SUPERVISOR'
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

INSERT INTO public.roles_permisos (id_rol, id_permiso, fecha_asignacion)
SELECT r.id_rol, p.id_permiso, NOW()
  FROM public.roles r
  JOIN public.permisos p ON p.codigo_permiso IN (
    'ORDENES_READ', 'ORDENES_EXECUTE', 'ORDENES_EVIDENCE', 'ORDENES_SIGNATURE', 'ORDENES_REPORT',
    'EQUIPOS_READ', 'EQUIPOS_FILES', 'CLIENTES_READ',
    'INFORMES_READ', 'INFORMES_CREATE', 'INVENTARIO_READ'
  )
 WHERE r.codigo_rol IN ('TECNICO', 'TECNICO_SENIOR')
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

INSERT INTO public.roles_permisos (id_rol, id_permiso, fecha_asignacion)
SELECT r.id_rol, p.id_permiso, NOW()
  FROM public.roles r
  JOIN public.permisos p ON p.codigo_permiso IN (
    'CLIENTES_READ', 'CLIENTES_CREATE', 'CLIENTES_UPDATE',
    'COTIZACIONES_READ', 'COTIZACIONES_CREATE', 'COTIZACIONES_UPDATE', 'COTIZACIONES_SEND',
    'COTIZACIONES_VERSION', 'COTIZACIONES_APPROVE', 'COTIZACIONES_CONVERT',
    'EQUIPOS_READ', 'ORDENES_READ', 'ORDENES_CREATE', 'INFORMES_READ', 'INVENTARIO_READ'
  )
 WHERE r.codigo_rol IN ('ASESOR', 'ASESOR_COMERCIAL')
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

INSERT INTO public.roles_permisos (id_rol, id_permiso, fecha_asignacion)
SELECT r.id_rol, p.id_permiso, NOW()
  FROM public.roles r
  JOIN public.permisos p ON p.codigo_permiso IN (
    'ORDENES_READ', 'ORDENES_CREATE', 'ORDENES_UPDATE', 'ORDENES_ASSIGN',
    'CLIENTES_READ', 'CLIENTES_CREATE', 'CLIENTES_UPDATE',
    'EQUIPOS_READ', 'EQUIPOS_CREATE', 'EQUIPOS_UPDATE', 'EQUIPOS_FILES',
    'INVENTARIO_READ', 'INVENTARIO_CREATE', 'INVENTARIO_TRANSFER', 'INFORMES_READ'
  )
 WHERE r.codigo_rol = 'AUXILIAR'
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

INSERT INTO public.roles_permisos (id_rol, id_permiso, fecha_asignacion)
SELECT r.id_rol, p.id_permiso, NOW()
  FROM public.roles r
  JOIN public.permisos p ON p.codigo_permiso IN (
    'CLIENTES_PORTAL', 'ORDENES_READ', 'EQUIPOS_READ', 'INFORMES_READ', 'COTIZACIONES_READ'
  )
 WHERE r.codigo_rol IN ('CLIENTE', 'CLIENTE_PORTAL')
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- 9. Sanitizar password_plain manteniendo columna nullable DEFAULT NULL para compatibilidad con clientes Prisma legacy (origin/main)
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS password_plain VARCHAR(255) DEFAULT NULL;
ALTER TABLE public.usuarios ALTER COLUMN password_plain DROP NOT NULL;
ALTER TABLE public.usuarios ALTER COLUMN password_plain SET DEFAULT NULL;
UPDATE public.usuarios SET password_plain = NULL WHERE password_plain IS NOT NULL;

-- 10. Aplicabilidad N:M directa a nivel de articulo maestro (catalogo_componentes <-> tipos_equipo)
ALTER TABLE public.catalogo_componentes
  ADD COLUMN IF NOT EXISTS aplica_todos_tipos BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.catalogo_componentes_tipo_equipo (
  id_componente   INTEGER NOT NULL REFERENCES public.catalogo_componentes(id_componente) ON DELETE CASCADE,
  id_tipo_equipo  INTEGER NOT NULL REFERENCES public.tipos_equipo(id_tipo_equipo) ON DELETE CASCADE,
  fecha_creacion  TIMESTAMP(6) NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_componente, id_tipo_equipo)
);
CREATE INDEX IF NOT EXISTS idx_cc_te_tipo_equipo ON public.catalogo_componentes_tipo_equipo (id_tipo_equipo);

-- 11. Aplicabilidad granular opcional por Parte / Subsistema EAM (catalogo_componentes <-> modulos_tecnicos)
CREATE TABLE IF NOT EXISTS public.catalogo_componentes_modulo_tecnico (
  id_componente   INTEGER NOT NULL REFERENCES public.catalogo_componentes(id_componente) ON DELETE CASCADE,
  id_modulo       INTEGER NOT NULL REFERENCES public.modulos_tecnicos(id_modulo) ON DELETE CASCADE,
  fecha_creacion  TIMESTAMP(6) NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_componente, id_modulo)
);
CREATE INDEX IF NOT EXISTS idx_cc_mt_modulo ON public.catalogo_componentes_modulo_tecnico (id_modulo);

-- 12. Hub Comercial de Cotizaciones EAM-CPQ (Multi-Equipo, Rubros Indirectos/Logistica, AIU, Margen y Plantillas)
ALTER TABLE public.configuracion_organizacion
  ADD COLUMN IF NOT EXISTS umbral_aprobacion_supervisor DECIMAL(14,2) NOT NULL DEFAULT 5000000.00,
  ADD COLUMN IF NOT EXISTS umbral_aprobacion_gerente    DECIMAL(14,2) NOT NULL DEFAULT 15000000.00,
  ADD COLUMN IF NOT EXISTS descuento_max_sin_aprobacion DECIMAL(5,2)  NOT NULL DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS margen_minimo_alerta         DECIMAL(5,2)  NOT NULL DEFAULT 25.00,
  ADD COLUMN IF NOT EXISTS margen_minimo_aprobacion     DECIMAL(5,2)  NOT NULL DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS terminos_cotizacion_defecto  TEXT;

CREATE TABLE IF NOT EXISTS public.plantillas_cotizacion (
  id_plantilla                SERIAL PRIMARY KEY,
  codigo_plantilla            VARCHAR(60) UNIQUE NOT NULL,
  nombre                      VARCHAR(200) NOT NULL,
  descripcion                 TEXT,
  tipo_cotizacion             VARCHAR(40) NOT NULL DEFAULT 'SERVICIO_TECNICO',
  id_tipo_equipo              INTEGER REFERENCES public.tipos_equipo(id_tipo_equipo) ON DELETE SET NULL,
  id_modelo_equipo            INTEGER REFERENCES public.modelos_equipo(id_modelo_equipo) ON DELETE SET NULL,
  id_modulo                   INTEGER REFERENCES public.modulos_tecnicos(id_modulo) ON DELETE SET NULL,
  asunto_sugerido             VARCHAR(300),
  descripcion_general         TEXT,
  alcance_trabajo             TEXT,
  exclusiones                 TEXT,
  terminos_condiciones        TEXT,
  forma_pago                  VARCHAR(100) DEFAULT 'CONTADO',
  meses_garantia              INTEGER DEFAULT 3,
  tiempo_estimado_dias        INTEGER,
  usa_aiu                     BOOLEAN NOT NULL DEFAULT false,
  aiu_admin_porcentaje        DECIMAL(5,2) NOT NULL DEFAULT 0,
  aiu_imprevistos_porcentaje  DECIMAL(5,2) NOT NULL DEFAULT 0,
  aiu_utilidad_porcentaje     DECIMAL(5,2) NOT NULL DEFAULT 0,
  iva_sobre_utilidad_aiu      BOOLEAN NOT NULL DEFAULT false,
  veces_usada                 INTEGER NOT NULL DEFAULT 0,
  activo                      BOOLEAN NOT NULL DEFAULT true,
  creado_por                  INTEGER,
  fecha_creacion              TIMESTAMP(6) NOT NULL DEFAULT NOW(),
  fecha_modificacion          TIMESTAMP(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plantillas_cot_tipo ON public.plantillas_cotizacion (tipo_cotizacion, activo);
CREATE INDEX IF NOT EXISTS idx_plantillas_cot_equipo ON public.plantillas_cotizacion (id_tipo_equipo);
CREATE INDEX IF NOT EXISTS idx_plantillas_cot_modelo ON public.plantillas_cotizacion (id_modelo_equipo);

CREATE TABLE IF NOT EXISTS public.plantillas_cotizacion_items (
  id_plantilla_item      SERIAL PRIMARY KEY,
  id_plantilla           INTEGER NOT NULL REFERENCES public.plantillas_cotizacion(id_plantilla) ON DELETE CASCADE,
  tipo_linea             VARCHAR(20) NOT NULL,
  id_servicio            INTEGER REFERENCES public.catalogo_servicios(id_servicio) ON DELETE SET NULL,
  id_componente          INTEGER REFERENCES public.catalogo_componentes(id_componente) ON DELETE SET NULL,
  categoria_rubro        VARCHAR(40),
  descripcion            VARCHAR(300) NOT NULL,
  detalle_calculo        VARCHAR(200),
  unidad                 VARCHAR(30) DEFAULT 'unidad',
  cantidad_base          DECIMAL(10,2) NOT NULL DEFAULT 1,
  es_por_equipo          BOOLEAN NOT NULL DEFAULT true,
  usar_precio_catalogo   BOOLEAN NOT NULL DEFAULT true,
  precio_unitario_fijo   DECIMAL(12,2),
  costo_unitario_fijo    DECIMAL(12,2),
  visible_cliente        BOOLEAN NOT NULL DEFAULT true,
  es_opcional            BOOLEAN NOT NULL DEFAULT false,
  iva_aplicable          BOOLEAN NOT NULL DEFAULT true,
  garantia_meses         INTEGER,
  orden_item             INTEGER NOT NULL DEFAULT 0,
  observaciones          TEXT
);
CREATE INDEX IF NOT EXISTS idx_plantillas_cot_items_pl ON public.plantillas_cotizacion_items (id_plantilla, orden_item);

ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS tipo_cotizacion                  VARCHAR(40) NOT NULL DEFAULT 'SERVICIO_TECNICO',
  ADD COLUMN IF NOT EXISTS id_plantilla_origen              INTEGER REFERENCES public.plantillas_cotizacion(id_plantilla) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_propuesta_origen              INTEGER REFERENCES public.propuestas_correctivo(id_propuesta) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moneda                           VARCHAR(10),
  ADD COLUMN IF NOT EXISTS subtotal_otros                   DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usa_aiu                          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aiu_admin_porcentaje             DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aiu_imprevistos_porcentaje       DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aiu_utilidad_porcentaje          DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aiu_admin_valor                  DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aiu_imprevistos_valor            DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aiu_utilidad_valor               DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aiu_valor_total                  DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_sobre_utilidad_aiu           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subtotal_opcionales              DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_total_estimado             DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utilidad_bruta_estimada          DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margen_bruto_porcentaje          DECIMAL(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observaciones_aprobacion_cliente TEXT,
  ADD COLUMN IF NOT EXISTS orden_compra_cliente             VARCHAR(80),
  ADD COLUMN IF NOT EXISTS modo_agrupacion_pdf              VARCHAR(30) NOT NULL DEFAULT 'POR_CATEGORIA';

CREATE TABLE IF NOT EXISTS public.cotizaciones_equipos (
  id_cotizacion_equipo SERIAL PRIMARY KEY,
  id_cotizacion        INTEGER NOT NULL REFERENCES public.cotizaciones(id_cotizacion) ON DELETE CASCADE,
  id_equipo            INTEGER NOT NULL REFERENCES public.equipos(id_equipo) ON DELETE RESTRICT,
  orden_secuencia      INTEGER NOT NULL DEFAULT 1,
  notas_alcance        TEXT,
  fecha_creacion       TIMESTAMP(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cotizacion_equipo UNIQUE (id_cotizacion, id_equipo)
);
CREATE INDEX IF NOT EXISTS idx_cot_equipos_cot ON public.cotizaciones_equipos (id_cotizacion, orden_secuencia);
CREATE INDEX IF NOT EXISTS idx_cot_equipos_eq ON public.cotizaciones_equipos (id_equipo);

ALTER TABLE public.items_cotizacion_componentes
  ALTER COLUMN id_tipo_componente DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS id_equipo       INTEGER REFERENCES public.equipos(id_equipo) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS costo_unitario  DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS es_opcional     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iva_aplicable   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS seccion_titulo  VARCHAR(120);

ALTER TABLE public.items_cotizacion_servicios
  ALTER COLUMN id_servicio DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS id_equipo       INTEGER REFERENCES public.equipos(id_equipo) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS costo_unitario  DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS es_opcional     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iva_aplicable   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS seccion_titulo  VARCHAR(120);

CREATE TABLE IF NOT EXISTS public.items_cotizacion_otros (
  id_item_otro         SERIAL PRIMARY KEY,
  id_cotizacion        INTEGER NOT NULL REFERENCES public.cotizaciones(id_cotizacion) ON DELETE CASCADE,
  id_equipo            INTEGER REFERENCES public.equipos(id_equipo) ON DELETE SET NULL,
  categoria_rubro      VARCHAR(40) NOT NULL DEFAULT 'OTRO',
  descripcion          VARCHAR(300) NOT NULL,
  detalle_calculo      VARCHAR(200),
  cantidad             DECIMAL(10,2) NOT NULL DEFAULT 1,
  unidad               VARCHAR(30) DEFAULT 'global',
  costo_unitario       DECIMAL(12,2) NOT NULL DEFAULT 0,
  precio_unitario      DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 0,
  subtotal             DECIMAL(12,2) NOT NULL DEFAULT 0,
  visible_cliente      BOOLEAN NOT NULL DEFAULT true,
  es_opcional          BOOLEAN NOT NULL DEFAULT false,
  iva_aplicable        BOOLEAN NOT NULL DEFAULT true,
  orden_item           INTEGER NOT NULL DEFAULT 0,
  observaciones        TEXT,
  registrado_por       INTEGER,
  fecha_registro       TIMESTAMP(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_items_otros_cot ON public.items_cotizacion_otros (id_cotizacion, orden_item);

-- Backfill cotizaciones_equipos para cotizaciones legacy con id_equipo
INSERT INTO public.cotizaciones_equipos (id_cotizacion, id_equipo, orden_secuencia)
SELECT id_cotizacion, id_equipo, 1
  FROM public.cotizaciones
 WHERE id_equipo IS NOT NULL
ON CONFLICT (id_cotizacion, id_equipo) DO NOTHING;

-- 13. Gobernanza CPQ progresiva y bloqueo antifuga de precio unitario de catalogo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'configuracion_organizacion'
       AND column_name = 'enable_cpq_governance'
  ) THEN
    ALTER TABLE public.configuracion_organizacion
      ADD COLUMN enable_cpq_governance BOOLEAN NOT NULL DEFAULT false;

    -- Empresas existentes que ya tienen reglas configuradas conservan la gobernanza activa
    UPDATE public.configuracion_organizacion
       SET enable_cpq_governance = true
     WHERE COALESCE(umbral_aprobacion_supervisor, 0) > 0
        OR COALESCE(umbral_aprobacion_gerente, 0) > 0
        OR COALESCE(descuento_max_sin_aprobacion, 0) > 0
        OR COALESCE(margen_minimo_aprobacion, 0) > 0;
  END IF;
END $$;

ALTER TABLE public.configuracion_organizacion
  ADD COLUMN IF NOT EXISTS lock_catalog_unit_price BOOLEAN NOT NULL DEFAULT false;

COMMIT;

-- 14. Alineacion enum comercial de articulos maestros (fuera de transaccion para compatibilidad PostgreSQL)
ALTER TYPE public.tipo_componente_comercial_enum ADD VALUE IF NOT EXISTS 'HOMOLOGADO';

-- =============================================================================
-- Presentación Dual PDF Cotizaciones (Suma Alzada por defecto vs Detallado)
-- =============================================================================
ALTER TABLE IF EXISTS public.configuracion_organizacion
  ADD COLUMN IF NOT EXISTS cot_mostrar_desglose_precios BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.cotizaciones
  ADD COLUMN IF NOT EXISTS mostrar_desglose_precios BOOLEAN NOT NULL DEFAULT false;

-- =============================================================================
-- Destinatario Comercial ("Atención a / Representante") por Cotización
-- =============================================================================
ALTER TABLE IF EXISTS public.cotizaciones
  ADD COLUMN IF NOT EXISTS atencion_a_nombre VARCHAR(200),
  ADD COLUMN IF NOT EXISTS atencion_a_cargo  VARCHAR(120);

-- =============================================================================
-- Firmas Digitales Opcionales en Cotizaciones (reutiliza public.firmas_digitales)
-- =============================================================================
ALTER TABLE IF EXISTS public.cotizaciones
  ADD COLUMN IF NOT EXISTS id_firma_asesor  INTEGER REFERENCES public.firmas_digitales(id_firma_digital) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_firma_cliente INTEGER REFERENCES public.firmas_digitales(id_firma_digital) ON DELETE SET NULL;
