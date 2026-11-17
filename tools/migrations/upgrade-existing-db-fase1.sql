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

COMMIT;
