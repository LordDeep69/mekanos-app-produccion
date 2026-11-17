-- Baseline Universal White-Label EAM/CMMS (Fase 1)
CREATE EXTENSION IF NOT EXISTS citext;
DO $$
DECLARE
  ext_schema TEXT;
  cur_path TEXT;
BEGIN
  SELECT n.nspname INTO ext_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'citext';
  IF ext_schema IS NOT NULL THEN
    cur_path := current_setting('search_path', true);
    IF cur_path IS NULL OR position(ext_schema IN cur_path) = 0 THEN
      PERFORM set_config('search_path', COALESCE(NULLIF(cur_path, ''), current_schema()) || ',' || ext_schema, true);
    END IF;
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "aplicabilidad_enum" AS ENUM ('GENERADOR', 'BOMBA', 'AMBOS');

-- CreateEnum
CREATE TYPE "aplicacion_bomba_enum" AS ENUM ('AGUA_POTABLE', 'AGUAS_RESIDUALES', 'AGUAS_LLUVIAS', 'CONTRAINCENDIOS', 'INDUSTRIAL', 'PISCINA', 'RIEGO');

-- CreateEnum
CREATE TYPE "calidad_recepcion_enum" AS ENUM ('OK', 'PARCIAL_DAÑADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "cargo_empleado_enum" AS ENUM ('GERENTE_GENERAL', 'GERENTE_OPERACIONES', 'GERENTE_COMERCIAL', 'ADMINISTRADOR', 'SUPERVISOR_TECNICO', 'ASESOR_COMERCIAL', 'ASESOR_TECNICO', 'COORDINADOR_LOGISTICA', 'TECNICO_SENIOR', 'TECNICO_JUNIOR', 'AUXILIAR_ADMINISTRATIVO', 'AUXILIAR_TECNICO', 'PRACTICANTE', 'CONDUCTOR', 'OTRO', 'ASISTENTE_MANTENIMIENTO');

-- CreateEnum
CREATE TYPE "categoria_componente_enum" AS ENUM ('FILTRO', 'CORREA', 'BATERIA', 'SELLO', 'RODAMIENTO', 'FLUIDO', 'ELECTRICO', 'OTRO');

-- CreateEnum
CREATE TYPE "categoria_equipo_enum" AS ENUM ('ENERGIA', 'HIDRAULICA', 'CLIMATIZACION', 'COMPRESION', 'OTRO');

-- CreateEnum
CREATE TYPE "categoria_motivo_ajuste_enum" AS ENUM ('MERMA', 'ERROR_REGISTRO', 'ROBO', 'DAÑO', 'DIFERENCIA_CONTEO');

-- CreateEnum
CREATE TYPE "categoria_parametro_enum" AS ENUM ('MECANICO', 'ELECTRICO', 'HIDRAULICO', 'OPERACIONAL', 'AMBIENTAL');

-- CreateEnum
CREATE TYPE "categoria_propuesta_enum" AS ENUM ('CORRECTIVO', 'PREVENTIVO_URGENTE', 'MEJORA', 'EXTENSION_GARANTIA');

-- CreateEnum
CREATE TYPE "categoria_proveedor_enum" AS ENUM ('REPUESTOS', 'SERVICIOS', 'CONTRATISTA', 'SUMINISTROS', 'EQUIPOS', 'MIXTO');

-- CreateEnum
CREATE TYPE "categoria_servicio_enum" AS ENUM ('PREVENTIVO', 'CORRECTIVO', 'EMERGENCIA', 'INSPECCION', 'ESPECIALIZADO', 'DIAGNOSTICO');

-- CreateEnum
CREATE TYPE "clase_aislamiento_enum" AS ENUM ('A', 'B', 'F', 'H');

-- CreateEnum
CREATE TYPE "criterio_intervalo_enum" AS ENUM ('DIAS', 'HORAS', 'LO_QUE_OCURRA_PRIMERO');

-- CreateEnum
CREATE TYPE "criticidad_enum" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "estado_actividad_enum" AS ENUM ('B', 'R', 'M', 'I', 'C', 'LI', 'A', 'L', 'NA', 'LA', 'S', 'NT', 'BA', 'F', 'RN', 'NF');

-- CreateEnum
CREATE TYPE "estado_alerta_enum" AS ENUM ('PENDIENTE', 'VISTA', 'EN_PROCESO', 'RESUELTA');

-- CreateEnum
CREATE TYPE "estado_aprobacion_gasto_enum" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "estado_bitacora_enum" AS ENUM ('BORRADOR', 'ENVIADA', 'APROBADA');

-- CreateEnum
CREATE TYPE "estado_civil_enum" AS ENUM ('SOLTERO', 'CASADO', 'UNION_LIBRE', 'DIVORCIADO', 'VIUDO', 'SEPARADO', 'NO_ESPECIFICA');

-- CreateEnum
CREATE TYPE "estado_contrato_enum" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'FINALIZADO', 'RENOVACION_PENDIENTE');

-- CreateEnum
CREATE TYPE "estado_cronograma_enum" AS ENUM ('PENDIENTE', 'PROGRAMADA', 'COMPLETADA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "estado_detalle_servicio_enum" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "estado_devolucion_proveedor_enum" AS ENUM ('SOLICITADA', 'APROBADA_PROVEEDOR', 'RETIRADA', 'ACREDITADA');

-- CreateEnum
CREATE TYPE "estado_equipo_enum" AS ENUM ('OPERATIVO', 'STANDBY', 'INACTIVO', 'EN_REPARACION', 'FUERA_SERVICIO', 'BAJA');

-- CreateEnum
CREATE TYPE "estado_informe_enum" AS ENUM ('BORRADOR', 'REVISADO', 'APROBADO', 'ENVIADO');

-- CreateEnum
CREATE TYPE "estado_item_remision_enum" AS ENUM ('ENTREGADO', 'DEVUELTO_TOTAL', 'DEVUELTO_PARCIAL', 'CONSUMIDO_OS', 'PERDIDO');

-- CreateEnum
CREATE TYPE "estado_lote_enum" AS ENUM ('DISPONIBLE', 'VENCIDO', 'CUARENTENA', 'AGOTADO');

-- CreateEnum
CREATE TYPE "estado_orden_compra_enum" AS ENUM ('BORRADOR', 'ENVIADA', 'PARCIAL', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "estado_orden_enum" AS ENUM ('PROGRAMADA', 'ASIGNADA', 'EN_PROCESO', 'COMPLETADA', 'APROBADA', 'CANCELADA', 'EN_ESPERA_REPUESTO');

-- CreateEnum
CREATE TYPE "estado_pintura_enum" AS ENUM ('EXCELENTE', 'BUENO', 'REGULAR', 'MALO', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "estado_remision_enum" AS ENUM ('ABIERTA', 'CERRADA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "estado_usuario_enum" AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'BLOQUEADO', 'PENDIENTE_ACTIVACION');

-- CreateEnum
CREATE TYPE "motivo_devolucion_proveedor_enum" AS ENUM ('DEFECTUOSO', 'INCORRECTO', 'PROXIMO_VENCER', 'EXCESO');

-- CreateEnum
CREATE TYPE "nivel_academico_enum" AS ENUM ('PRIMARIA', 'BACHILLERATO', 'TECNICO', 'TECNOLOGO', 'PROFESIONAL', 'ESPECIALIZACION', 'MAESTRIA', 'DOCTORADO', 'NINGUNO', 'OTRO');

-- CreateEnum
CREATE TYPE "nivel_alerta_enum" AS ENUM ('OK', 'ADVERTENCIA', 'CRITICO', 'INFORMATIVO');

-- CreateEnum
CREATE TYPE "nivel_aprobacion_enum" AS ENUM ('SUPERVISOR', 'GERENTE', 'DIRECCION', 'NINGUNO');

-- CreateEnum
CREATE TYPE "numero_fases_enum" AS ENUM ('MONOFASICO', 'TRIFASICO');

-- CreateEnum
CREATE TYPE "origen_actividad_plan_enum" AS ENUM ('ADMIN', 'TECNICO');

-- CreateEnum
CREATE TYPE "origen_componente_enum" AS ENUM ('BODEGA', 'COMPRA_DIRECTA', 'CLIENTE', 'GARANTIA');

-- CreateEnum
CREATE TYPE "origen_movimiento_inventario_enum" AS ENUM ('COMPRA', 'CONSUMO_OS', 'REMISION', 'DEVOLUCION', 'CONTEO_FISICO', 'MERMA', 'CORRECCION_ERROR', 'INVENTARIO_INICIAL');

-- CreateEnum
CREATE TYPE "origen_solicitud_enum" AS ENUM ('PROGRAMADO', 'CLIENTE', 'INTERNO', 'EMERGENCIA', 'GARANTIA');

-- CreateEnum
CREATE TYPE "periodicidad_enum" AS ENUM ('SEMANAL', 'QUINCENAL', 'MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "periodicidad_mantenimiento_enum" AS ENUM ('MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'CUATRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'POR_SOLICITUD', 'SIN_DEFINIR');

-- CreateEnum
CREATE TYPE "prioridad_enum" AS ENUM ('NORMAL', 'ALTA', 'URGENTE', 'EMERGENCIA');

-- CreateEnum
CREATE TYPE "sexo_enum" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO', 'NO_ESPECIFICA');

-- CreateEnum
CREATE TYPE "tipo_actividad_enum" AS ENUM ('INSPECCION', 'MEDICION', 'LIMPIEZA', 'LUBRICACION', 'AJUSTE', 'CAMBIO', 'PRUEBA', 'VERIFICACION');

-- CreateEnum
CREATE TYPE "tipo_alerta_stock_enum" AS ENUM ('STOCK_MINIMO', 'VENCIMIENTO_CRITICO', 'VENCIMIENTO_PROXIMO', 'DEVOLUCION_VENCIDA', 'LOTE_AGOTADO');

-- CreateEnum
CREATE TYPE "tipo_arranque_enum" AS ENUM ('ELECTRICO', 'MANUAL', 'NEUMATICO', 'HIDRAULICO');

-- CreateEnum
CREATE TYPE "tipo_bomba_enum" AS ENUM ('CENTRIFUGA', 'TURBINA_VERTICAL_POZO', 'SUMERGIBLE', 'PERIFERICA', 'TURBINA', 'DESPLAZAMIENTO_POSITIVO', 'HIDRO', 'TANQUE_A_TANQUE');

-- CreateEnum
CREATE TYPE "tipo_certificacion_enum" AS ENUM ('TRABAJO_ALTURAS', 'RIESGO_ELECTRICO', 'SEGURIDAD_INDUSTRIAL', 'TECNICA_ESPECIALIZADA', 'OTRA');

-- CreateEnum
CREATE TYPE "tipo_cliente_enum" AS ENUM ('RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'HOSPITALARIO', 'EDUCATIVO', 'GUBERNAMENTAL', 'HOTELERO', 'EDIFICIO_RESIDENCIAL', 'OTRO');

-- CreateEnum
CREATE TYPE "tipo_combustible_enum" AS ENUM ('DIESEL', 'GASOLINA', 'GAS_NATURAL', 'GLP', 'DUAL', 'BIODIESEL');

-- CreateEnum
CREATE TYPE "tipo_componente_comercial_enum" AS ENUM ('ORIGINAL', 'GENERICO', 'REMANUFACTURADO');

-- CreateEnum
CREATE TYPE "tipo_contrato_empleado_enum" AS ENUM ('INDEFINIDO', 'TERMINO_FIJO', 'PRESTACION_SERVICIOS', 'APRENDIZAJE', 'PRACTICAS', 'OBRA_LABOR');

-- CreateEnum
CREATE TYPE "tipo_contrato_enum" AS ENUM ('SIN_CONTRATO', 'PREVENTIVO', 'INTEGRAL', 'POR_LLAMADA');

-- CreateEnum
CREATE TYPE "tipo_contrato_mantenimiento_enum" AS ENUM ('PREVENTIVO_RECURRENTE', 'INTEGRAL', 'ESPECIAL');

-- CreateEnum
CREATE TYPE "tipo_dato_parametro_enum" AS ENUM ('NUMERICO', 'TEXTO', 'BOOLEANO');

-- CreateEnum
CREATE TYPE "tipo_destino_remision_enum" AS ENUM ('TECNICO', 'CLIENTE', 'PROVEEDOR', 'OTRO');

-- CreateEnum
CREATE TYPE "tipo_documento_enum" AS ENUM ('INFORME_SERVICIO', 'BITACORA_MENSUAL', 'COTIZACION', 'PROPUESTA');

-- CreateEnum
CREATE TYPE "tipo_evidencia_enum" AS ENUM ('ANTES', 'DURANTE', 'DESPUES', 'DAÑO', 'TRABAJO_REALIZADO', 'ENTORNO', 'MEDICION', 'COMPONENTE', 'GENERAL');

-- CreateEnum
CREATE TYPE "tipo_firma_digital_enum" AS ENUM ('TECNICO', 'CLIENTE', 'ASESOR', 'GERENTE', 'ADMINISTRATIVA', 'OTRO');

-- CreateEnum
CREATE TYPE "tipo_gasto_enum" AS ENUM ('TRANSPORTE', 'PARQUEADERO', 'PEAJE', 'ALIMENTACION', 'CONSUMIBLE', 'HERRAMIENTA', 'OTRO');

-- CreateEnum
CREATE TYPE "tipo_identificacion_enum" AS ENUM ('CC', 'NIT', 'CE', 'PA', 'TI', 'RC', 'DNI');

-- CreateEnum
CREATE TYPE "tipo_item_remision_enum" AS ENUM ('COMPONENTE', 'HERRAMIENTA');

-- CreateEnum
CREATE TYPE "tipo_lectura_horometro_enum" AS ENUM ('MANTENIMIENTO', 'MANUAL', 'AUTOMATICA', 'INICIAL');

-- CreateEnum
CREATE TYPE "tipo_motor_enum" AS ENUM ('COMBUSTION', 'ELECTRICO');

-- CreateEnum
CREATE TYPE "tipo_movimiento_inventario_enum" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "tipo_persona_enum" AS ENUM ('NATURAL', 'JURIDICA');

-- CreateEnum
CREATE TYPE "tipo_proveedor_enum" AS ENUM ('NACIONAL', 'INTERNACIONAL');

-- CreateEnum
CREATE TYPE "tipo_recepcion_compra_enum" AS ENUM ('PARCIAL', 'FINAL', 'UNICA');

-- CreateEnum
CREATE TYPE "tipo_remision_enum" AS ENUM ('VALE_SALIDA_TECNICO', 'VENTA_CLIENTE', 'PRESTAMO_HERRAMIENTA', 'GARANTIA');

-- CreateEnum
CREATE TYPE "tipo_sangre_enum" AS ENUM ('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'NO_CONOCIDO');

-- CreateEnum
CREATE TYPE "zona_geografica_enum" AS ENUM ('NORTE', 'SUR', 'CENTRO', 'ORIENTE', 'OCCIDENTE', 'METROPOLITANA', 'OTRA');

-- CreateEnum
CREATE TYPE "estado_envio_email_enum" AS ENUM ('EXITOSO', 'FALLIDO');

-- CreateEnum
CREATE TYPE "origen_pendiente_enum" AS ENUM ('CATALOGO', 'PERSONALIZADO', 'MANUAL');

-- CreateEnum
CREATE TYPE "estado_pendiente_orden_enum" AS ENUM ('PENDIENTE', 'EN_GESTION', 'RESUELTO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "destino_articulo_enum" AS ENUM ('INSUMO_SERVICIO', 'REPUESTO_CORRECTIVO', 'HERRAMIENTA_ACTIVO', 'DOTACION_EPP', 'CONSUMIBLE_TALLER');

-- CreateEnum
CREATE TYPE "origen_costo_enum" AS ENUM ('REGISTRO_INICIAL', 'ACTUALIZACION_PROVEEDOR', 'ORDEN_COMPRA', 'RECEPCION_FACTURA', 'AJUSTE_AUDITORIA');

-- CreateTable
CREATE TABLE "actividades_ejecutadas" (
    "id_actividad_ejecutada" SERIAL NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "id_actividad_catalogo" INTEGER,
    "descripcion_manual" TEXT,
    "sistema" VARCHAR(100),
    "orden_secuencia" INTEGER,
    "estado" "estado_actividad_enum",
    "observaciones" TEXT,
    "ejecutada" BOOLEAN DEFAULT true,
    "fecha_ejecucion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "ejecutada_por" INTEGER,
    "tiempo_ejecucion_minutos" INTEGER,
    "requiere_evidencia" BOOLEAN DEFAULT false,
    "evidencia_capturada" BOOLEAN DEFAULT false,
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "id_orden_equipo" INTEGER,
    "excluido_pdf" BOOLEAN NOT NULL DEFAULT false,
    "respuesta_json" JSONB,

    CONSTRAINT "actividades_ejecutadas_pkey" PRIMARY KEY ("id_actividad_ejecutada")
);

-- CreateTable
CREATE TABLE "alertas_stock" (
    "id_alerta" SERIAL NOT NULL,
    "tipo_alerta" "tipo_alerta_stock_enum" NOT NULL,
    "nivel" "nivel_alerta_enum" NOT NULL,
    "id_componente" INTEGER,
    "id_lote" INTEGER,
    "mensaje" TEXT NOT NULL,
    "estado" "estado_alerta_enum" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_generacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_resolucion" TIMESTAMP(6),
    "resuelto_por" INTEGER,
    "observaciones" TEXT,

    CONSTRAINT "alertas_stock_pkey" PRIMARY KEY ("id_alerta")
);

-- CreateTable
CREATE TABLE "aprobaciones_cotizacion" (
    "id_aprobacion" SERIAL NOT NULL,
    "id_cotizacion" INTEGER,
    "id_propuesta" INTEGER,
    "nivel_aprobacion" "nivel_aprobacion_enum" NOT NULL,
    "razon_nivel" TEXT,
    "estado_aprobacion" VARCHAR(50) DEFAULT 'PENDIENTE',
    "solicitada_por" INTEGER NOT NULL,
    "fecha_solicitud" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "observaciones_solicitante" TEXT,
    "aprobada_por" INTEGER,
    "fecha_respuesta" TIMESTAMP(6),
    "observaciones_aprobador" TEXT,
    "metadata" JSONB,

    CONSTRAINT "aprobaciones_cotizacion_pkey" PRIMARY KEY ("id_aprobacion")
);

-- CreateTable
CREATE TABLE "archivos_equipo" (
    "id_archivo" SERIAL NOT NULL,
    "id_equipo" INTEGER NOT NULL,
    "tipo_archivo" VARCHAR(50) NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "nombre_original" VARCHAR(255) NOT NULL,
    "ruta_archivo" VARCHAR(500) NOT NULL,
    "extension_archivo" VARCHAR(10),
    "mime_type" VARCHAR(100),
    "tamaño_bytes" BIGINT,
    "titulo" VARCHAR(200),
    "descripcion" TEXT,
    "es_principal" BOOLEAN DEFAULT false,
    "es_publico" BOOLEAN DEFAULT false,
    "categoria" VARCHAR(100),
    "orden" INTEGER DEFAULT 0,
    "hash_archivo" VARCHAR(64) NOT NULL,
    "metadata" JSONB,
    "fecha_subida" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "subido_por" INTEGER NOT NULL,
    "fecha_modificacion" TIMESTAMP(6),
    "modificado_por" INTEGER,
    "activo" BOOLEAN DEFAULT true,
    "fecha_eliminacion" TIMESTAMP(6),
    "eliminado_por" INTEGER,
    "motivo_eliminacion" VARCHAR(500),

    CONSTRAINT "archivos_equipo_pkey" PRIMARY KEY ("id_archivo")
);

-- CreateTable
CREATE TABLE "bitacoras" (
    "id_bitacora" SERIAL NOT NULL,
    "numero_bitacora" VARCHAR(50) NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "fecha_generacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generado_por" INTEGER NOT NULL,
    "estado_bitacora" "estado_bitacora_enum" NOT NULL DEFAULT 'BORRADOR',
    "id_documento_pdf" INTEGER,
    "cantidad_informes" INTEGER NOT NULL DEFAULT 0,
    "enviada_cliente_fecha" TIMESTAMP(6),
    "metodo_envio" VARCHAR(20),
    "fecha_aprobacion_cliente" TIMESTAMP(6),
    "firma_digital_cliente" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "bitacoras_pkey" PRIMARY KEY ("id_bitacora")
);

-- CreateTable
CREATE TABLE "bitacoras_informes" (
    "id_bitacora_informe" SERIAL NOT NULL,
    "id_bitacora" INTEGER NOT NULL,
    "id_informe" INTEGER NOT NULL,
    "orden_bitacora" INTEGER NOT NULL,

    CONSTRAINT "bitacoras_informes_pkey" PRIMARY KEY ("id_bitacora_informe")
);

-- CreateTable
CREATE TABLE "catalogo_actividades" (
    "id_actividad_catalogo" SERIAL NOT NULL,
    "codigo_actividad" VARCHAR(50) NOT NULL,
    "descripcion_actividad" TEXT NOT NULL,
    "id_tipo_servicio" INTEGER,
    "id_sistema" INTEGER,
    "id_tipo_equipo" INTEGER,
    "id_plantilla_origen" INTEGER,
    "tipo_actividad" "tipo_actividad_enum" NOT NULL,
    "orden_ejecucion" INTEGER NOT NULL,
    "es_obligatoria" BOOLEAN DEFAULT true,
    "tiempo_estimado_minutos" INTEGER,
    "id_parametro_medicion" INTEGER,
    "id_tipo_componente" INTEGER,
    "instrucciones" TEXT,
    "precauciones" TEXT,
    "activo" BOOLEAN DEFAULT true,
    "observaciones" TEXT,
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),
    "naturaleza_personalizada" VARCHAR(80),
    "tipo_control_input" VARCHAR(40) NOT NULL DEFAULT 'ESCALA_ESTADO',
    "config_input_json" JSONB,
    "rol_semantico" VARCHAR(50),

    CONSTRAINT "catalogo_actividades_pkey" PRIMARY KEY ("id_actividad_catalogo")
);

-- CreateTable
CREATE TABLE "catalogo_componentes" (
    "id_componente" SERIAL NOT NULL,
    "id_tipo_componente" INTEGER,
    "codigo_interno" VARCHAR(50),
    "referencia_fabricante" VARCHAR(100) NOT NULL,
    "marca" VARCHAR(100),
    "descripcion_corta" VARCHAR(200),
    "descripcion_detallada" TEXT,
    "especificaciones_tecnicas" JSONB,
    "tipo_comercial" "tipo_componente_comercial_enum" DEFAULT 'ORIGINAL',
    "destino_articulo" "destino_articulo_enum" DEFAULT 'INSUMO_SERVICIO',
    "es_comprable" BOOLEAN DEFAULT true,
    "es_facturable" BOOLEAN DEFAULT true,
    "requiere_serializacion" BOOLEAN DEFAULT false,
    "es_activo_fijo" BOOLEAN DEFAULT false,
    "numero_serie_activo" VARCHAR(100),
    "placa_inventario" VARCHAR(100),
    "frecuencia_mantenimiento_meses" INTEGER,
    "precio_compra" DECIMAL(12,2),
    "precio_venta" DECIMAL(12,2),
    "ventana_costo_meses" INTEGER DEFAULT 3,
    "moneda" VARCHAR(10) DEFAULT 'COP',
    "margen_utilidad_porcentaje" DECIMAL(5,2),
    "id_proveedor_principal" INTEGER,
    "es_inventariable" BOOLEAN DEFAULT true,
    "stock_minimo" INTEGER DEFAULT 0,
    "stock_actual" INTEGER DEFAULT 0,
    "unidad_medida" VARCHAR(20) DEFAULT 'UNIDAD',
    "reemplazado_por" INTEGER,
    "componentes_compatibles" INTEGER[],
    "observaciones" TEXT,
    "notas_instalacion" TEXT,
    "activo" BOOLEAN DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "creado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),
    "modificado_por" INTEGER,
    "id_marca" INTEGER,
    "codigo_unidad_medida" VARCHAR(20),
    "id_categoria" INTEGER,

    CONSTRAINT "catalogo_componentes_pkey" PRIMARY KEY ("id_componente")
);

-- CreateTable
CREATE TABLE "catalogo_servicios" (
    "id_servicio" SERIAL NOT NULL,
    "codigo_servicio" VARCHAR(50) NOT NULL,
    "nombre_servicio" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "categoria" "categoria_servicio_enum" NOT NULL,
    "id_tipo_servicio" INTEGER,
    "id_tipo_equipo" INTEGER,
    "duracion_estimada_horas" DECIMAL(4,2),
    "requiere_certificacion" BOOLEAN DEFAULT false,
    "tipo_certificacion_requerida" VARCHAR(50),
    "precio_base" DECIMAL(12,2),
    "incluye_repuestos" BOOLEAN DEFAULT false,
    "activo" BOOLEAN DEFAULT true,
    "observaciones" TEXT,
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "catalogo_servicios_pkey" PRIMARY KEY ("id_servicio")
);

-- CreateTable
CREATE TABLE "catalogo_sistemas" (
    "id_sistema" SERIAL NOT NULL,
    "codigo_sistema" VARCHAR(50) NOT NULL,
    "nombre_sistema" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "aplica_a" VARCHAR[],
    "orden_visualizacion" INTEGER NOT NULL,
    "icono" VARCHAR(50),
    "color_hex" VARCHAR(7),
    "id_modulo" INTEGER,
    "activo" BOOLEAN DEFAULT true,
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_sistemas_pkey" PRIMARY KEY ("id_sistema")
);

-- CreateTable
CREATE TABLE "certificaciones_tecnicas" (
    "id_certificacion" SERIAL NOT NULL,
    "id_empleado" INTEGER NOT NULL,
    "tipo_certificacion" "tipo_certificacion_enum" NOT NULL,
    "nombre_certificacion" VARCHAR(200) NOT NULL,
    "entidad_certificadora" VARCHAR(200) NOT NULL,
    "numero_certificacion" VARCHAR(50),
    "fecha_expedicion" DATE NOT NULL,
    "fecha_vencimiento" DATE,
    "nivel_certificacion" VARCHAR(50),
    "archivo_certificado" VARCHAR(500),
    "vigente" BOOLEAN DEFAULT true,
    "es_renovacion" BOOLEAN DEFAULT false,
    "id_certificacion_anterior" INTEGER,
    "observaciones" TEXT,
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "registrado_por" INTEGER NOT NULL,

    CONSTRAINT "certificaciones_tecnicas_pkey" PRIMARY KEY ("id_certificacion")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id_cliente" SERIAL NOT NULL,
    "id_persona" INTEGER NOT NULL,
    "codigo_cliente" VARCHAR(20),
    "tipo_cliente" "tipo_cliente_enum" NOT NULL DEFAULT 'COMERCIAL',
    "fecha_inicio_servicio" DATE,
    "periodicidad_mantenimiento" "periodicidad_mantenimiento_enum" DEFAULT 'SIN_DEFINIR',
    "id_firma_administrativa" INTEGER,
    "id_asesor_asignado" INTEGER,
    "descuento_autorizado" DECIMAL(5,2) DEFAULT 0,
    "tiene_credito" BOOLEAN DEFAULT false,
    "limite_credito" DECIMAL(15,2),
    "dias_credito" INTEGER DEFAULT 0,
    "cliente_activo" BOOLEAN DEFAULT true,
    "fecha_ultimo_servicio" DATE,
    "fecha_proximo_servicio" DATE,
    "tiene_acceso_portal" BOOLEAN DEFAULT false,
    "fecha_activacion_portal" DATE,
    "observaciones_servicio" TEXT,
    "requisitos_especiales" TEXT,
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),
    "id_cuenta_email_remitente" INTEGER,
    "es_cliente_principal" BOOLEAN DEFAULT false,
    "id_cliente_principal" INTEGER,
    "nombre_sede" VARCHAR(200),
    "emails_notificacion" TEXT,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "componentes_equipo" (
    "id_componente_equipo" SERIAL NOT NULL,
    "id_equipo" INTEGER NOT NULL,
    "id_tipo_componente" INTEGER NOT NULL,
    "id_componente" INTEGER,
    "posicion_descripcion" VARCHAR(100) NOT NULL,
    "referencia_manual" VARCHAR(100),
    "marca_manual" VARCHAR(100),
    "unidades_por_cambio" INTEGER DEFAULT 1,
    "especificaciones_adicionales" JSONB,
    "fecha_instalacion_inicial" DATE,
    "fecha_ultimo_cambio" DATE,
    "notas" TEXT,
    "activo" BOOLEAN DEFAULT true,
    "fecha_desactivacion" DATE,
    "motivo_desactivacion" VARCHAR(500),
    "creado_por" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "componentes_equipo_pkey" PRIMARY KEY ("id_componente_equipo")
);

-- CreateTable
CREATE TABLE "componentes_usados" (
    "id_componente_usado" SERIAL NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "id_componente" INTEGER,
    "id_tipo_componente" INTEGER,
    "id_actividad_ejecutada" INTEGER,
    "id_ubicacion" INTEGER,
    "id_lote" INTEGER,
    "id_movimiento_inventario" INTEGER,
    "descripcion" VARCHAR(200) NOT NULL,
    "referencia_manual" VARCHAR(100),
    "marca_manual" VARCHAR(100),
    "cantidad" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unidad" VARCHAR(20) DEFAULT 'unidad',
    "costo_unitario" DECIMAL(12,2),
    "costo_total" DECIMAL(12,2),
    "estado_componente_retirado" "estado_actividad_enum",
    "razon_uso" TEXT,
    "componente_guardado" BOOLEAN DEFAULT false,
    "origen_componente" "origen_componente_enum" DEFAULT 'BODEGA',
    "observaciones" TEXT,
    "fecha_uso" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "usado_por" INTEGER,
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "registrado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),
    "modificado_por" INTEGER,

    CONSTRAINT "componentes_usados_pkey" PRIMARY KEY ("id_componente_usado")
);

-- CreateTable
CREATE TABLE "contactos_adicionales" (
    "id_contacto" SERIAL NOT NULL,
    "id_persona" INTEGER NOT NULL,
    "nombre_contacto" VARCHAR(200) NOT NULL,
    "cargo" VARCHAR(100),
    "telefono" VARCHAR(20),
    "celular" VARCHAR(20),
    "email" VARCHAR(150),
    "tipo_contacto" TEXT,
    "responsabilidades" TEXT,
    "activo" BOOLEAN DEFAULT true,
    "observaciones" TEXT,
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "registrado_por" INTEGER NOT NULL,
    "fecha_modificacion" TIMESTAMP(6),
    "modificado_por" INTEGER,

    CONSTRAINT "contactos_adicionales_pkey" PRIMARY KEY ("id_contacto")
);

-- CreateTable
CREATE TABLE "contratos_mantenimiento" (
    "id_contrato" SERIAL NOT NULL,
    "codigo_contrato" VARCHAR(50) NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_asesor_responsable" INTEGER NOT NULL,
    "tipo_contrato" "tipo_contrato_mantenimiento_enum" NOT NULL DEFAULT 'PREVENTIVO_RECURRENTE',
    "periodicidad_default" "periodicidad_enum" NOT NULL DEFAULT 'MENSUAL',
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "estado_contrato" "estado_contrato_enum" NOT NULL DEFAULT 'ACTIVO',
    "genera_automaticamente" BOOLEAN NOT NULL DEFAULT true,
    "dias_anticipacion_generacion" INTEGER NOT NULL DEFAULT 7,
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" INTEGER NOT NULL,

    CONSTRAINT "contratos_mantenimiento_pkey" PRIMARY KEY ("id_contrato")
);

-- CreateTable
CREATE TABLE "cotizaciones" (
    "id_cotizacion" SERIAL NOT NULL,
    "numero_cotizacion" VARCHAR(50) NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_sede" INTEGER,
    "id_equipo" INTEGER,
    "fecha_cotizacion" DATE DEFAULT CURRENT_DATE,
    "fecha_vencimiento" DATE NOT NULL,
    "dias_validez" INTEGER DEFAULT 15,
    "id_estado" INTEGER NOT NULL,
    "fecha_cambio_estado" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "id_motivo_rechazo" INTEGER,
    "observaciones_rechazo" TEXT,
    "asunto" VARCHAR(300) NOT NULL,
    "descripcion_general" TEXT,
    "alcance_trabajo" TEXT,
    "exclusiones" TEXT,
    "subtotal_servicios" DECIMAL(12,2),
    "subtotal_componentes" DECIMAL(12,2),
    "subtotal_general" DECIMAL(12,2),
    "descuento_porcentaje" DECIMAL(5,2) DEFAULT 0,
    "descuento_valor" DECIMAL(12,2),
    "subtotal_con_descuento" DECIMAL(12,2),
    "iva_porcentaje" DECIMAL(5,2) DEFAULT 0,
    "iva_valor" DECIMAL(12,2),
    "total_cotizacion" DECIMAL(12,2),
    "forma_pago" VARCHAR(100) DEFAULT 'CONTADO',
    "terminos_condiciones" TEXT,
    "meses_garantia" INTEGER DEFAULT 3,
    "observaciones_garantia" TEXT,
    "tiempo_estimado_dias" INTEGER,
    "version" INTEGER DEFAULT 1,
    "id_cotizacion_padre" INTEGER,
    "id_orden_servicio_generada" INTEGER,
    "fecha_conversion_os" TIMESTAMP(6),
    "metadata" JSONB,
    "elaborada_por" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "aprobada_internamente_por" INTEGER,
    "fecha_aprobacion_interna" TIMESTAMP(6),
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id_cotizacion")
);

-- CreateTable
CREATE TABLE "cronogramas_servicio" (
    "id_cronograma" SERIAL NOT NULL,
    "id_contrato" INTEGER NOT NULL,
    "id_equipo" INTEGER NOT NULL,
    "id_equipo_contrato" INTEGER NOT NULL,
    "tipo_servicio_programado" INTEGER NOT NULL,
    "fecha_prevista" DATE NOT NULL,
    "fecha_inicio_ventana" DATE,
    "fecha_fin_ventana" DATE,
    "fecha_base_calculo" DATE,
    "estado_cronograma" "estado_cronograma_enum" NOT NULL DEFAULT 'PENDIENTE',
    "id_orden_servicio_generada" INTEGER,
    "fecha_generacion_os" TIMESTAMP(6),
    "fecha_completado" TIMESTAMP(6),
    "prioridad" "prioridad_enum" NOT NULL DEFAULT 'NORMAL',
    "observaciones_programacion" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" INTEGER NOT NULL,
    "secuencia_contrato" INTEGER,

    CONSTRAINT "cronogramas_servicio_pkey" PRIMARY KEY ("id_cronograma")
);

-- CreateTable
CREATE TABLE "detalle_servicios_orden" (
    "id_detalle_servicio" SERIAL NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "id_servicio" INTEGER NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "id_tecnico_ejecutor" INTEGER,
    "fecha_inicio_servicio" TIMESTAMP(6),
    "fecha_fin_servicio" TIMESTAMP(6),
    "duracion_servicio_minutos" INTEGER,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "descuento_porcentaje" DECIMAL(5,2) DEFAULT 0,
    "subtotal" DECIMAL(12,2),
    "tiene_garantia_servicio" BOOLEAN DEFAULT false,
    "meses_garantia_servicio" INTEGER,
    "observaciones" TEXT,
    "justificacion_precio" TEXT,
    "estado_servicio" "estado_detalle_servicio_enum" DEFAULT 'PENDIENTE',
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "registrado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),
    "modificado_por" INTEGER,

    CONSTRAINT "detalle_servicios_orden_pkey" PRIMARY KEY ("id_detalle_servicio")
);

-- CreateTable
CREATE TABLE "devoluciones_proveedor" (
    "id_devolucion" SERIAL NOT NULL,
    "numero_devolucion" VARCHAR(50) NOT NULL,
    "id_orden_compra" INTEGER NOT NULL,
    "id_lote" INTEGER,
    "motivo" "motivo_devolucion_proveedor_enum" NOT NULL,
    "cantidad_devuelta" DECIMAL(10,2) NOT NULL,
    "estado_devolucion" "estado_devolucion_proveedor_enum" NOT NULL DEFAULT 'SOLICITADA',
    "observaciones" TEXT,
    "solicitada_por" INTEGER NOT NULL,
    "fecha_solicitud" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_devolucion" TIMESTAMP(6),

    CONSTRAINT "devoluciones_proveedor_pkey" PRIMARY KEY ("id_devolucion")
);

-- CreateTable
CREATE TABLE "documentos_generados" (
    "id_documento" SERIAL NOT NULL,
    "tipo_documento" "tipo_documento_enum" NOT NULL,
    "id_referencia" INTEGER NOT NULL,
    "numero_documento" VARCHAR(100),
    "ruta_archivo" VARCHAR(500) NOT NULL,
    "hash_sha256" VARCHAR(64) NOT NULL,
    "tamaño_bytes" BIGINT NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL DEFAULT 'application/pdf',
    "numero_paginas" INTEGER,
    "fecha_generacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generado_por" INTEGER NOT NULL,
    "herramienta_generacion" VARCHAR(50),
    "veces_descargado" INTEGER DEFAULT 0,
    "fecha_ultima_descarga" TIMESTAMP(6),
    "id_usuario_ultima_descarga" INTEGER,

    CONSTRAINT "documentos_generados_pkey" PRIMARY KEY ("id_documento")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id_empleado" SERIAL NOT NULL,
    "id_persona" INTEGER NOT NULL,
    "codigo_empleado" VARCHAR(20),
    "cargo" "cargo_empleado_enum" NOT NULL,
    "descripcion_cargo" VARCHAR(200),
    "fecha_ingreso" DATE NOT NULL,
    "fecha_retiro" DATE,
    "motivo_retiro" VARCHAR(500),
    "tipo_contrato" "tipo_contrato_empleado_enum" DEFAULT 'INDEFINIDO',
    "departamento" VARCHAR(100),
    "jefe_inmediato" INTEGER,
    "contacto_emergencia" VARCHAR(200) NOT NULL,
    "telefono_emergencia" VARCHAR(20) NOT NULL,
    "nivel_academico" "nivel_academico_enum",
    "titulo_obtenido" VARCHAR(200),
    "institucion_educativa" VARCHAR(200),
    "es_tecnico" BOOLEAN DEFAULT false,
    "es_asesor" BOOLEAN DEFAULT false,
    "puede_conducir" BOOLEAN DEFAULT false,
    "licencia_conduccion" VARCHAR(50),
    "fecha_vencimiento_licencia" DATE,
    "empleado_activo" BOOLEAN DEFAULT true,
    "observaciones" TEXT,
    "habilidades_especiales" TEXT,
    "creado_por" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id_empleado")
);

-- CreateTable
CREATE TABLE "equipos" (
    "id_equipo" SERIAL NOT NULL,
    "codigo_equipo" VARCHAR(30) NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_sede" INTEGER,
    "id_tipo_equipo" INTEGER NOT NULL,
    "nombre_equipo" VARCHAR(200),
    "numero_serie_equipo" VARCHAR(100),
    "ubicacion_texto" VARCHAR(500) NOT NULL,
    "ubicacion_detallada" JSONB,
    "estado_equipo" "estado_equipo_enum" NOT NULL DEFAULT 'OPERATIVO',
    "criticidad" "criticidad_enum" NOT NULL DEFAULT 'MEDIA',
    "criticidad_justificacion" TEXT,
    "fecha_instalacion" DATE,
    "fecha_inicio_servicio_mekanos" DATE,
    "fecha_registro" DATE DEFAULT CURRENT_DATE,
    "en_garantia" BOOLEAN DEFAULT false,
    "fecha_inicio_garantia" DATE,
    "fecha_fin_garantia" DATE,
    "proveedor_garantia" VARCHAR(200),
    "horas_actuales" DECIMAL(10,2) DEFAULT 0,
    "fecha_ultima_lectura_horas" TIMESTAMP(6),
    "lectura_uso_actual" DECIMAL(12,2) DEFAULT 0,
    "fecha_ultima_lectura_uso" TIMESTAMP(6),
    "estado_pintura" "estado_pintura_enum" DEFAULT 'BUENO',
    "requiere_pintura" BOOLEAN DEFAULT false,
    "tipo_contrato" "tipo_contrato_enum" DEFAULT 'SIN_CONTRATO',
    "intervalo_tipo_a_dias_override" INTEGER,
    "intervalo_tipo_a_horas_override" DECIMAL(10,1),
    "intervalo_tipo_b_dias_override" INTEGER,
    "intervalo_tipo_b_horas_override" DECIMAL(10,1),
    "criterio_intervalo_override" "criterio_intervalo_enum",
    "observaciones_generales" TEXT,
    "configuracion_especial" TEXT,
    "activo" BOOLEAN DEFAULT true,
    "fecha_baja" DATE,
    "motivo_baja" VARCHAR(500),
    "creado_por" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),
    "metadata" JSONB,
    "config_parametros" JSONB DEFAULT '{}',
    "id_plantilla_parametros" INTEGER,
    "id_modelo_equipo" INTEGER,
    "especificaciones" JSONB,
    "esquema_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id_equipo")
);

-- CreateTable
CREATE TABLE "equipos_bomba" (
    "id_equipo" INTEGER NOT NULL,
    "marca_bomba" VARCHAR(100) NOT NULL,
    "modelo_bomba" VARCHAR(100),
    "numero_serie_bomba" VARCHAR(100),
    "tipo_bomba" "tipo_bomba_enum" NOT NULL,
    "aplicacion_bomba" "aplicacion_bomba_enum",
    "diametro_aspiracion" VARCHAR(50),
    "diametro_descarga" VARCHAR(50),
    "caudal_maximo_m3h" DECIMAL(10,2),
    "altura_manometrica_maxima_m" DECIMAL(8,2),
    "altura_presion_trabajo_m" DECIMAL(8,2),
    "potencia_hidraulica_kw" DECIMAL(10,2),
    "eficiencia_porcentaje" DECIMAL(5,2),
    "numero_total_bombas_sistema" INTEGER DEFAULT 1,
    "numero_bomba_en_sistema" INTEGER DEFAULT 1,
    "tiene_panel_control" BOOLEAN DEFAULT false,
    "marca_panel_control" VARCHAR(100),
    "modelo_panel_control" VARCHAR(100),
    "tiene_presostato" BOOLEAN DEFAULT false,
    "marca_presostato" VARCHAR(100),
    "modelo_presostato" VARCHAR(100),
    "presion_encendido_psi" DECIMAL(6,2),
    "presion_apagado_psi" DECIMAL(6,2),
    "tiene_contactor_externo" BOOLEAN DEFAULT false,
    "marca_contactor" VARCHAR(100),
    "amperaje_contactor" DECIMAL(6,2),
    "tiene_arrancador_suave" BOOLEAN DEFAULT false,
    "tiene_variador_frecuencia" BOOLEAN DEFAULT false,
    "marca_variador" VARCHAR(100),
    "modelo_variador" VARCHAR(100),
    "tiene_tanques_hidroneumaticos" BOOLEAN DEFAULT false,
    "cantidad_tanques" INTEGER,
    "capacidad_tanques_litros" DECIMAL(10,2),
    "presion_tanques_psi" DECIMAL(6,2),
    "tiene_manometro" BOOLEAN DEFAULT false,
    "rango_manometro_min_psi" DECIMAL(6,2) DEFAULT 0,
    "rango_manometro_max_psi" DECIMAL(6,2),
    "tiene_proteccion_nivel" BOOLEAN DEFAULT false,
    "tipo_proteccion_nivel" VARCHAR(50),
    "tiene_valvula_purga" BOOLEAN DEFAULT false,
    "tiene_valvula_cebado" BOOLEAN DEFAULT false,
    "tiene_valvula_cheque" BOOLEAN DEFAULT false,
    "tiene_valvula_pie" BOOLEAN DEFAULT false,
    "referencia_sello_mecanico" VARCHAR(100),
    "año_fabricacion" INTEGER,
    "observaciones" TEXT,
    "metadata" JSONB,
    "creado_por" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "equipos_bomba_pkey" PRIMARY KEY ("id_equipo")
);

-- CreateTable
CREATE TABLE "equipos_contrato" (
    "id_equipo_contrato" SERIAL NOT NULL,
    "id_contrato" INTEGER NOT NULL,
    "id_equipo" INTEGER NOT NULL,
    "tipo_servicio_default" INTEGER NOT NULL,
    "criterio_intervalo" "criterio_intervalo_enum" NOT NULL DEFAULT 'DIAS',
    "intervalo_dias" INTEGER,
    "intervalo_horas" INTEGER,
    "activo_en_contrato" BOOLEAN NOT NULL DEFAULT true,
    "fecha_inclusion" DATE NOT NULL DEFAULT CURRENT_DATE,
    "fecha_exclusion" DATE,

    CONSTRAINT "equipos_contrato_pkey" PRIMARY KEY ("id_equipo_contrato")
);

-- CreateTable
CREATE TABLE "equipos_generador" (
    "id_equipo" INTEGER NOT NULL,
    "marca_generador" VARCHAR(100) NOT NULL,
    "modelo_generador" VARCHAR(100),
    "numero_serie_generador" VARCHAR(100),
    "marca_alternador" VARCHAR(100),
    "modelo_alternador" VARCHAR(100),
    "numero_serie_alternador" VARCHAR(100),
    "potencia_kw" DECIMAL(10,2),
    "potencia_kva" DECIMAL(10,2),
    "factor_potencia" DECIMAL(3,2) DEFAULT 0.8,
    "voltaje_salida" VARCHAR(50) NOT NULL,
    "numero_fases" INTEGER DEFAULT 3,
    "frecuencia_hz" INTEGER DEFAULT 60,
    "amperaje_nominal_salida" DECIMAL(8,2),
    "configuracion_salida" VARCHAR(100),
    "tiene_avr" BOOLEAN DEFAULT true,
    "marca_avr" VARCHAR(50),
    "modelo_avr" VARCHAR(100),
    "referencia_avr" VARCHAR(100),
    "tiene_modulo_control" BOOLEAN DEFAULT true,
    "marca_modulo_control" VARCHAR(100),
    "modelo_modulo_control" VARCHAR(100),
    "tiene_arranque_automatico" BOOLEAN DEFAULT true,
    "capacidad_tanque_principal_litros" DECIMAL(10,2),
    "tiene_tanque_auxiliar" BOOLEAN DEFAULT false,
    "capacidad_tanque_auxiliar_litros" DECIMAL(10,2),
    "clase_aislamiento" VARCHAR(10),
    "grado_proteccion_ip" VARCHAR(10),
    "año_fabricacion" INTEGER,
    "observaciones" TEXT,
    "metadata" JSONB,
    "creado_por" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "equipos_generador_pkey" PRIMARY KEY ("id_equipo")
);

-- CreateTable
CREATE TABLE "equipos_motor" (
    "id_equipo" INTEGER NOT NULL,
    "tipo_motor" "tipo_motor_enum" NOT NULL,
    "marca_motor" VARCHAR(100) NOT NULL,
    "modelo_motor" VARCHAR(100),
    "numero_serie_motor" VARCHAR(100),
    "potencia_hp" DECIMAL(10,2),
    "potencia_kw" DECIMAL(10,2),
    "velocidad_nominal_rpm" INTEGER,
    "tipo_combustible" "tipo_combustible_enum",
    "numero_cilindros" INTEGER,
    "cilindrada_cc" INTEGER,
    "tiene_turbocargador" BOOLEAN DEFAULT false,
    "tipo_arranque" "tipo_arranque_enum" DEFAULT 'ELECTRICO',
    "voltaje_arranque_vdc" INTEGER,
    "amperaje_arranque" DECIMAL(8,2),
    "numero_baterias" INTEGER,
    "referencia_bateria" VARCHAR(100),
    "capacidad_bateria_ah" INTEGER,
    "tiene_radiador" BOOLEAN DEFAULT true,
    "radiador_alto_cm" DECIMAL(6,2),
    "radiador_ancho_cm" DECIMAL(6,2),
    "radiador_espesor_cm" DECIMAL(6,2),
    "tiene_cargador_bateria" BOOLEAN DEFAULT false,
    "marca_cargador" VARCHAR(100),
    "modelo_cargador" VARCHAR(100),
    "amperaje_cargador" DECIMAL(5,2),
    "capacidad_aceite_litros" DECIMAL(10,2),
    "tipo_aceite" VARCHAR(50),
    "capacidad_refrigerante_litros" DECIMAL(10,2),
    "tipo_refrigerante" VARCHAR(100),
    "voltaje_operacion_vac" VARCHAR(30),
    "numero_fases" "numero_fases_enum",
    "frecuencia_hz" INTEGER,
    "clase_aislamiento" "clase_aislamiento_enum",
    "grado_proteccion_ip" VARCHAR(10),
    "amperaje_nominal" DECIMAL(10,2),
    "factor_potencia" DECIMAL(3,2),
    "año_fabricacion" INTEGER,
    "observaciones" TEXT,
    "metadata" JSONB,
    "creado_por" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "equipos_motor_pkey" PRIMARY KEY ("id_equipo")
);

-- CreateTable
CREATE TABLE "estados_cotizacion" (
    "id_estado" SERIAL NOT NULL,
    "codigo_estado" VARCHAR(30) NOT NULL,
    "nombre_estado" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "permite_edicion" BOOLEAN DEFAULT true,
    "permite_eliminacion" BOOLEAN DEFAULT false,
    "es_estado_final" BOOLEAN DEFAULT false,
    "requiere_aprobacion_interna" BOOLEAN DEFAULT false,
    "color_hex" VARCHAR(7),
    "icono" VARCHAR(50),
    "orden_visualizacion" INTEGER NOT NULL DEFAULT 999,
    "activo" BOOLEAN DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estados_cotizacion_pkey" PRIMARY KEY ("id_estado")
);

-- CreateTable
CREATE TABLE "estados_orden" (
    "id_estado" SERIAL NOT NULL,
    "codigo_estado" VARCHAR(30) NOT NULL,
    "nombre_estado" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "permite_edicion" BOOLEAN DEFAULT true,
    "permite_eliminacion" BOOLEAN DEFAULT false,
    "es_estado_final" BOOLEAN DEFAULT false,
    "color_hex" VARCHAR(7),
    "icono" VARCHAR(50),
    "orden_visualizacion" INTEGER,
    "activo" BOOLEAN DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estados_orden_pkey" PRIMARY KEY ("id_estado")
);

-- CreateTable
CREATE TABLE "evidencias_fotograficas" (
    "id_evidencia" SERIAL NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "id_actividad_ejecutada" INTEGER,
    "tipo_evidencia" "tipo_evidencia_enum" NOT NULL,
    "descripcion" VARCHAR(500),
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "ruta_archivo" VARCHAR(500) NOT NULL,
    "hash_sha256" VARCHAR(64) NOT NULL,
    "tamaño_bytes" BIGINT NOT NULL,
    "mime_type" VARCHAR(50) DEFAULT 'image/jpeg',
    "ancho_pixels" INTEGER,
    "alto_pixels" INTEGER,
    "orden_visualizacion" INTEGER,
    "es_principal" BOOLEAN DEFAULT false,
    "fecha_captura" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "capturada_por" INTEGER,
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "metadata_exif" JSONB,
    "tiene_miniatura" BOOLEAN DEFAULT false,
    "ruta_miniatura" VARCHAR(500),
    "esta_comprimida" BOOLEAN DEFAULT false,
    "tamaño_original_bytes" BIGINT,
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "id_orden_equipo" INTEGER,
    "id_lote_galeria" INTEGER,

    CONSTRAINT "evidencias_fotograficas_pkey" PRIMARY KEY ("id_evidencia")
);

-- CreateTable
CREATE TABLE "lotes_galeria" (
    "id_lote_galeria" SERIAL NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "nombre_lote" VARCHAR(100) NOT NULL,
    "orden_lote" INTEGER DEFAULT 0,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "creado_por" INTEGER,

    CONSTRAINT "lotes_galeria_pkey" PRIMARY KEY ("id_lote_galeria")
);

-- CreateTable
CREATE TABLE "firmas_administrativas" (
    "id_firma_administrativa" SERIAL NOT NULL,
    "firma_activa" BOOLEAN DEFAULT true,
    "observaciones" TEXT,
    "requisitos_operativos" TEXT,
    "creado_por" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),
    "nombre_de_firma" TEXT,
    "representante_legal" TEXT,
    "contacto_de_representante_legal" DECIMAL,
    "email_representante_legal" TEXT,
    "id_empleado_asignado" INTEGER,

    CONSTRAINT "firmas_administrativas_pkey" PRIMARY KEY ("id_firma_administrativa")
);

-- CreateTable
CREATE TABLE "firmas_digitales" (
    "id_firma_digital" SERIAL NOT NULL,
    "id_persona" INTEGER NOT NULL,
    "tipo_firma" "tipo_firma_digital_enum" NOT NULL,
    "firma_base64" TEXT NOT NULL,
    "formato_firma" VARCHAR(10) DEFAULT 'PNG',
    "hash_firma" VARCHAR(64) NOT NULL,
    "fecha_captura" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "es_firma_principal" BOOLEAN DEFAULT false,
    "activa" BOOLEAN DEFAULT true,
    "observaciones" TEXT,
    "registrada_por" INTEGER NOT NULL,
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firmas_digitales_pkey" PRIMARY KEY ("id_firma_digital")
);

-- CreateTable
CREATE TABLE "gastos_orden" (
    "id_gasto" SERIAL NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "tipo_gasto" "tipo_gasto_enum" NOT NULL,
    "descripcion" VARCHAR(300) NOT NULL,
    "justificacion" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "tiene_comprobante" BOOLEAN DEFAULT false,
    "numero_comprobante" VARCHAR(100),
    "proveedor" VARCHAR(200),
    "ruta_comprobante" VARCHAR(500),
    "requiere_aprobacion" BOOLEAN DEFAULT false,
    "aprobado_por" INTEGER,
    "fecha_aprobacion" TIMESTAMP(6),
    "estado_aprobacion" "estado_aprobacion_gasto_enum" DEFAULT 'APROBADO',
    "observaciones_aprobacion" TEXT,
    "fecha_gasto" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "generado_por" INTEGER,
    "observaciones" TEXT,
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "registrado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),
    "modificado_por" INTEGER,

    CONSTRAINT "gastos_orden_pkey" PRIMARY KEY ("id_gasto")
);

-- CreateTable
CREATE TABLE "historial_contrato" (
    "id_historial" SERIAL NOT NULL,
    "id_contrato" INTEGER NOT NULL,
    "campo_modificado" VARCHAR(50) NOT NULL,
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT NOT NULL,
    "motivo_cambio" TEXT,
    "fecha_cambio" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER NOT NULL,

    CONSTRAINT "historial_contrato_pkey" PRIMARY KEY ("id_historial")
);

-- CreateTable
CREATE TABLE "historial_envios" (
    "id_envio" SERIAL NOT NULL,
    "tipo_documento" VARCHAR(20) NOT NULL,
    "id_cotizacion" INTEGER,
    "id_propuesta" INTEGER,
    "fecha_envio" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "enviado_por" INTEGER NOT NULL,
    "canal_envio" VARCHAR(50) DEFAULT 'EMAIL',
    "destinatario_email" VARCHAR(255) NOT NULL,
    "destinatario_nombre" VARCHAR(200),
    "emails_copia" VARCHAR[],
    "asunto_email" VARCHAR(500),
    "cuerpo_email" TEXT,
    "ruta_pdf_generado" VARCHAR(500),
    "tamaño_pdf_bytes" BIGINT,
    "hash_pdf_sha256" VARCHAR(64),
    "archivos_adjuntos" JSONB,
    "estado_envio" VARCHAR(50) DEFAULT 'ENVIADO',
    "mensaje_error" TEXT,
    "id_mensaje_externo" VARCHAR(255),
    "email_abierto" BOOLEAN DEFAULT false,
    "fecha_apertura" TIMESTAMP(6),
    "contador_aperturas" INTEGER DEFAULT 0,
    "ip_apertura" VARCHAR(45),
    "user_agent_apertura" VARCHAR(500),
    "metadata" JSONB,

    CONSTRAINT "historial_envios_pkey" PRIMARY KEY ("id_envio")
);

-- CreateTable
CREATE TABLE "historial_estados_equipo" (
    "id_historial" SERIAL NOT NULL,
    "id_equipo" INTEGER NOT NULL,
    "estado_anterior" "estado_equipo_enum",
    "estado_nuevo" "estado_equipo_enum" NOT NULL,
    "fecha_cambio" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "motivo_cambio" VARCHAR(500),
    "cambiado_por" INTEGER NOT NULL,
    "contexto" JSONB,

    CONSTRAINT "historial_estados_equipo_pkey" PRIMARY KEY ("id_historial")
);

-- CreateTable
CREATE TABLE "historial_estados_orden" (
    "id_historial" SERIAL NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "id_estado_anterior" INTEGER,
    "id_estado_nuevo" INTEGER NOT NULL,
    "motivo_cambio" TEXT,
    "observaciones" TEXT,
    "accion" VARCHAR(100),
    "fecha_cambio" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "realizado_por" INTEGER NOT NULL,
    "ip_origen" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "duracion_estado_anterior_minutos" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "historial_estados_orden_pkey" PRIMARY KEY ("id_historial")
);

-- CreateTable
CREATE TABLE "informes" (
    "id_informe" SERIAL NOT NULL,
    "numero_informe" VARCHAR(50) NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "id_plantilla_informe" INTEGER,
    "fecha_generacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generado_por" INTEGER NOT NULL,
    "estado_informe" "estado_informe_enum" NOT NULL DEFAULT 'BORRADOR',
    "revisado_por" INTEGER,
    "fecha_revision" TIMESTAMP(6),
    "observaciones_revision" TEXT,
    "aprobado_por" INTEGER,
    "fecha_aprobacion" TIMESTAMP(6),
    "id_documento_pdf" INTEGER,
    "cliente_visualizo" BOOLEAN NOT NULL DEFAULT false,
    "fecha_visualizacion_cliente" TIMESTAMP(6),
    "cliente_aprobo" BOOLEAN NOT NULL DEFAULT false,
    "fecha_aprobacion_cliente" TIMESTAMP(6),
    "firma_digital_cliente" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "informes_pkey" PRIMARY KEY ("id_informe")
);

-- CreateTable
CREATE TABLE "items_cotizacion_componentes" (
    "id_item_componente" SERIAL NOT NULL,
    "id_cotizacion" INTEGER NOT NULL,
    "id_componente" INTEGER,
    "id_tipo_componente" INTEGER NOT NULL,
    "descripcion" VARCHAR(300) NOT NULL,
    "referencia_manual" VARCHAR(100),
    "marca_manual" VARCHAR(100),
    "cantidad" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unidad" VARCHAR(20) DEFAULT 'unidad',
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "descuento_porcentaje" DECIMAL(5,2) DEFAULT 0,
    "subtotal" DECIMAL(12,2),
    "garantia_meses" INTEGER,
    "observaciones_garantia" TEXT,
    "observaciones" TEXT,
    "orden_item" INTEGER,
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "registrado_por" INTEGER,

    CONSTRAINT "items_cotizacion_componentes_pkey" PRIMARY KEY ("id_item_componente")
);

-- CreateTable
CREATE TABLE "items_cotizacion_servicios" (
    "id_item_servicio" SERIAL NOT NULL,
    "id_cotizacion" INTEGER NOT NULL,
    "id_servicio" INTEGER NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unidad" VARCHAR(20) DEFAULT 'servicio',
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "descuento_porcentaje" DECIMAL(5,2) DEFAULT 0,
    "subtotal" DECIMAL(12,2),
    "descripcion_personalizada" TEXT,
    "observaciones" TEXT,
    "justificacion_precio" TEXT,
    "orden_item" INTEGER,
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "registrado_por" INTEGER,

    CONSTRAINT "items_cotizacion_servicios_pkey" PRIMARY KEY ("id_item_servicio")
);

-- CreateTable
CREATE TABLE "items_propuesta" (
    "id_item_propuesta" SERIAL NOT NULL,
    "id_propuesta" INTEGER NOT NULL,
    "tipo_item" VARCHAR(20) NOT NULL,
    "id_servicio" INTEGER,
    "id_componente" INTEGER,
    "id_tipo_componente" INTEGER,
    "descripcion" VARCHAR(300) NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unidad" VARCHAR(20) DEFAULT 'unidad',
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "descuento_porcentaje" DECIMAL(5,2) DEFAULT 0,
    "subtotal" DECIMAL(12,2),
    "observaciones" TEXT,
    "orden_item" INTEGER,
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_propuesta_pkey" PRIMARY KEY ("id_item_propuesta")
);

-- CreateTable
CREATE TABLE "lecturas_horometro" (
    "id_lectura" SERIAL NOT NULL,
    "id_equipo" INTEGER NOT NULL,
    "horas_lectura" DECIMAL(10,2) NOT NULL,
    "fecha_lectura" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_orden_servicio" INTEGER,
    "tipo_lectura" "tipo_lectura_horometro_enum" DEFAULT 'MANTENIMIENTO',
    "horas_transcurridas" DECIMAL(10,2),
    "dias_transcurridos" INTEGER,
    "horas_promedio_dia" DECIMAL(10,2),
    "observaciones" TEXT,
    "registrado_por" INTEGER NOT NULL,

    CONSTRAINT "lecturas_horometro_pkey" PRIMARY KEY ("id_lectura")
);

-- CreateTable
CREATE TABLE "lotes_componentes" (
    "id_lote" SERIAL NOT NULL,
    "codigo_lote" VARCHAR(50) NOT NULL,
    "id_componente" INTEGER NOT NULL,
    "fecha_fabricacion" DATE,
    "fecha_vencimiento" DATE,
    "cantidad_inicial" DECIMAL(10,2) NOT NULL,
    "cantidad_actual" DECIMAL(10,2) NOT NULL,
    "estado_lote" "estado_lote_enum" NOT NULL DEFAULT 'DISPONIBLE',
    "id_proveedor" INTEGER,
    "numero_factura_proveedor" VARCHAR(100),
    "observaciones" TEXT,
    "fecha_ingreso" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingresado_por" INTEGER NOT NULL,

    CONSTRAINT "lotes_componentes_pkey" PRIMARY KEY ("id_lote")
);

-- CreateTable
CREATE TABLE "mediciones_servicio" (
    "id_medicion" SERIAL NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "id_parametro_medicion" INTEGER NOT NULL,
    "valor_numerico" DECIMAL(12,2),
    "valor_texto" TEXT,
    "unidad_medida" VARCHAR(20),
    "fuera_de_rango" BOOLEAN,
    "nivel_alerta" "nivel_alerta_enum",
    "mensaje_alerta" TEXT,
    "observaciones" TEXT,
    "temperatura_ambiente" DECIMAL(5,2),
    "humedad_relativa" DECIMAL(5,2),
    "fecha_medicion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "medido_por" INTEGER,
    "instrumento_medicion" VARCHAR(200),
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "id_orden_equipo" INTEGER,
    "excluido_pdf" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "mediciones_servicio_pkey" PRIMARY KEY ("id_medicion")
);

-- CreateTable
CREATE TABLE "motivos_ajuste" (
    "id_motivo_ajuste" SERIAL NOT NULL,
    "codigo_motivo" VARCHAR(30) NOT NULL,
    "nombre_motivo" VARCHAR(100) NOT NULL,
    "categoria" "categoria_motivo_ajuste_enum" NOT NULL,
    "requiere_justificacion_detallada" BOOLEAN NOT NULL DEFAULT true,
    "requiere_aprobacion_gerencia" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "motivos_ajuste_pkey" PRIMARY KEY ("id_motivo_ajuste")
);

-- CreateTable
CREATE TABLE "motivos_rechazo" (
    "id_motivo_rechazo" SERIAL NOT NULL,
    "codigo_motivo" VARCHAR(30) NOT NULL,
    "nombre_motivo" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "requiere_observacion" BOOLEAN DEFAULT false,
    "categoria" VARCHAR(50) NOT NULL DEFAULT 'INTERNO',
    "color_hex" VARCHAR(7),
    "icono" VARCHAR(50),
    "orden_visualizacion" INTEGER NOT NULL DEFAULT 999,
    "activo" BOOLEAN DEFAULT true,
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motivos_rechazo_pkey" PRIMARY KEY ("id_motivo_rechazo")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id_movimiento" SERIAL NOT NULL,
    "tipo_movimiento" "tipo_movimiento_inventario_enum" NOT NULL,
    "origen_movimiento" "origen_movimiento_inventario_enum" NOT NULL,
    "id_componente" INTEGER NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "costo_unitario" DECIMAL(12,2),
    "id_ubicacion" INTEGER,
    "id_lote" INTEGER,
    "id_orden_servicio" INTEGER,
    "id_orden_compra" INTEGER,
    "id_remision" INTEGER,
    "justificacion" TEXT,
    "observaciones" TEXT,
    "fecha_movimiento" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "realizado_por" INTEGER NOT NULL,
    "aprobado_por" INTEGER,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id_notificacion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "tipo_notificacion" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "prioridad" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_lectura" TIMESTAMP(6),
    "id_entidad_relacionada" INTEGER,
    "tipo_entidad_relacionada" VARCHAR(50),
    "url_accion" VARCHAR(500),
    "datos_extra" TEXT,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateTable
CREATE TABLE "ordenes_actividades_plan" (
    "id_orden_actividad_plan" SERIAL NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "id_actividad_catalogo" INTEGER NOT NULL,
    "orden_secuencia" INTEGER DEFAULT 1,
    "origen" "origen_actividad_plan_enum" DEFAULT 'ADMIN',
    "es_obligatoria" BOOLEAN DEFAULT true,
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "ordenes_actividades_plan_pkey" PRIMARY KEY ("id_orden_actividad_plan")
);

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id_orden_compra" SERIAL NOT NULL,
    "numero_orden_compra" VARCHAR(50) NOT NULL,
    "id_proveedor" INTEGER NOT NULL,
    "fecha_solicitud" DATE NOT NULL DEFAULT CURRENT_DATE,
    "fecha_necesidad" DATE,
    "estado" "estado_orden_compra_enum" NOT NULL DEFAULT 'BORRADOR',
    "observaciones" TEXT,
    "solicitada_por" INTEGER NOT NULL,
    "aprobada_por" INTEGER,
    "fecha_aprobacion" TIMESTAMP(6),

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id_orden_compra")
);

-- CreateTable
CREATE TABLE "ordenes_compra_detalle" (
    "id_detalle" SERIAL NOT NULL,
    "id_orden_compra" INTEGER NOT NULL,
    "id_componente" INTEGER NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2),
    "observaciones" TEXT,

    CONSTRAINT "ordenes_compra_detalle_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "ordenes_servicio" (
    "id_orden_servicio" SERIAL NOT NULL,
    "numero_orden" VARCHAR(50) NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_sede" INTEGER,
    "id_equipo" INTEGER NOT NULL,
    "id_tipo_servicio" INTEGER,
    "id_cronograma" INTEGER,
    "fecha_programada" DATE,
    "hora_programada" TIME(6),
    "prioridad" "prioridad_enum" DEFAULT 'NORMAL',
    "origen_solicitud" "origen_solicitud_enum" DEFAULT 'PROGRAMADO',
    "id_tecnico_asignado" INTEGER,
    "id_supervisor" INTEGER,
    "fecha_asignacion" TIMESTAMP(6),
    "fecha_inicio_real" TIMESTAMP(6),
    "fecha_fin_real" TIMESTAMP(6),
    "duracion_minutos" INTEGER,
    "id_estado_actual" INTEGER NOT NULL,
    "fecha_cambio_estado" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "requiere_firma_cliente" BOOLEAN DEFAULT true,
    "id_firma_cliente" INTEGER,
    "nombre_quien_recibe" VARCHAR(200),
    "cargo_quien_recibe" VARCHAR(100),
    "cliente_conforme" BOOLEAN,
    "calificacion_cliente" INTEGER,
    "descripcion_inicial" TEXT,
    "trabajo_realizado" TEXT,
    "observaciones_tecnico" TEXT,
    "observaciones_cierre" TEXT,
    "tiene_garantia" BOOLEAN DEFAULT false,
    "meses_garantia" INTEGER,
    "fecha_vencimiento_garantia" DATE,
    "observaciones_garantia" TEXT,
    "aprobada_por" INTEGER,
    "fecha_aprobacion" TIMESTAMP(6),
    "total_servicios" DECIMAL(12,2) DEFAULT 0,
    "total_gastos" DECIMAL(12,2) DEFAULT 0,
    "total_componentes" DECIMAL(12,2) DEFAULT 0,
    "total_general" DECIMAL(12,2) DEFAULT 0,
    "metadata" JSONB,
    "creado_por" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),
    "id_firma_tecnico" INTEGER,
    "edicion_tecnico_habilitada" BOOLEAN NOT NULL DEFAULT false,
    "edicion_tecnico_autorizada_por" INTEGER,
    "edicion_tecnico_fecha_autorizacion" TIMESTAMP(6),
    "edicion_tecnico_motivo" VARCHAR(500),
    "id_orden_padre" INTEGER,
    "tipo_visita" VARCHAR(50) DEFAULT 'INICIAL',
    "numero_visita_caso" INTEGER DEFAULT 1,
    "nombre_caso" VARCHAR(250),
    "estado_caso" VARCHAR(30) DEFAULT 'ABIERTO',

    CONSTRAINT "ordenes_servicio_pkey" PRIMARY KEY ("id_orden_servicio")
);

-- CreateTable
CREATE TABLE "historial_emails_enviados" (
    "id_historial_email" SERIAL NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "destinatario_to" VARCHAR(300) NOT NULL,
    "destinatarios_cc" VARCHAR(500),
    "asunto" VARCHAR(500) NOT NULL,
    "estado_envio" "estado_envio_email_enum" NOT NULL DEFAULT 'EXITOSO',
    "mensaje_error" TEXT,
    "message_id" VARCHAR(300),
    "url_pdf_enviado" VARCHAR(500),
    "origen_envio" VARCHAR(50) NOT NULL DEFAULT 'ADMIN_PORTAL',
    "fecha_envio" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_por" INTEGER,

    CONSTRAINT "historial_emails_enviados_pkey" PRIMARY KEY ("id_historial_email")
);

-- CreateTable
CREATE TABLE "parametros_medicion" (
    "id_parametro_medicion" SERIAL NOT NULL,
    "codigo_parametro" VARCHAR(50) NOT NULL,
    "nombre_parametro" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "unidad_medida" VARCHAR(20) NOT NULL,
    "tipo_dato" "tipo_dato_parametro_enum" DEFAULT 'NUMERICO',
    "valor_minimo_normal" DECIMAL(10,2),
    "valor_maximo_normal" DECIMAL(10,2),
    "valor_minimo_critico" DECIMAL(10,2),
    "valor_maximo_critico" DECIMAL(10,2),
    "valor_ideal" DECIMAL(10,2),
    "categoria" "categoria_parametro_enum" NOT NULL,
    "id_tipo_equipo" INTEGER,
    "es_critico_seguridad" BOOLEAN DEFAULT false,
    "es_obligatorio" BOOLEAN DEFAULT false,
    "decimales_precision" INTEGER DEFAULT 2,
    "activo" BOOLEAN DEFAULT true,
    "observaciones" TEXT,
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),
    "unidad_codigo" VARCHAR(20),

    CONSTRAINT "parametros_medicion_pkey" PRIMARY KEY ("id_parametro_medicion")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id_permiso" SERIAL NOT NULL,
    "codigo_permiso" VARCHAR(100) NOT NULL,
    "nombre_permiso" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "modulo" VARCHAR(50) NOT NULL,
    "activo" BOOLEAN DEFAULT true,
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "creado_por" INTEGER,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id_permiso")
);

-- CreateTable
CREATE TABLE "personas" (
    "id_persona" SERIAL NOT NULL,
    "tipo_identificacion" "tipo_identificacion_enum" NOT NULL,
    "numero_identificacion" VARCHAR(20) NOT NULL,
    "tipo_persona" "tipo_persona_enum" NOT NULL,
    "primer_nombre" VARCHAR(50),
    "segundo_nombre" VARCHAR(50),
    "primer_apellido" VARCHAR(50),
    "segundo_apellido" VARCHAR(50),
    "nombre_completo" TEXT,
    "razon_social" VARCHAR(200),
    "nombre_comercial" VARCHAR(200),
    "representante_legal" VARCHAR(200),
    "cedula_representante" VARCHAR(20),
    "email_principal" VARCHAR(150),
    "telefono_principal" VARCHAR(20),
    "telefono_secundario" VARCHAR(20),
    "celular" VARCHAR(20),
    "direccion_principal" VARCHAR(300),
    "url_ubicacion" VARCHAR(500),
    "barrio_zona" VARCHAR(100),
    "ciudad" VARCHAR(100) NOT NULL DEFAULT 'CARTAGENA',
    "departamento" VARCHAR(100) DEFAULT 'BOLÍVAR',
    "pais" VARCHAR(100) DEFAULT 'COLOMBIA',
    "fecha_nacimiento" DATE,
    "es_cliente" BOOLEAN DEFAULT false,
    "es_proveedor" BOOLEAN DEFAULT false,
    "es_empleado" BOOLEAN DEFAULT false,
    "es_contratista" BOOLEAN DEFAULT false,
    "ruta_foto" VARCHAR(500),
    "observaciones" TEXT,
    "activo" BOOLEAN DEFAULT true,
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id_persona")
);

-- CreateTable
CREATE TABLE "plantillas_informe" (
    "id_plantilla_informe" SERIAL NOT NULL,
    "nombre_plantilla" VARCHAR(100) NOT NULL,
    "id_tipo_servicio" INTEGER,
    "texto_introduccion" TEXT,
    "configuracion_secciones" JSONB NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "plantillas_informe_pkey" PRIMARY KEY ("id_plantilla_informe")
);

-- CreateTable
CREATE TABLE "propuestas_correctivo" (
    "id_propuesta" SERIAL NOT NULL,
    "numero_propuesta" VARCHAR(50) NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_equipo" INTEGER,
    "descripcion_problema" TEXT NOT NULL,
    "solucion_propuesta" TEXT NOT NULL,
    "categoria" "categoria_propuesta_enum" DEFAULT 'CORRECTIVO',
    "prioridad" "prioridad_enum" DEFAULT 'NORMAL',
    "id_estado" INTEGER NOT NULL,
    "fecha_cambio_estado" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "id_motivo_rechazo" INTEGER,
    "observaciones_rechazo" TEXT,
    "fecha_propuesta" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" DATE,
    "subtotal_servicios" DECIMAL(12,2),
    "subtotal_componentes" DECIMAL(12,2),
    "total_propuesta" DECIMAL(12,2),
    "id_orden_servicio_generada" INTEGER,
    "fecha_conversion_os" TIMESTAMP(6),
    "observaciones" TEXT,
    "metadata" JSONB,
    "propuesta_por" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "aprobada_por" INTEGER,
    "fecha_aprobacion" TIMESTAMP(6),
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "propuestas_correctivo_pkey" PRIMARY KEY ("id_propuesta")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id_proveedor" SERIAL NOT NULL,
    "id_persona" INTEGER NOT NULL,
    "codigo_proveedor" VARCHAR(20),
    "tipo_proveedor" "tipo_proveedor_enum" DEFAULT 'NACIONAL',
    "categoria_proveedor" "categoria_proveedor_enum" NOT NULL,
    "responsable_iva" BOOLEAN DEFAULT true,
    "tiempo_entrega_dias" INTEGER,
    "servicios_ofrecidos" TEXT,
    "tarifa_hora" DECIMAL(12,2),
    "tarifa_dia" DECIMAL(12,2),
    "tiene_arl" BOOLEAN DEFAULT false,
    "nombre_arl" VARCHAR(100),
    "fecha_vencimiento_arl" DATE,
    "realiza_entregas" BOOLEAN DEFAULT true,
    "costo_envio" DECIMAL(12,2),
    "zona_cobertura" VARCHAR(500),
    "proveedor_activo" BOOLEAN DEFAULT true,
    "bloqueado" BOOLEAN DEFAULT false,
    "motivo_bloqueo" VARCHAR(500),
    "fecha_bloqueo" DATE,
    "bloqueado_por" INTEGER,
    "observaciones" TEXT,
    "creado_por" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id_proveedor")
);

-- CreateTable
CREATE TABLE "recepciones_compra" (
    "id_recepcion" SERIAL NOT NULL,
    "numero_recepcion" VARCHAR(50) NOT NULL,
    "id_orden_compra" INTEGER NOT NULL,
    "id_detalle_orden" INTEGER NOT NULL,
    "cantidad_recibida" DECIMAL(10,2) NOT NULL,
    "tipo_recepcion" "tipo_recepcion_compra_enum" NOT NULL,
    "cantidad_aceptada" DECIMAL(10,2) NOT NULL,
    "cantidad_rechazada" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "calidad" "calidad_recepcion_enum" NOT NULL,
    "id_ubicacion_destino" INTEGER,
    "costo_unitario_real" DECIMAL(12,2),
    "observaciones" TEXT,
    "recibido_por" INTEGER NOT NULL,
    "fecha_recepcion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recepciones_compra_pkey" PRIMARY KEY ("id_recepcion")
);

-- CreateTable
CREATE TABLE "remisiones" (
    "id_remision" SERIAL NOT NULL,
    "numero_remision" VARCHAR(50) NOT NULL,
    "fecha_remision" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_destino" "tipo_destino_remision_enum" NOT NULL,
    "id_destino" INTEGER NOT NULL,
    "nombre_destinatario" VARCHAR(200) NOT NULL,
    "tipo_remision" "tipo_remision_enum" NOT NULL,
    "requiere_devolucion" BOOLEAN NOT NULL,
    "fecha_devolucion_esperada" DATE,
    "fecha_devolucion_real" TIMESTAMP(6),
    "id_orden_servicio" INTEGER,
    "id_cotizacion" INTEGER,
    "estado_remision" "estado_remision_enum" NOT NULL DEFAULT 'ABIERTA',
    "fecha_cierre" TIMESTAMP(6),
    "entregado_por" INTEGER NOT NULL,
    "recibido_por" VARCHAR(200),
    "firma_digital_recepcion" TEXT,

    CONSTRAINT "remisiones_pkey" PRIMARY KEY ("id_remision")
);

-- CreateTable
CREATE TABLE "remisiones_detalle" (
    "id_detalle_remision" SERIAL NOT NULL,
    "id_remision" INTEGER NOT NULL,
    "tipo_item" "tipo_item_remision_enum" NOT NULL,
    "id_componente" INTEGER,
    "descripcion_item" VARCHAR(300) NOT NULL,
    "cantidad_entregada" DECIMAL(10,2) NOT NULL,
    "cantidad_devuelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cantidad_pendiente" DECIMAL(10,2),
    "estado_item" "estado_item_remision_enum" NOT NULL DEFAULT 'ENTREGADO',
    "observaciones" TEXT,

    CONSTRAINT "remisiones_detalle_pkey" PRIMARY KEY ("id_detalle_remision")
);

-- CreateTable
CREATE TABLE "roles" (
    "id_rol" SERIAL NOT NULL,
    "codigo_rol" VARCHAR(50) NOT NULL,
    "nombre_rol" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "nivel_jerarquia" INTEGER DEFAULT 0,
    "es_rol_sistema" BOOLEAN DEFAULT false,
    "color_hex" VARCHAR(7),
    "icono" VARCHAR(50),
    "permite_acceso_web" BOOLEAN DEFAULT true,
    "permite_acceso_movil" BOOLEAN DEFAULT false,
    "permite_acceso_portal_cliente" BOOLEAN DEFAULT false,
    "activo" BOOLEAN DEFAULT true,
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "creado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),
    "modificado_por" INTEGER,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "roles_permisos" (
    "id_rol" INTEGER NOT NULL,
    "id_permiso" INTEGER NOT NULL,
    "fecha_asignacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "asignado_por" INTEGER,

    CONSTRAINT "roles_permisos_pkey" PRIMARY KEY ("id_rol","id_permiso")
);

-- CreateTable
CREATE TABLE "sedes_cliente" (
    "id_sede" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "nombre_sede" VARCHAR(200) NOT NULL,
    "direccion_sede" VARCHAR(300) NOT NULL,
    "barrio_zona" VARCHAR(100),
    "ciudad_sede" VARCHAR(100) NOT NULL DEFAULT 'CARTAGENA',
    "departamento_sede" VARCHAR(100) DEFAULT 'BOLÍVAR',
    "zona_geografica" "zona_geografica_enum",
    "contacto_sede" VARCHAR(200),
    "cargo_contacto" VARCHAR(100),
    "telefono_sede" VARCHAR(20),
    "celular_sede" VARCHAR(20),
    "email_sede" VARCHAR(150),
    "activo" BOOLEAN DEFAULT true,
    "fecha_cierre" DATE,
    "motivo_cierre" VARCHAR(500),
    "observaciones" TEXT,
    "creado_por" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "sedes_cliente_pkey" PRIMARY KEY ("id_sede")
);

-- CreateTable
CREATE TABLE "sequence_counter" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "year" INTEGER NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "sequence_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_componente" (
    "id_tipo_componente" SERIAL NOT NULL,
    "codigo_tipo" VARCHAR(50) NOT NULL,
    "nombre_componente" VARCHAR(100) NOT NULL,
    "categoria" "categoria_componente_enum" NOT NULL,
    "subcategoria" VARCHAR(50),
    "es_consumible" BOOLEAN DEFAULT true,
    "es_inventariable" BOOLEAN DEFAULT true,
    "aplica_a" "aplicabilidad_enum",
    "aplica_todos_tipos" BOOLEAN NOT NULL DEFAULT true,
    "descripcion" TEXT,
    "activo" BOOLEAN DEFAULT true,
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_componente_pkey" PRIMARY KEY ("id_tipo_componente")
);

-- CreateTable
CREATE TABLE "tipos_equipo" (
    "id_tipo_equipo" SERIAL NOT NULL,
    "codigo_tipo" VARCHAR(30) NOT NULL,
    "nombre_tipo" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "categoria" "categoria_equipo_enum" DEFAULT 'OTRO',
    "id_categoria_activo" INTEGER,
    "tiene_motor" BOOLEAN DEFAULT false,
    "tiene_generador" BOOLEAN DEFAULT false,
    "tiene_bomba" BOOLEAN DEFAULT false,
    "requiere_horometro" BOOLEAN DEFAULT false,
    "permite_mantenimiento_tipo_a" BOOLEAN DEFAULT true,
    "permite_mantenimiento_tipo_b" BOOLEAN DEFAULT false,
    "intervalo_tipo_a_dias" INTEGER,
    "intervalo_tipo_a_horas" DECIMAL(10,1),
    "intervalo_tipo_b_dias" INTEGER,
    "intervalo_tipo_b_horas" DECIMAL(10,1),
    "criterio_intervalo" "criterio_intervalo_enum" DEFAULT 'DIAS',
    "formato_ficha_tecnica" VARCHAR(50) NOT NULL,
    "formato_mantenimiento_tipo_a" VARCHAR(50),
    "formato_mantenimiento_tipo_b" VARCHAR(50),
    "orden" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "activo" BOOLEAN DEFAULT true,
    "disponible" BOOLEAN DEFAULT true,
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),
    "icono_ui" VARCHAR(50),
    "color_hex" VARCHAR(20),
    "prefijo_codigo" VARCHAR(20),
    "unidad_uso" VARCHAR(20) NOT NULL DEFAULT 'HORAS',
    "etiqueta_contador" VARCHAR(50) NOT NULL DEFAULT 'Horómetro',
    "usa_plantilla_universal" BOOLEAN NOT NULL DEFAULT false,
    "version_esquema" INTEGER NOT NULL DEFAULT 1,
    "bloques_opcionales" JSONB,

    CONSTRAINT "tipos_equipo_pkey" PRIMARY KEY ("id_tipo_equipo")
);

-- CreateTable
CREATE TABLE "tipos_servicio" (
    "id_tipo_servicio" SERIAL NOT NULL,
    "codigo_tipo" VARCHAR(50) NOT NULL,
    "nombre_tipo" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "categoria" "categoria_servicio_enum" NOT NULL,
    "id_tipo_equipo" INTEGER,
    "aplica_a" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    "tiene_checklist" BOOLEAN DEFAULT true,
    "tiene_plantilla_informe" BOOLEAN DEFAULT true,
    "requiere_mediciones" BOOLEAN DEFAULT true,
    "duracion_estimada_horas" DECIMAL(4,2),
    "orden_visualizacion" INTEGER,
    "icono" VARCHAR(50),
    "color_hex" VARCHAR(7),
    "activo" BOOLEAN DEFAULT true,
    "observaciones" TEXT,
    "plantilla_observacion" TEXT,
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "tipos_servicio_pkey" PRIMARY KEY ("id_tipo_servicio")
);

-- CreateTable
CREATE TABLE "ubicaciones_bodega" (
    "id_ubicacion" SERIAL NOT NULL,
    "codigo_ubicacion" VARCHAR(20) NOT NULL,
    "zona" VARCHAR(50) NOT NULL,
    "pasillo" VARCHAR(10),
    "estante" VARCHAR(10),
    "nivel" VARCHAR(10),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ubicaciones_bodega_pkey" PRIMARY KEY ("id_ubicacion")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" SERIAL NOT NULL,
    "id_persona" INTEGER NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "debe_cambiar_password" BOOLEAN DEFAULT true,
    "fecha_ultimo_cambio_password" TIMESTAMP(6),
    "intentos_fallidos" INTEGER DEFAULT 0,
    "fecha_ultimo_intento_fallido" TIMESTAMP(6),
    "fecha_ultimo_bloqueo" TIMESTAMP(6),
    "bloqueado_por_intentos" BOOLEAN DEFAULT false,
    "token_recuperacion" VARCHAR(255),
    "fecha_expiracion_token" TIMESTAMP(6),
    "ultima_sesion" TIMESTAMP(6),
    "ultima_ip" VARCHAR(45),
    "dispositivo_ultimo_acceso" VARCHAR(300),
    "estado" "estado_usuario_enum" DEFAULT 'PENDIENTE_ACTIVACION',
    "fecha_activacion" TIMESTAMP(6),
    "fecha_desactivacion" TIMESTAMP(6),
    "motivo_suspension" VARCHAR(500),
    "suspendido_hasta" TIMESTAMP(6),
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "usuarios_roles" (
    "id_usuario" INTEGER NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "fecha_asignacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "asignado_por" INTEGER,

    CONSTRAINT "usuarios_roles_pkey" PRIMARY KEY ("id_usuario","id_rol")
);

-- CreateTable
CREATE TABLE "versiones_cotizacion" (
    "id_version" SERIAL NOT NULL,
    "id_cotizacion" INTEGER NOT NULL,
    "numero_version" INTEGER NOT NULL,
    "datos_cotizacion" JSONB NOT NULL,
    "items_servicios" JSONB,
    "items_componentes" JSONB,
    "subtotal_version" DECIMAL(12,2),
    "total_version" DECIMAL(12,2),
    "motivo_cambio" TEXT NOT NULL,
    "resumen_cambios" TEXT,
    "fecha_version" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "creada_por" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "versiones_cotizacion_pkey" PRIMARY KEY ("id_version")
);

-- CreateTable
CREATE TABLE "ordenes_equipos" (
    "id_orden_equipo" SERIAL NOT NULL,
    "id_orden_servicio" INTEGER NOT NULL,
    "id_equipo" INTEGER NOT NULL,
    "orden_secuencia" INTEGER NOT NULL DEFAULT 1,
    "nombre_sistema" VARCHAR(200),
    "estado" "estado_detalle_servicio_enum" DEFAULT 'PENDIENTE',
    "fecha_inicio" TIMESTAMP(6),
    "fecha_fin" TIMESTAMP(6),
    "observaciones" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "ordenes_equipos_pkey" PRIMARY KEY ("id_orden_equipo")
);

-- CreateTable
CREATE TABLE "plantillas_parametros" (
    "id_plantilla" SERIAL NOT NULL,
    "codigo_plantilla" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "marca" VARCHAR(50),
    "modelo" VARCHAR(50),
    "id_tipo_equipo" INTEGER,
    "configuracion" JSONB NOT NULL DEFAULT '{}',
    "activo" BOOLEAN DEFAULT true,
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,
    "fecha_modificacion" TIMESTAMP(6),

    CONSTRAINT "plantillas_parametros_pkey" PRIMARY KEY ("id_plantilla")
);

-- CreateTable
CREATE TABLE "cuentas_email" (
    "id_cuenta_email" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "tipo_proveedor" VARCHAR(20) NOT NULL DEFAULT 'GMAIL_OAUTH2',
    "nombre_remitente" VARCHAR(150),
    "gmail_client_id" TEXT,
    "gmail_client_secret" TEXT,
    "gmail_refresh_token" TEXT,
    "smtp_host" VARCHAR(255),
    "smtp_port" INTEGER,
    "smtp_secure" BOOLEAN NOT NULL DEFAULT true,
    "smtp_user" VARCHAR(255),
    "smtp_password_enc" TEXT,
    "es_cuenta_principal" BOOLEAN DEFAULT false,
    "activa" BOOLEAN DEFAULT true,
    "descripcion" TEXT,
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6),
    "creado_por" INTEGER,
    "modificado_por" INTEGER,

    CONSTRAINT "cuentas_email_pkey" PRIMARY KEY ("id_cuenta_email")
);

-- CreateTable
CREATE TABLE "catalogo_pendientes" (
    "id_pendiente_catalogo" SERIAL NOT NULL,
    "codigo" VARCHAR(50),
    "descripcion" VARCHAR(300) NOT NULL,
    "categoria" VARCHAR(100) DEFAULT 'GENERAL',
    "id_tipo_equipo" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden_visual" INTEGER DEFAULT 0,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_pendientes_pkey" PRIMARY KEY ("id_pendiente_catalogo")
);

-- CreateTable
CREATE TABLE "ordenes_pendientes" (
    "id_orden_pendiente" SERIAL NOT NULL,
    "id_orden_servicio" INTEGER,
    "id_cliente" INTEGER NOT NULL,
    "id_equipo" INTEGER,
    "id_orden_equipo" INTEGER,
    "id_pendiente_catalogo" INTEGER,
    "alcance" VARCHAR(30) DEFAULT 'EQUIPO',
    "descripcion" VARCHAR(1000) NOT NULL,
    "origen" "origen_pendiente_enum" DEFAULT 'CATALOGO',
    "prioridad" "prioridad_enum" DEFAULT 'NORMAL',
    "estado" "estado_pendiente_orden_enum" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "id_orden_resolucion" INTEGER,
    "creado_por" INTEGER,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_resolucion" TIMESTAMP(6),
    "resuelto_por" INTEGER,
    "observaciones_resolucion" TEXT,

    CONSTRAINT "ordenes_pendientes_pkey" PRIMARY KEY ("id_orden_pendiente")
);

-- CreateTable
CREATE TABLE "articulos_proveedores" (
    "id_componente" INTEGER NOT NULL,
    "id_proveedor" INTEGER NOT NULL,
    "referencia_proveedor" VARCHAR(100) NOT NULL,
    "marca_ofrecida" VARCHAR(100),
    "nombre_segun_proveedor" VARCHAR(200),
    "costo_actual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "moneda" VARCHAR(10) NOT NULL DEFAULT 'COP',
    "tiempo_entrega_dias" INTEGER DEFAULT 1,
    "cantidad_minima_compra" DECIMAL(10,2) DEFAULT 1,
    "escalas_precios" JSONB,
    "es_proveedor_preferido" BOOLEAN NOT NULL DEFAULT false,
    "url_producto_proveedor" VARCHAR(500),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "id_marca_ofrecida" INTEGER,
    "fecha_registro" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(6),
    "registrado_por" INTEGER,
    "modificado_por" INTEGER,

    CONSTRAINT "articulos_proveedores_pkey" PRIMARY KEY ("id_componente","id_proveedor")
);

-- CreateTable
CREATE TABLE "historial_costos_compra" (
    "id_historial_costo" SERIAL NOT NULL,
    "id_componente" INTEGER NOT NULL,
    "id_proveedor" INTEGER,
    "costo_unitario" DECIMAL(12,2) NOT NULL,
    "costo_unitario_anterior" DECIMAL(12,2),
    "moneda" VARCHAR(10) NOT NULL DEFAULT 'COP',
    "porcentaje_variacion" DECIMAL(6,2),
    "cantidad_adquirida" DECIMAL(10,2),
    "numero_factura_oc" VARCHAR(100),
    "origen_cambio" "origen_costo_enum" NOT NULL DEFAULT 'REGISTRO_INICIAL',
    "observaciones" TEXT,
    "id_usuario" INTEGER,
    "fecha_registro" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_costos_compra_pkey" PRIMARY KEY ("id_historial_costo")
);

-- CreateTable
CREATE TABLE "marcas" (
    "id_marca" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "pais_origen" VARCHAR(50),
    "sitio_web" VARCHAR(200),
    "logo_url" TEXT,
    "es_fabricante_oem" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id_marca")
);

-- CreateTable
CREATE TABLE "unidades_medida" (
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "simbolo" VARCHAR(25) NOT NULL,
    "tipo_magnitud" VARCHAR(50) NOT NULL DEFAULT 'CANTIDAD',
    "id_magnitud" INTEGER,
    "factor_a" DECIMAL(28,10) NOT NULL DEFAULT 1.0,
    "factor_b" DECIMAL(28,10) NOT NULL DEFAULT 0.0,
    "es_unidad_base" BOOLEAN NOT NULL DEFAULT false,
    "permite_decimales" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidades_medida_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "categorias_componente" (
    "id_categoria" SERIAL NOT NULL,
    "codigo_categoria" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "id_padre" INTEGER,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "ruta_jerarquica" VARCHAR(255) NOT NULL,
    "slug_path" VARCHAR(255) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_componente_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "catalogo_magnitudes" (
    "id_magnitud" SERIAL NOT NULL,
    "codigo_magnitud" VARCHAR(50) NOT NULL,
    "nombre_magnitud" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "unidad_base_codigo" VARCHAR(20),
    "es_sistema" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_magnitudes_pkey" PRIMARY KEY ("id_magnitud")
);

-- CreateTable
CREATE TABLE "atributos_tecnicos" (
    "id_atributo" SERIAL NOT NULL,
    "codigo_atributo" VARCHAR(60) NOT NULL,
    "nombre_atributo" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "tipo_control" VARCHAR(30) NOT NULL,
    "id_magnitud" INTEGER,
    "unidad_defecto_codigo" VARCHAR(20),
    "rol_semantico" VARCHAR(40) NOT NULL DEFAULT 'ESTANDAR',
    "opciones_json" JSONB,
    "validacion_json" JSONB,
    "es_sistema" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atributos_tecnicos_pkey" PRIMARY KEY ("id_atributo")
);

-- CreateTable
CREATE TABLE "modulos_tecnicos" (
    "id_modulo" SERIAL NOT NULL,
    "codigo_modulo" VARCHAR(50) NOT NULL,
    "nombre_modulo" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "icono" VARCHAR(50),
    "color_ui" VARCHAR(20),
    "es_sistema" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modulos_tecnicos_pkey" PRIMARY KEY ("id_modulo")
);

-- CreateTable
CREATE TABLE "modulo_atributos" (
    "id_modulo_atributo" SERIAL NOT NULL,
    "id_modulo" INTEGER NOT NULL,
    "id_atributo" INTEGER NOT NULL,
    "orden_visual" INTEGER NOT NULL DEFAULT 1,
    "obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "es_kpi" BOOLEAN NOT NULL DEFAULT false,
    "es_filtrable" BOOLEAN NOT NULL DEFAULT false,
    "visible_en_pdf" BOOLEAN NOT NULL DEFAULT true,
    "rol_semantico_override" VARCHAR(40),
    "grupo_visual" VARCHAR(60),
    "valor_defecto" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modulo_atributos_pkey" PRIMARY KEY ("id_modulo_atributo")
);

-- CreateTable
CREATE TABLE "tipo_equipo_modulos" (
    "id_tipo_equipo_modulo" SERIAL NOT NULL,
    "id_tipo_equipo" INTEGER NOT NULL,
    "id_modulo" INTEGER NOT NULL,
    "orden_visual" INTEGER NOT NULL DEFAULT 1,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "etiqueta_local" VARCHAR(100),
    "overrides_json" JSONB,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipo_equipo_modulos_pkey" PRIMARY KEY ("id_tipo_equipo_modulo")
);

-- CreateTable
CREATE TABLE "tipo_equipo_planes" (
    "id_plan" SERIAL NOT NULL,
    "id_tipo_equipo" INTEGER NOT NULL,
    "id_tipo_servicio" INTEGER NOT NULL,
    "nombre_plan" VARCHAR(120) NOT NULL,
    "frecuencia_dias" INTEGER,
    "frecuencia_uso" DECIMAL(10,1),
    "criterio_intervalo" VARCHAR(30) NOT NULL DEFAULT 'LO_QUE_OCURRA_PRIMERO',
    "es_plan_por_defecto" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipo_equipo_planes_pkey" PRIMARY KEY ("id_plan")
);

-- CreateTable
CREATE TABLE "modelos_equipo" (
    "id_modelo_equipo" SERIAL NOT NULL,
    "id_tipo_equipo" INTEGER NOT NULL,
    "codigo_modelo" VARCHAR(60) NOT NULL,
    "marca" VARCHAR(100) NOT NULL,
    "modelo" VARCHAR(100) NOT NULL,
    "nombre_comercial" VARCHAR(150),
    "especificaciones_base" JSONB NOT NULL DEFAULT '{}',
    "plantilla_parametros_config" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modelos_equipo_pkey" PRIMARY KEY ("id_modelo_equipo")
);

-- CreateTable
CREATE TABLE "modelos_equipo_bom" (
    "id_modelo_bom" SERIAL NOT NULL,
    "id_modelo_equipo" INTEGER NOT NULL,
    "id_componente" INTEGER NOT NULL,
    "cantidad_sugerida" DECIMAL(10,2) NOT NULL DEFAULT 1.0,
    "rol_bom" VARCHAR(30) NOT NULL DEFAULT 'TITULAR',
    "notas" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modelos_equipo_bom_pkey" PRIMARY KEY ("id_modelo_bom")
);

-- CreateTable
CREATE TABLE "equipos_atributos_filtro" (
    "id_filtro" SERIAL NOT NULL,
    "id_equipo" INTEGER NOT NULL,
    "codigo_atributo" VARCHAR(60) NOT NULL,
    "valor_num_base" DECIMAL(18,6),
    "valor_texto" VARCHAR(255),
    "unidad_base_codigo" VARCHAR(20),
    "fecha_actualizacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipos_atributos_filtro_pkey" PRIMARY KEY ("id_filtro")
);

-- CreateTable
CREATE TABLE "configuracion_organizacion" (
    "id_configuracion" INTEGER NOT NULL DEFAULT 1,
    "nombre_comercial" VARCHAR(150) NOT NULL DEFAULT 'Mi Organización',
    "razon_social" VARCHAR(200) NOT NULL DEFAULT 'Mi Organización S.A.',
    "tipo_id_fiscal" VARCHAR(30) NOT NULL DEFAULT 'NIT',
    "numero_id_fiscal" VARCHAR(60),
    "eslogan" VARCHAR(255),
    "sitio_web" VARCHAR(255),
    "email_contacto" VARCHAR(255),
    "telefono_principal" VARCHAR(50),
    "telefono_soporte" VARCHAR(50),
    "direccion_linea1" VARCHAR(300),
    "ciudad_defecto" VARCHAR(100) NOT NULL DEFAULT 'Ciudad',
    "departamento_defecto" VARCHAR(100),
    "pais_defecto" VARCHAR(100) NOT NULL DEFAULT 'Colombia',
    "codigo_pais_iso" VARCHAR(5) NOT NULL DEFAULT 'CO',
    "logo_principal_url" VARCHAR(500),
    "logo_claro_url" VARCHAR(500),
    "isotipo_url" VARCHAR(500),
    "favicon_url" VARCHAR(500),
    "color_primario" VARCHAR(20) NOT NULL DEFAULT '#1E40AF',
    "color_secundario" VARCHAR(20) NOT NULL DEFAULT '#0F172A',
    "color_acento" VARCHAR(20) NOT NULL DEFAULT '#0EA5E9',
    "color_exito" VARCHAR(20) NOT NULL DEFAULT '#16A34A',
    "color_alerta" VARCHAR(20) NOT NULL DEFAULT '#D97706',
    "color_peligro" VARCHAR(20) NOT NULL DEFAULT '#DC2626',
    "zona_horaria" VARCHAR(80) NOT NULL DEFAULT 'America/Bogota',
    "locale" VARCHAR(20) NOT NULL DEFAULT 'es-CO',
    "codigo_moneda" VARCHAR(10) NOT NULL DEFAULT 'COP',
    "simbolo_moneda" VARCHAR(10) NOT NULL DEFAULT '$',
    "decimales_moneda" INTEGER NOT NULL DEFAULT 0,
    "etiqueta_impuesto" VARCHAR(30) NOT NULL DEFAULT 'IVA',
    "tasa_impuesto_defecto" DECIMAL(5,2) NOT NULL DEFAULT 19.00,
    "prefijo_orden" VARCHAR(20) NOT NULL DEFAULT 'OS',
    "prefijo_cotizacion" VARCHAR(20) NOT NULL DEFAULT 'COT',
    "prefijo_informe" VARCHAR(20) NOT NULL DEFAULT 'INF',
    "prefijo_remision" VARCHAR(20) NOT NULL DEFAULT 'REM',
    "prefijo_oc" VARCHAR(20) NOT NULL DEFAULT 'OC',
    "prefijo_contrato" VARCHAR(20) NOT NULL DEFAULT 'CONT',
    "prefijo_propuesta" VARCHAR(20) NOT NULL DEFAULT 'PROP',
    "texto_pie_pdf" TEXT,
    "texto_disclaimer_repuestos_cliente" TEXT,
    "garantia_meses_defecto" INTEGER NOT NULL DEFAULT 3,
    "validez_cotizacion_dias_defecto" INTEGER NOT NULL DEFAULT 30,
    "requiere_firma_cliente_defecto" BOOLEAN NOT NULL DEFAULT true,
    "storage_prefijo_raiz" VARCHAR(100) NOT NULL DEFAULT 'eam-media',
    "politica_retencion_mobile_dias" INTEGER NOT NULL DEFAULT 30,
    "modulo_comercial_activo" BOOLEAN NOT NULL DEFAULT true,
    "modulo_inventario_activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificado_por" INTEGER,

    CONSTRAINT "configuracion_organizacion_pkey" PRIMARY KEY ("id_configuracion")
);

-- CreateTable
CREATE TABLE "categorias_activo" (
    "id_categoria_activo" SERIAL NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "icono_ui" VARCHAR(50),
    "color_hex" VARCHAR(20),
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_activo_pkey" PRIMARY KEY ("id_categoria_activo")
);

-- CreateTable
CREATE TABLE "tipos_componente_tipo_equipo" (
    "id_tipo_componente" INTEGER NOT NULL,
    "id_tipo_equipo" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_componente_tipo_equipo_pkey" PRIMARY KEY ("id_tipo_componente","id_tipo_equipo")
);

-- CreateTable
CREATE TABLE "ordenes_eliminadas" (
    "id_orden_servicio" INTEGER NOT NULL,
    "numero_orden" VARCHAR(50) NOT NULL,
    "id_tecnico_asignado" INTEGER,
    "fecha_eliminacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordenes_eliminadas_pkey" PRIMARY KEY ("id_orden_servicio","fecha_eliminacion")
);

-- CreateIndex
CREATE INDEX "idx_actividades_orden_secuencia" ON "actividades_ejecutadas"("id_orden_servicio", "orden_secuencia");

-- CreateIndex
CREATE INDEX "idx_actividades_tecnico" ON "actividades_ejecutadas"("ejecutada_por");

-- CreateIndex
CREATE INDEX "idx_alerta_componente" ON "alertas_stock"("id_componente", "estado");

-- CreateIndex
CREATE INDEX "idx_alerta_lote" ON "alertas_stock"("id_lote", "estado");

-- CreateIndex
CREATE INDEX "idx_aprob_aprobador" ON "aprobaciones_cotizacion"("aprobada_por", "estado_aprobacion");

-- CreateIndex
CREATE INDEX "idx_archivos_equipo_tipo" ON "archivos_equipo"("id_equipo", "tipo_archivo");

-- CreateIndex
CREATE INDEX "idx_bitacoras_cliente" ON "bitacoras"("id_cliente");

-- CreateIndex
CREATE INDEX "idx_bitacoras_cliente_periodo" ON "bitacoras"("id_cliente", "anio" DESC, "mes" DESC);

-- CreateIndex
CREATE INDEX "idx_bitacoras_informes_bitacora" ON "bitacoras_informes"("id_bitacora");

-- CreateIndex
CREATE INDEX "idx_bitacoras_informes_informe" ON "bitacoras_informes"("id_informe");

-- CreateIndex
CREATE INDEX "idx_actividades_tipo" ON "catalogo_actividades"("tipo_actividad");

-- CreateIndex
CREATE INDEX "idx_actividades_tipo_servicio" ON "catalogo_actividades"("id_tipo_servicio");

-- CreateIndex
CREATE INDEX "idx_actividades_tipo_equipo" ON "catalogo_actividades"("id_tipo_equipo");

-- CreateIndex
CREATE INDEX "idx_actividades_plantilla_origen" ON "catalogo_actividades"("id_plantilla_origen");

-- CreateIndex
CREATE INDEX "idx_componente_referencia" ON "catalogo_componentes"("referencia_fabricante");

-- CreateIndex
CREATE INDEX "idx_componente_tipo" ON "catalogo_componentes"("id_tipo_componente");

-- CreateIndex
CREATE INDEX "idx_componente_destino" ON "catalogo_componentes"("destino_articulo");

-- CreateIndex
CREATE INDEX "idx_componente_codigo_interno" ON "catalogo_componentes"("codigo_interno");

-- CreateIndex
CREATE INDEX "idx_componente_marca" ON "catalogo_componentes"("id_marca");

-- CreateIndex
CREATE INDEX "idx_componente_unidad_medida" ON "catalogo_componentes"("codigo_unidad_medida");

-- CreateIndex
CREATE INDEX "idx_componente_categoria" ON "catalogo_componentes"("id_categoria");

-- CreateIndex
CREATE INDEX "idx_servicios_categoria" ON "catalogo_servicios"("categoria");

-- CreateIndex
CREATE INDEX "idx_servicios_codigo" ON "catalogo_servicios"("codigo_servicio");

-- CreateIndex
CREATE INDEX "idx_servicios_tipo_equipo" ON "catalogo_servicios"("id_tipo_equipo");

-- CreateIndex
CREATE INDEX "idx_servicios_tipo_servicio" ON "catalogo_servicios"("id_tipo_servicio");

-- CreateIndex
CREATE INDEX "idx_sistemas_orden" ON "catalogo_sistemas"("orden_visualizacion");

-- CreateIndex
CREATE INDEX "idx_sistemas_id_modulo" ON "catalogo_sistemas"("id_modulo");

-- CreateIndex
CREATE INDEX "idx_clientes_cuenta_email" ON "clientes"("id_cuenta_email_remitente");

-- CreateIndex
CREATE INDEX "idx_componente_equipo_equipo" ON "componentes_equipo"("id_equipo");

-- CreateIndex
CREATE INDEX "idx_componente_equipo_tipo" ON "componentes_equipo"("id_tipo_componente");

-- CreateIndex
CREATE INDEX "idx_componentes_usados_fecha" ON "componentes_usados"("fecha_uso" DESC);

-- CreateIndex
CREATE INDEX "idx_componentes_usados_orden" ON "componentes_usados"("id_orden_servicio");

-- CreateIndex
CREATE INDEX "idx_componentes_usados_origen" ON "componentes_usados"("origen_componente");

-- CreateIndex
CREATE INDEX "idx_componentes_usados_tecnico" ON "componentes_usados"("usado_por");

-- CreateIndex
CREATE INDEX "idx_componentes_usados_tipo" ON "componentes_usados"("id_tipo_componente");

-- CreateIndex
CREATE INDEX "idx_contratos_asesor" ON "contratos_mantenimiento"("id_asesor_responsable");

-- CreateIndex
CREATE INDEX "idx_contratos_cliente" ON "contratos_mantenimiento"("id_cliente");

-- CreateIndex
CREATE INDEX "idx_cot_asesor" ON "cotizaciones"("elaborada_por", "id_estado");

-- CreateIndex
CREATE INDEX "idx_cot_cliente" ON "cotizaciones"("id_cliente", "fecha_cotizacion" DESC);

-- CreateIndex
CREATE INDEX "idx_cot_estado" ON "cotizaciones"("id_estado", "fecha_cotizacion" DESC);

-- CreateIndex
CREATE INDEX "idx_cot_pendientes" ON "cotizaciones"("id_estado", "fecha_vencimiento");

-- CreateIndex
CREATE INDEX "idx_cronogramas_contrato" ON "cronogramas_servicio"("id_contrato");

-- CreateIndex
CREATE INDEX "idx_cronogramas_equipo" ON "cronogramas_servicio"("id_equipo");

-- CreateIndex
CREATE INDEX "idx_cronogramas_equipo_contrato" ON "cronogramas_servicio"("id_equipo_contrato");

-- CreateIndex
CREATE INDEX "idx_cronogramas_estado" ON "cronogramas_servicio"("estado_cronograma");

-- CreateIndex
CREATE INDEX "idx_cronogramas_fecha_prevista" ON "cronogramas_servicio"("fecha_prevista" DESC, "estado_cronograma");

-- CreateIndex
CREATE INDEX "idx_detalle_orden" ON "detalle_servicios_orden"("id_orden_servicio");

-- CreateIndex
CREATE INDEX "idx_detalle_servicio" ON "detalle_servicios_orden"("id_servicio");

-- CreateIndex
CREATE INDEX "idx_detalle_tecnico" ON "detalle_servicios_orden"("id_tecnico_ejecutor");

-- CreateIndex
CREATE INDEX "idx_devolucion_estado" ON "devoluciones_proveedor"("estado_devolucion");

-- CreateIndex
CREATE INDEX "idx_devolucion_orden_compra" ON "devoluciones_proveedor"("id_orden_compra");

-- CreateIndex
CREATE INDEX "idx_documentos_hash_sha256" ON "documentos_generados" USING HASH ("hash_sha256");

-- CreateIndex
CREATE INDEX "idx_equipos_cliente_sede" ON "equipos"("id_cliente", "id_sede");

-- CreateIndex
CREATE INDEX "idx_equipos_codigo" ON "equipos"("codigo_equipo");

-- CreateIndex
CREATE INDEX "idx_equipos_tipo" ON "equipos"("id_tipo_equipo");

-- CreateIndex
CREATE INDEX "idx_equipos_cliente" ON "equipos"("id_cliente");

-- CreateIndex
CREATE INDEX "idx_equipos_config_parametros" ON "equipos" USING GIN ("config_parametros");

-- CreateIndex
CREATE INDEX "idx_bomba_marca" ON "equipos_bomba"("marca_bomba");

-- CreateIndex
CREATE INDEX "idx_bomba_tipo_aplicacion" ON "equipos_bomba"("tipo_bomba", "aplicacion_bomba");

-- CreateIndex
CREATE INDEX "idx_equipos_contrato_contrato" ON "equipos_contrato"("id_contrato");

-- CreateIndex
CREATE INDEX "idx_equipos_contrato_equipo" ON "equipos_contrato"("id_equipo");

-- CreateIndex
CREATE INDEX "idx_generador_marca" ON "equipos_generador"("marca_generador");

-- CreateIndex
CREATE INDEX "idx_motor_marca" ON "equipos_motor"("marca_motor");

-- CreateIndex
CREATE INDEX "idx_estados_cot_orden" ON "estados_cotizacion"("orden_visualizacion");

-- CreateIndex
CREATE INDEX "idx_estados_orden_vis" ON "estados_orden"("orden_visualizacion");

-- CreateIndex
CREATE INDEX "idx_evidencias_fecha" ON "evidencias_fotograficas"("fecha_captura" DESC);

-- CreateIndex
CREATE INDEX "idx_evidencias_hash" ON "evidencias_fotograficas" USING HASH ("hash_sha256");

-- CreateIndex
CREATE INDEX "idx_evidencias_orden_vis" ON "evidencias_fotograficas"("id_orden_servicio", "orden_visualizacion");

-- CreateIndex
CREATE INDEX "idx_evidencias_tecnico" ON "evidencias_fotograficas"("capturada_por");

-- CreateIndex
CREATE INDEX "idx_evidencias_tipo" ON "evidencias_fotograficas"("id_orden_servicio", "tipo_evidencia");

-- CreateIndex
CREATE INDEX "idx_lotes_galeria_orden" ON "lotes_galeria"("id_orden_servicio");

-- CreateIndex
CREATE INDEX "idx_firmas_empleado_asignado" ON "firmas_administrativas"("id_empleado_asignado");

-- CreateIndex
CREATE INDEX "idx_firma_hash" ON "firmas_digitales"("hash_firma");

-- CreateIndex
CREATE INDEX "idx_gastos_fecha" ON "gastos_orden"("fecha_gasto" DESC);

-- CreateIndex
CREATE INDEX "idx_gastos_orden" ON "gastos_orden"("id_orden_servicio");

-- CreateIndex
CREATE INDEX "idx_gastos_orden_tipo" ON "gastos_orden"("id_orden_servicio", "tipo_gasto");

-- CreateIndex
CREATE INDEX "idx_gastos_tecnico" ON "gastos_orden"("generado_por");

-- CreateIndex
CREATE INDEX "idx_gastos_tipo" ON "gastos_orden"("tipo_gasto");

-- CreateIndex
CREATE INDEX "idx_historial_contrato" ON "historial_contrato"("id_contrato", "fecha_cambio" DESC);

-- CreateIndex
CREATE INDEX "idx_envios_destinatario" ON "historial_envios"("destinatario_email");

-- CreateIndex
CREATE INDEX "idx_envios_fecha" ON "historial_envios"("fecha_envio" DESC);

-- CreateIndex
CREATE INDEX "idx_envios_usuario" ON "historial_envios"("enviado_por", "fecha_envio" DESC);

-- CreateIndex
CREATE INDEX "idx_historial_equipo_fecha" ON "historial_estados_equipo"("id_equipo", "fecha_cambio" DESC);

-- CreateIndex
CREATE INDEX "idx_historial_estado_nuevo" ON "historial_estados_orden"("id_estado_nuevo", "fecha_cambio" DESC);

-- CreateIndex
CREATE INDEX "idx_historial_fecha" ON "historial_estados_orden"("fecha_cambio" DESC);

-- CreateIndex
CREATE INDEX "idx_historial_orden_fecha" ON "historial_estados_orden"("id_orden_servicio", "fecha_cambio" DESC);

-- CreateIndex
CREATE INDEX "idx_historial_usuario" ON "historial_estados_orden"("realizado_por", "fecha_cambio" DESC);

-- CreateIndex
CREATE INDEX "idx_informes_estado" ON "informes"("estado_informe");

-- CreateIndex
CREATE INDEX "idx_informes_fecha_generacion" ON "informes"("fecha_generacion" DESC);

-- CreateIndex
CREATE INDEX "idx_informes_orden_servicio" ON "informes"("id_orden_servicio");

-- CreateIndex
CREATE INDEX "idx_items_comp_cotizacion" ON "items_cotizacion_componentes"("id_cotizacion", "orden_item");

-- CreateIndex
CREATE INDEX "idx_items_comp_tipo" ON "items_cotizacion_componentes"("id_tipo_componente");

-- CreateIndex
CREATE INDEX "idx_items_serv_cotizacion" ON "items_cotizacion_servicios"("id_cotizacion", "orden_item");

-- CreateIndex
CREATE INDEX "idx_items_serv_precios" ON "items_cotizacion_servicios"("id_servicio", "precio_unitario");

-- CreateIndex
CREATE INDEX "idx_items_serv_servicio" ON "items_cotizacion_servicios"("id_servicio");

-- CreateIndex
CREATE INDEX "idx_items_prop_propuesta" ON "items_propuesta"("id_propuesta", "orden_item");

-- CreateIndex
CREATE INDEX "idx_items_prop_tipo" ON "items_propuesta"("tipo_item");

-- CreateIndex
CREATE INDEX "idx_lecturas_equipo_fecha" ON "lecturas_horometro"("id_equipo", "fecha_lectura" DESC);

-- CreateIndex
CREATE INDEX "idx_lote_componente" ON "lotes_componentes"("id_componente", "estado_lote");

-- CreateIndex
CREATE INDEX "idx_mediciones_fecha" ON "mediciones_servicio"("fecha_medicion" DESC);

-- CreateIndex
CREATE INDEX "idx_mediciones_orden" ON "mediciones_servicio"("id_orden_servicio");

-- CreateIndex
CREATE INDEX "idx_mediciones_parametro" ON "mediciones_servicio"("id_parametro_medicion");

-- CreateIndex
CREATE INDEX "idx_mediciones_tecnico" ON "mediciones_servicio"("medido_por");

-- CreateIndex
CREATE INDEX "idx_motivos_rechazo_categoria" ON "motivos_rechazo"("categoria");

-- CreateIndex
CREATE INDEX "idx_mov_componente_fecha" ON "movimientos_inventario"("id_componente", "fecha_movimiento" DESC);

-- CreateIndex
CREATE INDEX "idx_mov_tipo_origen" ON "movimientos_inventario"("tipo_movimiento", "origen_movimiento");

-- CreateIndex
CREATE INDEX "idx_notificaciones_tipo" ON "notificaciones"("tipo_notificacion");

-- CreateIndex
CREATE INDEX "idx_notificaciones_usuario_fecha" ON "notificaciones"("id_usuario", "fecha_creacion" DESC);

-- CreateIndex
CREATE INDEX "idx_notificaciones_usuario_leida" ON "notificaciones"("id_usuario", "leida");

-- CreateIndex
CREATE INDEX "idx_plan_orden_secuencia" ON "ordenes_actividades_plan"("id_orden_servicio", "orden_secuencia");

-- CreateIndex
CREATE INDEX "idx_orden_compra_estado" ON "ordenes_compra"("estado", "fecha_solicitud" DESC);

-- CreateIndex
CREATE INDEX "idx_orden_compra_proveedor" ON "ordenes_compra"("id_proveedor", "estado");

-- CreateIndex
CREATE INDEX "idx_orden_det_componente" ON "ordenes_compra_detalle"("id_componente");

-- CreateIndex
CREATE INDEX "idx_orden_det_orden_compra" ON "ordenes_compra_detalle"("id_orden_compra");

-- CreateIndex
CREATE INDEX "idx_os_cliente_fecha" ON "ordenes_servicio"("id_cliente", "fecha_programada" DESC);

-- CreateIndex
CREATE INDEX "idx_os_equipo_fecha" ON "ordenes_servicio"("id_equipo", "fecha_programada" DESC);

-- CreateIndex
CREATE INDEX "idx_os_estados_activos" ON "ordenes_servicio"("id_estado_actual", "fecha_programada");

-- CreateIndex
CREATE INDEX "idx_os_tecnico_estado" ON "ordenes_servicio"("id_tecnico_asignado", "id_estado_actual");

-- CreateIndex
CREATE INDEX "idx_ordenes_cliente_estado" ON "ordenes_servicio"("id_cliente", "id_estado_actual");

-- CreateIndex
CREATE INDEX "idx_ordenes_estado_fecha" ON "ordenes_servicio"("id_estado_actual", "fecha_programada" DESC);

-- CreateIndex
CREATE INDEX "idx_ordenes_fecha_creacion" ON "ordenes_servicio"("fecha_creacion" DESC);

-- CreateIndex
CREATE INDEX "idx_ordenes_firma_tecnico" ON "ordenes_servicio"("id_firma_tecnico");

-- CreateIndex
CREATE INDEX "idx_ordenes_prioridad_estado" ON "ordenes_servicio"("prioridad", "id_estado_actual");

-- CreateIndex
CREATE INDEX "idx_os_orden_padre" ON "ordenes_servicio"("id_orden_padre");

-- CreateIndex
CREATE INDEX "idx_historial_emails_orden_fecha" ON "historial_emails_enviados"("id_orden_servicio", "fecha_envio" DESC);

-- CreateIndex
CREATE INDEX "idx_parametros_categoria" ON "parametros_medicion"("categoria");

-- CreateIndex
CREATE INDEX "idx_parametros_equipo" ON "parametros_medicion"("id_tipo_equipo");

-- CreateIndex
CREATE INDEX "idx_permisos_codigo" ON "permisos"("codigo_permiso");

-- CreateIndex
CREATE INDEX "idx_personas_identificacion" ON "personas"("numero_identificacion");

-- CreateIndex
CREATE INDEX "idx_prop_cliente" ON "propuestas_correctivo"("id_cliente", "fecha_propuesta" DESC);

-- CreateIndex
CREATE INDEX "idx_prop_estado" ON "propuestas_correctivo"("id_estado", "fecha_propuesta" DESC);

-- CreateIndex
CREATE INDEX "idx_prop_os_origen" ON "propuestas_correctivo"("id_orden_servicio");

-- CreateIndex
CREATE INDEX "idx_prop_pendientes" ON "propuestas_correctivo"("id_estado");

-- CreateIndex
CREATE INDEX "idx_prop_tecnico" ON "propuestas_correctivo"("propuesta_por");

-- CreateIndex
CREATE INDEX "idx_recepcion_detalle_orden" ON "recepciones_compra"("id_detalle_orden");

-- CreateIndex
CREATE INDEX "idx_recepcion_orden_compra" ON "recepciones_compra"("id_orden_compra");

-- CreateIndex
CREATE INDEX "idx_remision_estado" ON "remisiones"("estado_remision", "fecha_remision" DESC);

-- CreateIndex
CREATE INDEX "idx_remision_tipo_destino" ON "remisiones"("tipo_destino", "id_destino");

-- CreateIndex
CREATE INDEX "idx_remision_det_remision" ON "remisiones_detalle"("id_remision");

-- CreateIndex
CREATE INDEX "idx_roles_codigo" ON "roles"("codigo_rol");

-- CreateIndex
CREATE INDEX "idx_roles_permisos_permiso" ON "roles_permisos"("id_permiso", "id_rol");

-- CreateIndex
CREATE INDEX "idx_roles_permisos_rol" ON "roles_permisos"("id_rol", "id_permiso");

-- CreateIndex
CREATE INDEX "idx_sequence_type_year" ON "sequence_counter"("type", "year");

-- CreateIndex
CREATE INDEX "idx_tipo_componente_categoria" ON "tipos_componente"("categoria");

-- CreateIndex
CREATE INDEX "idx_tipo_componente_codigo" ON "tipos_componente"("codigo_tipo");

-- CreateIndex
CREATE INDEX "idx_tipos_equipo_codigo" ON "tipos_equipo"("codigo_tipo");

-- CreateIndex
CREATE INDEX "idx_tipos_servicio_categoria" ON "tipos_servicio"("categoria");

-- CreateIndex
CREATE INDEX "idx_tipos_servicio_equipo" ON "tipos_servicio"("id_tipo_equipo");

-- CreateIndex
CREATE INDEX "idx_ubicacion_zona" ON "ubicaciones_bodega"("zona", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_id_persona_key" ON "usuarios"("id_persona");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "idx_usuarios_roles_rol" ON "usuarios_roles"("id_rol", "id_usuario");

-- CreateIndex
CREATE INDEX "idx_usuarios_roles_usuario" ON "usuarios_roles"("id_usuario", "id_rol");

-- CreateIndex
CREATE INDEX "idx_versiones_cotizacion" ON "versiones_cotizacion"("id_cotizacion", "numero_version" DESC);

-- CreateIndex
CREATE INDEX "idx_versiones_fecha" ON "versiones_cotizacion"("fecha_version" DESC);

-- CreateIndex
CREATE INDEX "idx_oe_equipo" ON "ordenes_equipos"("id_equipo");

-- CreateIndex
CREATE INDEX "idx_oe_orden" ON "ordenes_equipos"("id_orden_servicio");

-- CreateIndex
CREATE INDEX "idx_oe_orden_secuencia" ON "ordenes_equipos"("id_orden_servicio", "orden_secuencia");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_email_email_key" ON "cuentas_email"("email");

-- CreateIndex
CREATE INDEX "idx_cuentas_email_activa" ON "cuentas_email"("activa");

-- CreateIndex
CREATE INDEX "idx_cuentas_email_principal" ON "cuentas_email"("es_cuenta_principal");

-- CreateIndex
CREATE INDEX "idx_catalogo_pendientes_categoria" ON "catalogo_pendientes"("categoria");

-- CreateIndex
CREATE INDEX "idx_catalogo_pendientes_activo" ON "catalogo_pendientes"("activo");

-- CreateIndex
CREATE INDEX "idx_catalogo_pendientes_tipo_equipo" ON "catalogo_pendientes"("id_tipo_equipo");

-- CreateIndex
CREATE INDEX "idx_op_orden" ON "ordenes_pendientes"("id_orden_servicio");

-- CreateIndex
CREATE INDEX "idx_op_orden_resolucion" ON "ordenes_pendientes"("id_orden_resolucion");

-- CreateIndex
CREATE INDEX "idx_op_alcance" ON "ordenes_pendientes"("alcance");

-- CreateIndex
CREATE INDEX "idx_op_cliente_estado" ON "ordenes_pendientes"("id_cliente", "estado");

-- CreateIndex
CREATE INDEX "idx_op_equipo_estado" ON "ordenes_pendientes"("id_equipo", "estado");

-- CreateIndex
CREATE INDEX "idx_op_orden_equipo" ON "ordenes_pendientes"("id_orden_equipo");

-- CreateIndex
CREATE INDEX "idx_op_fecha_creacion" ON "ordenes_pendientes"("fecha_creacion" DESC);

-- CreateIndex
CREATE INDEX "idx_articulos_proveedores_ref" ON "articulos_proveedores"("referencia_proveedor");

-- CreateIndex
CREATE INDEX "idx_articulos_proveedores_prov" ON "articulos_proveedores"("id_proveedor");

-- CreateIndex
CREATE INDEX "idx_articulos_proveedores_pref" ON "articulos_proveedores"("id_componente", "es_proveedor_preferido");

-- CreateIndex
CREATE INDEX "idx_articulos_proveedores_marca" ON "articulos_proveedores"("id_marca_ofrecida");

-- CreateIndex
CREATE INDEX "idx_historial_costos_comp_fecha" ON "historial_costos_compra"("id_componente", "fecha_registro" DESC);

-- CreateIndex
CREATE INDEX "idx_historial_costos_prov" ON "historial_costos_compra"("id_proveedor");

-- CreateIndex
CREATE INDEX "idx_historial_costos_fecha" ON "historial_costos_compra"("fecha_registro");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_nombre_key" ON "marcas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_slug_key" ON "marcas"("slug");

-- CreateIndex
CREATE INDEX "idx_marcas_nombre" ON "marcas"("nombre");

-- CreateIndex
CREATE INDEX "idx_marcas_slug" ON "marcas"("slug");

-- CreateIndex
CREATE INDEX "idx_unidades_medida_tipo" ON "unidades_medida"("tipo_magnitud");

-- CreateIndex
CREATE INDEX "idx_unidades_medida_magnitud" ON "unidades_medida"("id_magnitud");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_componente_codigo_categoria_key" ON "categorias_componente"("codigo_categoria");

-- CreateIndex
CREATE INDEX "idx_categorias_padre" ON "categorias_componente"("id_padre");

-- CreateIndex
CREATE INDEX "idx_categorias_ruta" ON "categorias_componente"("ruta_jerarquica");

-- CreateIndex
CREATE INDEX "idx_categorias_nivel" ON "categorias_componente"("nivel");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_magnitudes_codigo_magnitud_key" ON "catalogo_magnitudes"("codigo_magnitud");

-- CreateIndex
CREATE UNIQUE INDEX "atributos_tecnicos_codigo_atributo_key" ON "atributos_tecnicos"("codigo_atributo");

-- CreateIndex
CREATE INDEX "idx_atributos_rol_semantico" ON "atributos_tecnicos"("rol_semantico");

-- CreateIndex
CREATE INDEX "idx_atributos_magnitud" ON "atributos_tecnicos"("id_magnitud");

-- CreateIndex
CREATE UNIQUE INDEX "modulos_tecnicos_codigo_modulo_key" ON "modulos_tecnicos"("codigo_modulo");

-- CreateIndex
CREATE INDEX "idx_modulo_atributos_modulo" ON "modulo_atributos"("id_modulo");

-- CreateIndex
CREATE INDEX "idx_modulo_atributos_atributo" ON "modulo_atributos"("id_atributo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_modulo_atributos_modulo_atributo" ON "modulo_atributos"("id_modulo", "id_atributo");

-- CreateIndex
CREATE INDEX "idx_tipo_equipo_modulos_tipo" ON "tipo_equipo_modulos"("id_tipo_equipo");

-- CreateIndex
CREATE INDEX "idx_tipo_equipo_modulos_modulo" ON "tipo_equipo_modulos"("id_modulo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tipo_equipo_modulos_tipo_modulo" ON "tipo_equipo_modulos"("id_tipo_equipo", "id_modulo");

-- CreateIndex
CREATE INDEX "idx_tipo_equipo_planes_tipo" ON "tipo_equipo_planes"("id_tipo_equipo");

-- CreateIndex
CREATE INDEX "idx_tipo_equipo_planes_servicio" ON "tipo_equipo_planes"("id_tipo_servicio");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tipo_equipo_planes_tipo_servicio" ON "tipo_equipo_planes"("id_tipo_equipo", "id_tipo_servicio");

-- CreateIndex
CREATE UNIQUE INDEX "modelos_equipo_codigo_modelo_key" ON "modelos_equipo"("codigo_modelo");

-- CreateIndex
CREATE INDEX "idx_modelos_equipo_tipo" ON "modelos_equipo"("id_tipo_equipo");

-- CreateIndex
CREATE INDEX "idx_modelos_equipo_marca_modelo" ON "modelos_equipo"("marca", "modelo");

-- CreateIndex
CREATE INDEX "idx_modelos_equipo_bom_modelo" ON "modelos_equipo_bom"("id_modelo_equipo");

-- CreateIndex
CREATE INDEX "idx_modelos_equipo_bom_componente" ON "modelos_equipo_bom"("id_componente");

-- CreateIndex
CREATE UNIQUE INDEX "uq_modelos_equipo_bom_modelo_componente" ON "modelos_equipo_bom"("id_modelo_equipo", "id_componente");

-- CreateIndex
CREATE INDEX "idx_equipos_attr_filtro_num" ON "equipos_atributos_filtro"("codigo_atributo", "valor_num_base");

-- CreateIndex
CREATE INDEX "idx_equipos_attr_filtro_texto" ON "equipos_atributos_filtro"("codigo_atributo", "valor_texto");

-- CreateIndex
CREATE INDEX "idx_equipos_attr_filtro_equipo" ON "equipos_atributos_filtro"("id_equipo");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_activo_codigo_key" ON "categorias_activo"("codigo");

-- CreateIndex
CREATE INDEX "idx_categorias_activo_activo_orden" ON "categorias_activo"("activo", "orden");

-- CreateIndex
CREATE INDEX "idx_tc_te_tipo_equipo" ON "tipos_componente_tipo_equipo"("id_tipo_equipo");

-- CreateIndex
CREATE INDEX "idx_ordenes_eliminadas_tecnico_fecha" ON "ordenes_eliminadas"("id_tecnico_asignado", "fecha_eliminacion");

-- CreateIndex
CREATE INDEX "idx_ordenes_eliminadas_fecha" ON "ordenes_eliminadas"("fecha_eliminacion");

-- AddForeignKey
ALTER TABLE "actividades_ejecutadas" ADD CONSTRAINT "actividades_ejecutadas_ejecutada_por_fkey" FOREIGN KEY ("ejecutada_por") REFERENCES "empleados"("id_empleado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades_ejecutadas" ADD CONSTRAINT "actividades_ejecutadas_id_actividad_catalogo_fkey" FOREIGN KEY ("id_actividad_catalogo") REFERENCES "catalogo_actividades"("id_actividad_catalogo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades_ejecutadas" ADD CONSTRAINT "actividades_ejecutadas_id_orden_equipo_fkey" FOREIGN KEY ("id_orden_equipo") REFERENCES "ordenes_equipos"("id_orden_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades_ejecutadas" ADD CONSTRAINT "actividades_ejecutadas_id_orden_servicio_fkey" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_stock" ADD CONSTRAINT "fk_alerta_componente" FOREIGN KEY ("id_componente") REFERENCES "catalogo_componentes"("id_componente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_stock" ADD CONSTRAINT "fk_alerta_lote" FOREIGN KEY ("id_lote") REFERENCES "lotes_componentes"("id_lote") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprobaciones_cotizacion" ADD CONSTRAINT "aprobaciones_cotizacion_id_cotizacion_fkey" FOREIGN KEY ("id_cotizacion") REFERENCES "cotizaciones"("id_cotizacion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprobaciones_cotizacion" ADD CONSTRAINT "aprobaciones_cotizacion_id_propuesta_fkey" FOREIGN KEY ("id_propuesta") REFERENCES "propuestas_correctivo"("id_propuesta") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_equipo" ADD CONSTRAINT "fk_archivos_equipo" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacoras" ADD CONSTRAINT "fk_bitacora_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacoras" ADD CONSTRAINT "fk_bitacora_documento_pdf" FOREIGN KEY ("id_documento_pdf") REFERENCES "documentos_generados"("id_documento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacoras_informes" ADD CONSTRAINT "fk_bitacora_informe_bitacora" FOREIGN KEY ("id_bitacora") REFERENCES "bitacoras"("id_bitacora") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacoras_informes" ADD CONSTRAINT "fk_bitacora_informe_informe" FOREIGN KEY ("id_informe") REFERENCES "informes"("id_informe") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_actividades" ADD CONSTRAINT "catalogo_actividades_id_parametro_medicion_fkey" FOREIGN KEY ("id_parametro_medicion") REFERENCES "parametros_medicion"("id_parametro_medicion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_actividades" ADD CONSTRAINT "catalogo_actividades_id_sistema_fkey" FOREIGN KEY ("id_sistema") REFERENCES "catalogo_sistemas"("id_sistema") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_actividades" ADD CONSTRAINT "catalogo_actividades_id_tipo_componente_fkey" FOREIGN KEY ("id_tipo_componente") REFERENCES "tipos_componente"("id_tipo_componente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_actividades" ADD CONSTRAINT "catalogo_actividades_id_tipo_servicio_fkey" FOREIGN KEY ("id_tipo_servicio") REFERENCES "tipos_servicio"("id_tipo_servicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_actividades" ADD CONSTRAINT "fk_actividades_tipo_equipo" FOREIGN KEY ("id_tipo_equipo") REFERENCES "tipos_equipo"("id_tipo_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_actividades" ADD CONSTRAINT "fk_actividades_plantilla_origen" FOREIGN KEY ("id_plantilla_origen") REFERENCES "catalogo_actividades"("id_actividad_catalogo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_componentes" ADD CONSTRAINT "fk_componente_proveedor" FOREIGN KEY ("id_proveedor_principal") REFERENCES "proveedores"("id_proveedor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_componentes" ADD CONSTRAINT "fk_componente_reemplazado_por" FOREIGN KEY ("reemplazado_por") REFERENCES "catalogo_componentes"("id_componente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_componentes" ADD CONSTRAINT "fk_componente_tipo" FOREIGN KEY ("id_tipo_componente") REFERENCES "tipos_componente"("id_tipo_componente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_componentes" ADD CONSTRAINT "fk_componente_marca" FOREIGN KEY ("id_marca") REFERENCES "marcas"("id_marca") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_componentes" ADD CONSTRAINT "fk_componente_unidad_medida" FOREIGN KEY ("codigo_unidad_medida") REFERENCES "unidades_medida"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_componentes" ADD CONSTRAINT "fk_componente_categoria" FOREIGN KEY ("id_categoria") REFERENCES "categorias_componente"("id_categoria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_servicios" ADD CONSTRAINT "catalogo_servicios_id_tipo_equipo_fkey" FOREIGN KEY ("id_tipo_equipo") REFERENCES "tipos_equipo"("id_tipo_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_servicios" ADD CONSTRAINT "catalogo_servicios_id_tipo_servicio_fkey" FOREIGN KEY ("id_tipo_servicio") REFERENCES "tipos_servicio"("id_tipo_servicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_sistemas" ADD CONSTRAINT "fk_sistemas_modulo" FOREIGN KEY ("id_modulo") REFERENCES "modulos_tecnicos"("id_modulo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificaciones_tecnicas" ADD CONSTRAINT "fk_certificaciones_anterior" FOREIGN KEY ("id_certificacion_anterior") REFERENCES "certificaciones_tecnicas"("id_certificacion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificaciones_tecnicas" ADD CONSTRAINT "fk_certificaciones_empleado" FOREIGN KEY ("id_empleado") REFERENCES "empleados"("id_empleado") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_id_cuenta_email_remitente_fkey" FOREIGN KEY ("id_cuenta_email_remitente") REFERENCES "cuentas_email"("id_cuenta_email") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "fk_clientes_cliente_principal" FOREIGN KEY ("id_cliente_principal") REFERENCES "clientes"("id_cliente") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "fk_clientes_persona" FOREIGN KEY ("id_persona") REFERENCES "personas"("id_persona") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_equipo" ADD CONSTRAINT "fk_componente_equipo_catalogo" FOREIGN KEY ("id_componente") REFERENCES "catalogo_componentes"("id_componente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_equipo" ADD CONSTRAINT "fk_componente_equipo_equipo" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_equipo" ADD CONSTRAINT "fk_componente_equipo_tipo" FOREIGN KEY ("id_tipo_componente") REFERENCES "tipos_componente"("id_tipo_componente") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_usados" ADD CONSTRAINT "componentes_usados_id_actividad_ejecutada_fkey" FOREIGN KEY ("id_actividad_ejecutada") REFERENCES "actividades_ejecutadas"("id_actividad_ejecutada") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_usados" ADD CONSTRAINT "componentes_usados_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "catalogo_componentes"("id_componente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_usados" ADD CONSTRAINT "componentes_usados_id_orden_servicio_fkey" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_usados" ADD CONSTRAINT "componentes_usados_id_tipo_componente_fkey" FOREIGN KEY ("id_tipo_componente") REFERENCES "tipos_componente"("id_tipo_componente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_usados" ADD CONSTRAINT "componentes_usados_usado_por_fkey" FOREIGN KEY ("usado_por") REFERENCES "empleados"("id_empleado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_usados" ADD CONSTRAINT "componentes_usados_id_ubicacion_fkey" FOREIGN KEY ("id_ubicacion") REFERENCES "ubicaciones_bodega"("id_ubicacion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_usados" ADD CONSTRAINT "componentes_usados_id_lote_fkey" FOREIGN KEY ("id_lote") REFERENCES "lotes_componentes"("id_lote") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componentes_usados" ADD CONSTRAINT "componentes_usados_id_movimiento_inventario_fkey" FOREIGN KEY ("id_movimiento_inventario") REFERENCES "movimientos_inventario"("id_movimiento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos_adicionales" ADD CONSTRAINT "fk_contacto_persona" FOREIGN KEY ("id_persona") REFERENCES "personas"("id_persona") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_mantenimiento" ADD CONSTRAINT "fk_contrato_asesor" FOREIGN KEY ("id_asesor_responsable") REFERENCES "empleados"("id_empleado") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_mantenimiento" ADD CONSTRAINT "fk_contrato_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_elaborada_por_fkey" FOREIGN KEY ("elaborada_por") REFERENCES "empleados"("id_empleado") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_id_cotizacion_padre_fkey" FOREIGN KEY ("id_cotizacion_padre") REFERENCES "cotizaciones"("id_cotizacion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_id_estado_fkey" FOREIGN KEY ("id_estado") REFERENCES "estados_cotizacion"("id_estado") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_id_motivo_rechazo_fkey" FOREIGN KEY ("id_motivo_rechazo") REFERENCES "motivos_rechazo"("id_motivo_rechazo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_id_orden_servicio_generada_fkey" FOREIGN KEY ("id_orden_servicio_generada") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sedes_cliente"("id_sede") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronogramas_servicio" ADD CONSTRAINT "fk_cronograma_contrato" FOREIGN KEY ("id_contrato") REFERENCES "contratos_mantenimiento"("id_contrato") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronogramas_servicio" ADD CONSTRAINT "fk_cronograma_equipo" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronogramas_servicio" ADD CONSTRAINT "fk_cronograma_equipo_contrato" FOREIGN KEY ("id_equipo_contrato") REFERENCES "equipos_contrato"("id_equipo_contrato") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronogramas_servicio" ADD CONSTRAINT "fk_cronograma_orden_servicio" FOREIGN KEY ("id_orden_servicio_generada") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronogramas_servicio" ADD CONSTRAINT "fk_cronograma_tipo_servicio" FOREIGN KEY ("tipo_servicio_programado") REFERENCES "tipos_servicio"("id_tipo_servicio") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_servicios_orden" ADD CONSTRAINT "detalle_servicios_orden_id_orden_servicio_fkey" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_servicios_orden" ADD CONSTRAINT "detalle_servicios_orden_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "catalogo_servicios"("id_servicio") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_servicios_orden" ADD CONSTRAINT "detalle_servicios_orden_id_tecnico_ejecutor_fkey" FOREIGN KEY ("id_tecnico_ejecutor") REFERENCES "empleados"("id_empleado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones_proveedor" ADD CONSTRAINT "fk_devolucion_lote" FOREIGN KEY ("id_lote") REFERENCES "lotes_componentes"("id_lote") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones_proveedor" ADD CONSTRAINT "fk_devolucion_orden_compra" FOREIGN KEY ("id_orden_compra") REFERENCES "ordenes_compra"("id_orden_compra") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "fk_empleados_jefe" FOREIGN KEY ("jefe_inmediato") REFERENCES "empleados"("id_empleado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "fk_empleados_persona" FOREIGN KEY ("id_persona") REFERENCES "personas"("id_persona") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_id_plantilla_parametros_fkey" FOREIGN KEY ("id_plantilla_parametros") REFERENCES "plantillas_parametros"("id_plantilla") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "fk_equipos_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "fk_equipos_sede" FOREIGN KEY ("id_sede") REFERENCES "sedes_cliente"("id_sede") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "fk_equipos_tipo" FOREIGN KEY ("id_tipo_equipo") REFERENCES "tipos_equipo"("id_tipo_equipo") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "fk_equipos_modelo_equipo" FOREIGN KEY ("id_modelo_equipo") REFERENCES "modelos_equipo"("id_modelo_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos_bomba" ADD CONSTRAINT "fk_bomba_equipo" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos_contrato" ADD CONSTRAINT "fk_equipo_contrato_contrato" FOREIGN KEY ("id_contrato") REFERENCES "contratos_mantenimiento"("id_contrato") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos_contrato" ADD CONSTRAINT "fk_equipo_contrato_equipo" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos_contrato" ADD CONSTRAINT "fk_equipo_contrato_tipo_servicio" FOREIGN KEY ("tipo_servicio_default") REFERENCES "tipos_servicio"("id_tipo_servicio") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos_generador" ADD CONSTRAINT "fk_generador_equipo" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos_motor" ADD CONSTRAINT "fk_equipos_motor_equipo" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias_fotograficas" ADD CONSTRAINT "evidencias_fotograficas_capturada_por_fkey" FOREIGN KEY ("capturada_por") REFERENCES "empleados"("id_empleado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias_fotograficas" ADD CONSTRAINT "evidencias_fotograficas_id_actividad_ejecutada_fkey" FOREIGN KEY ("id_actividad_ejecutada") REFERENCES "actividades_ejecutadas"("id_actividad_ejecutada") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias_fotograficas" ADD CONSTRAINT "evidencias_fotograficas_id_orden_equipo_fkey" FOREIGN KEY ("id_orden_equipo") REFERENCES "ordenes_equipos"("id_orden_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias_fotograficas" ADD CONSTRAINT "evidencias_fotograficas_id_orden_servicio_fkey" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firmas_administrativas" ADD CONSTRAINT "fk_firma_empleado_asignado" FOREIGN KEY ("id_empleado_asignado") REFERENCES "empleados"("id_empleado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firmas_digitales" ADD CONSTRAINT "fk_firma_persona" FOREIGN KEY ("id_persona") REFERENCES "personas"("id_persona") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_orden" ADD CONSTRAINT "gastos_orden_generado_por_fkey" FOREIGN KEY ("generado_por") REFERENCES "empleados"("id_empleado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_orden" ADD CONSTRAINT "gastos_orden_id_orden_servicio_fkey" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_contrato" ADD CONSTRAINT "fk_historial_contrato" FOREIGN KEY ("id_contrato") REFERENCES "contratos_mantenimiento"("id_contrato") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_envios" ADD CONSTRAINT "historial_envios_id_cotizacion_fkey" FOREIGN KEY ("id_cotizacion") REFERENCES "cotizaciones"("id_cotizacion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_envios" ADD CONSTRAINT "historial_envios_id_propuesta_fkey" FOREIGN KEY ("id_propuesta") REFERENCES "propuestas_correctivo"("id_propuesta") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_equipo" ADD CONSTRAINT "fk_historial_equipo" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_orden" ADD CONSTRAINT "historial_estados_orden_id_estado_anterior_fkey" FOREIGN KEY ("id_estado_anterior") REFERENCES "estados_orden"("id_estado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_orden" ADD CONSTRAINT "historial_estados_orden_id_estado_nuevo_fkey" FOREIGN KEY ("id_estado_nuevo") REFERENCES "estados_orden"("id_estado") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_orden" ADD CONSTRAINT "historial_estados_orden_id_orden_servicio_fkey" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informes" ADD CONSTRAINT "fk_informe_documento_pdf" FOREIGN KEY ("id_documento_pdf") REFERENCES "documentos_generados"("id_documento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informes" ADD CONSTRAINT "fk_informe_orden_servicio" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informes" ADD CONSTRAINT "fk_informe_plantilla" FOREIGN KEY ("id_plantilla_informe") REFERENCES "plantillas_informe"("id_plantilla_informe") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_cotizacion_componentes" ADD CONSTRAINT "items_cotizacion_componentes_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "catalogo_componentes"("id_componente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_cotizacion_componentes" ADD CONSTRAINT "items_cotizacion_componentes_id_cotizacion_fkey" FOREIGN KEY ("id_cotizacion") REFERENCES "cotizaciones"("id_cotizacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_cotizacion_componentes" ADD CONSTRAINT "items_cotizacion_componentes_id_tipo_componente_fkey" FOREIGN KEY ("id_tipo_componente") REFERENCES "tipos_componente"("id_tipo_componente") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_cotizacion_servicios" ADD CONSTRAINT "items_cotizacion_servicios_id_cotizacion_fkey" FOREIGN KEY ("id_cotizacion") REFERENCES "cotizaciones"("id_cotizacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_cotizacion_servicios" ADD CONSTRAINT "items_cotizacion_servicios_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "catalogo_servicios"("id_servicio") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_propuesta" ADD CONSTRAINT "items_propuesta_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "catalogo_componentes"("id_componente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_propuesta" ADD CONSTRAINT "items_propuesta_id_propuesta_fkey" FOREIGN KEY ("id_propuesta") REFERENCES "propuestas_correctivo"("id_propuesta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_propuesta" ADD CONSTRAINT "items_propuesta_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "catalogo_servicios"("id_servicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_propuesta" ADD CONSTRAINT "items_propuesta_id_tipo_componente_fkey" FOREIGN KEY ("id_tipo_componente") REFERENCES "tipos_componente"("id_tipo_componente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturas_horometro" ADD CONSTRAINT "fk_lectura_equipo" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_componentes" ADD CONSTRAINT "fk_lote_componente" FOREIGN KEY ("id_componente") REFERENCES "catalogo_componentes"("id_componente") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_componentes" ADD CONSTRAINT "fk_lote_proveedor" FOREIGN KEY ("id_proveedor") REFERENCES "proveedores"("id_proveedor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediciones_servicio" ADD CONSTRAINT "mediciones_servicio_id_orden_equipo_fkey" FOREIGN KEY ("id_orden_equipo") REFERENCES "ordenes_equipos"("id_orden_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediciones_servicio" ADD CONSTRAINT "mediciones_servicio_id_orden_servicio_fkey" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediciones_servicio" ADD CONSTRAINT "mediciones_servicio_id_parametro_medicion_fkey" FOREIGN KEY ("id_parametro_medicion") REFERENCES "parametros_medicion"("id_parametro_medicion") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediciones_servicio" ADD CONSTRAINT "mediciones_servicio_medido_por_fkey" FOREIGN KEY ("medido_por") REFERENCES "empleados"("id_empleado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "fk_mov_componente" FOREIGN KEY ("id_componente") REFERENCES "catalogo_componentes"("id_componente") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "fk_mov_lote" FOREIGN KEY ("id_lote") REFERENCES "lotes_componentes"("id_lote") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "fk_mov_orden_compra" FOREIGN KEY ("id_orden_compra") REFERENCES "ordenes_compra"("id_orden_compra") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "fk_mov_orden_servicio" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "fk_mov_remision" FOREIGN KEY ("id_remision") REFERENCES "remisiones"("id_remision") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "fk_mov_ubicacion" FOREIGN KEY ("id_ubicacion") REFERENCES "ubicaciones_bodega"("id_ubicacion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_actividades_plan" ADD CONSTRAINT "fk_plan_actividad" FOREIGN KEY ("id_actividad_catalogo") REFERENCES "catalogo_actividades"("id_actividad_catalogo") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_actividades_plan" ADD CONSTRAINT "fk_plan_orden" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "fk_orden_compra_proveedor" FOREIGN KEY ("id_proveedor") REFERENCES "proveedores"("id_proveedor") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra_detalle" ADD CONSTRAINT "fk_orden_det_componente" FOREIGN KEY ("id_componente") REFERENCES "catalogo_componentes"("id_componente") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra_detalle" ADD CONSTRAINT "fk_orden_det_orden_compra" FOREIGN KEY ("id_orden_compra") REFERENCES "ordenes_compra"("id_orden_compra") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "fk_orden_firma_tecnico" FOREIGN KEY ("id_firma_tecnico") REFERENCES "firmas_digitales"("id_firma_digital") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_id_estado_actual_fkey" FOREIGN KEY ("id_estado_actual") REFERENCES "estados_orden"("id_estado") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_id_firma_cliente_fkey" FOREIGN KEY ("id_firma_cliente") REFERENCES "firmas_digitales"("id_firma_digital") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_id_sede_fkey" FOREIGN KEY ("id_sede") REFERENCES "sedes_cliente"("id_sede") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_id_supervisor_fkey" FOREIGN KEY ("id_supervisor") REFERENCES "empleados"("id_empleado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_id_tecnico_asignado_fkey" FOREIGN KEY ("id_tecnico_asignado") REFERENCES "empleados"("id_empleado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_id_tipo_servicio_fkey" FOREIGN KEY ("id_tipo_servicio") REFERENCES "tipos_servicio"("id_tipo_servicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "fk_os_orden_padre" FOREIGN KEY ("id_orden_padre") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_emails_enviados" ADD CONSTRAINT "historial_emails_enviados_id_orden_servicio_fkey" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametros_medicion" ADD CONSTRAINT "parametros_medicion_id_tipo_equipo_fkey" FOREIGN KEY ("id_tipo_equipo") REFERENCES "tipos_equipo"("id_tipo_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametros_medicion" ADD CONSTRAINT "fk_parametros_medicion_unidad_codigo" FOREIGN KEY ("unidad_codigo") REFERENCES "unidades_medida"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_informe" ADD CONSTRAINT "fk_plantilla_tipo_servicio" FOREIGN KEY ("id_tipo_servicio") REFERENCES "tipos_servicio"("id_tipo_servicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_correctivo" ADD CONSTRAINT "propuestas_correctivo_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_correctivo" ADD CONSTRAINT "propuestas_correctivo_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_correctivo" ADD CONSTRAINT "propuestas_correctivo_id_estado_fkey" FOREIGN KEY ("id_estado") REFERENCES "estados_cotizacion"("id_estado") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_correctivo" ADD CONSTRAINT "propuestas_correctivo_id_motivo_rechazo_fkey" FOREIGN KEY ("id_motivo_rechazo") REFERENCES "motivos_rechazo"("id_motivo_rechazo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_correctivo" ADD CONSTRAINT "propuestas_correctivo_id_orden_servicio_fkey" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_correctivo" ADD CONSTRAINT "propuestas_correctivo_id_orden_servicio_generada_fkey" FOREIGN KEY ("id_orden_servicio_generada") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_correctivo" ADD CONSTRAINT "propuestas_correctivo_propuesta_por_fkey" FOREIGN KEY ("propuesta_por") REFERENCES "empleados"("id_empleado") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedores" ADD CONSTRAINT "fk_proveedores_persona" FOREIGN KEY ("id_persona") REFERENCES "personas"("id_persona") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones_compra" ADD CONSTRAINT "fk_recepcion_detalle_orden" FOREIGN KEY ("id_detalle_orden") REFERENCES "ordenes_compra_detalle"("id_detalle") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones_compra" ADD CONSTRAINT "fk_recepcion_orden_compra" FOREIGN KEY ("id_orden_compra") REFERENCES "ordenes_compra"("id_orden_compra") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones_compra" ADD CONSTRAINT "fk_recepcion_ubicacion_destino" FOREIGN KEY ("id_ubicacion_destino") REFERENCES "ubicaciones_bodega"("id_ubicacion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remisiones" ADD CONSTRAINT "fk_remision_cotizacion" FOREIGN KEY ("id_cotizacion") REFERENCES "cotizaciones"("id_cotizacion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remisiones" ADD CONSTRAINT "fk_remision_orden_servicio" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remisiones_detalle" ADD CONSTRAINT "fk_remision_det_componente" FOREIGN KEY ("id_componente") REFERENCES "catalogo_componentes"("id_componente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remisiones_detalle" ADD CONSTRAINT "fk_remision_det_remision" FOREIGN KEY ("id_remision") REFERENCES "remisiones"("id_remision") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permisos" ADD CONSTRAINT "fk_roles_permisos_permiso" FOREIGN KEY ("id_permiso") REFERENCES "permisos"("id_permiso") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permisos" ADD CONSTRAINT "fk_roles_permisos_rol" FOREIGN KEY ("id_rol") REFERENCES "roles"("id_rol") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sedes_cliente" ADD CONSTRAINT "fk_sedes_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_equipo" ADD CONSTRAINT "fk_tipos_equipo_categoria_activo" FOREIGN KEY ("id_categoria_activo") REFERENCES "categorias_activo"("id_categoria_activo") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tipos_servicio" ADD CONSTRAINT "tipos_servicio_id_tipo_equipo_fkey" FOREIGN KEY ("id_tipo_equipo") REFERENCES "tipos_equipo"("id_tipo_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "fk_usuarios_persona" FOREIGN KEY ("id_persona") REFERENCES "personas"("id_persona") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "fk_usuarios_roles_rol" FOREIGN KEY ("id_rol") REFERENCES "roles"("id_rol") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "fk_usuarios_roles_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "versiones_cotizacion" ADD CONSTRAINT "versiones_cotizacion_id_cotizacion_fkey" FOREIGN KEY ("id_cotizacion") REFERENCES "cotizaciones"("id_cotizacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_equipos" ADD CONSTRAINT "ordenes_equipos_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_equipos" ADD CONSTRAINT "ordenes_equipos_id_orden_servicio_fkey" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_parametros" ADD CONSTRAINT "plantillas_parametros_id_tipo_equipo_fkey" FOREIGN KEY ("id_tipo_equipo") REFERENCES "tipos_equipo"("id_tipo_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_email" ADD CONSTRAINT "cuentas_email_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cuentas_email" ADD CONSTRAINT "cuentas_email_modificado_por_fkey" FOREIGN KEY ("modificado_por") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "catalogo_pendientes" ADD CONSTRAINT "catalogo_pendientes_id_tipo_equipo_fkey" FOREIGN KEY ("id_tipo_equipo") REFERENCES "tipos_equipo"("id_tipo_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_pendientes" ADD CONSTRAINT "ordenes_pendientes_id_pendiente_catalogo_fkey" FOREIGN KEY ("id_pendiente_catalogo") REFERENCES "catalogo_pendientes"("id_pendiente_catalogo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_pendientes" ADD CONSTRAINT "ordenes_pendientes_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_pendientes" ADD CONSTRAINT "ordenes_pendientes_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_pendientes" ADD CONSTRAINT "ordenes_pendientes_id_orden_equipo_fkey" FOREIGN KEY ("id_orden_equipo") REFERENCES "ordenes_equipos"("id_orden_equipo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_pendientes" ADD CONSTRAINT "ordenes_pendientes_id_orden_servicio_fkey" FOREIGN KEY ("id_orden_servicio") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_pendientes" ADD CONSTRAINT "fk_op_orden_resolucion" FOREIGN KEY ("id_orden_resolucion") REFERENCES "ordenes_servicio"("id_orden_servicio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_pendientes" ADD CONSTRAINT "ordenes_pendientes_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "empleados"("id_empleado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_pendientes" ADD CONSTRAINT "ordenes_pendientes_resuelto_por_fkey" FOREIGN KEY ("resuelto_por") REFERENCES "empleados"("id_empleado") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articulos_proveedores" ADD CONSTRAINT "articulos_proveedores_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "catalogo_componentes"("id_componente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articulos_proveedores" ADD CONSTRAINT "articulos_proveedores_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedores"("id_proveedor") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "articulos_proveedores" ADD CONSTRAINT "fk_articulos_proveedores_marca" FOREIGN KEY ("id_marca_ofrecida") REFERENCES "marcas"("id_marca") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_costos_compra" ADD CONSTRAINT "historial_costos_compra_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "catalogo_componentes"("id_componente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_costos_compra" ADD CONSTRAINT "historial_costos_compra_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedores"("id_proveedor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_costos_compra" ADD CONSTRAINT "historial_costos_compra_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_medida" ADD CONSTRAINT "fk_unidades_medida_magnitud" FOREIGN KEY ("id_magnitud") REFERENCES "catalogo_magnitudes"("id_magnitud") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_componente" ADD CONSTRAINT "fk_categoria_padre" FOREIGN KEY ("id_padre") REFERENCES "categorias_componente"("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atributos_tecnicos" ADD CONSTRAINT "atributos_tecnicos_id_magnitud_fkey" FOREIGN KEY ("id_magnitud") REFERENCES "catalogo_magnitudes"("id_magnitud") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atributos_tecnicos" ADD CONSTRAINT "atributos_tecnicos_unidad_defecto_codigo_fkey" FOREIGN KEY ("unidad_defecto_codigo") REFERENCES "unidades_medida"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modulo_atributos" ADD CONSTRAINT "modulo_atributos_id_modulo_fkey" FOREIGN KEY ("id_modulo") REFERENCES "modulos_tecnicos"("id_modulo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modulo_atributos" ADD CONSTRAINT "modulo_atributos_id_atributo_fkey" FOREIGN KEY ("id_atributo") REFERENCES "atributos_tecnicos"("id_atributo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipo_equipo_modulos" ADD CONSTRAINT "tipo_equipo_modulos_id_tipo_equipo_fkey" FOREIGN KEY ("id_tipo_equipo") REFERENCES "tipos_equipo"("id_tipo_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipo_equipo_modulos" ADD CONSTRAINT "tipo_equipo_modulos_id_modulo_fkey" FOREIGN KEY ("id_modulo") REFERENCES "modulos_tecnicos"("id_modulo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipo_equipo_planes" ADD CONSTRAINT "tipo_equipo_planes_id_tipo_equipo_fkey" FOREIGN KEY ("id_tipo_equipo") REFERENCES "tipos_equipo"("id_tipo_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipo_equipo_planes" ADD CONSTRAINT "tipo_equipo_planes_id_tipo_servicio_fkey" FOREIGN KEY ("id_tipo_servicio") REFERENCES "tipos_servicio"("id_tipo_servicio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelos_equipo" ADD CONSTRAINT "modelos_equipo_id_tipo_equipo_fkey" FOREIGN KEY ("id_tipo_equipo") REFERENCES "tipos_equipo"("id_tipo_equipo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelos_equipo_bom" ADD CONSTRAINT "modelos_equipo_bom_id_modelo_equipo_fkey" FOREIGN KEY ("id_modelo_equipo") REFERENCES "modelos_equipo"("id_modelo_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelos_equipo_bom" ADD CONSTRAINT "modelos_equipo_bom_id_componente_fkey" FOREIGN KEY ("id_componente") REFERENCES "catalogo_componentes"("id_componente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos_atributos_filtro" ADD CONSTRAINT "equipos_atributos_filtro_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "equipos"("id_equipo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_componente_tipo_equipo" ADD CONSTRAINT "fk_tc_te_tipo_componente" FOREIGN KEY ("id_tipo_componente") REFERENCES "tipos_componente"("id_tipo_componente") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tipos_componente_tipo_equipo" ADD CONSTRAINT "fk_tc_te_tipo_equipo" FOREIGN KEY ("id_tipo_equipo") REFERENCES "tipos_equipo"("id_tipo_equipo") ON DELETE CASCADE ON UPDATE NO ACTION;

