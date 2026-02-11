/**
 * FORMULARIO DE EQUIPO DINÁMICO - MEKANOS S.A.S
 * 
 * Formulario que cambia según el tipo de equipo seleccionado.
 * Versión: 5.3 - Strict Types & Zod Fix
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Fuel,
  Loader2,
  Paintbrush,
  Settings,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch, type Path } from 'react-hook-form';
import { z } from 'zod';
import {
  useClientesSelector,
  useSedesSelector,
  useTiposEquipoSelector
} from '../hooks/use-equipos-form-data';
import { useCrearEquipo } from '../lib/equipos.service';
import {
  CreateEquipoPayload,
  TipoEquipo
} from '../types';
import { ConfigParametros, ConfigParametrosEditor } from './ConfigParametrosEditor';

// 
// SCHEMAS DE VALIDACIÓN (Zod) - Robustos & Enterprise
// 

const optionalNumber = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  },
  z.number().optional()
);

const optionalDate = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    return val;
  },
  z.string().optional()
);

const requiredNumber = (msg: string) => z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  },
  z.number({ message: msg }).min(1, msg)
);

const datosEquipoBaseSchema = z.object({
  codigo_equipo: z.string().min(1, 'Código de inventario requerido').max(50),
  id_cliente: requiredNumber('Seleccione un cliente'),
  id_tipo_equipo: requiredNumber('Seleccione una categoría técnica'),
  id_sede: optionalNumber,
  nombre_equipo: z.string().max(200).optional().or(z.literal('')),
  numero_serie_equipo: z.string().max(100).optional().or(z.literal('')),
  ubicacion_texto: z.string().min(5, 'Ubicación física requerida (mín. 5 caracteres)').max(1000),
  estado_equipo: z.enum(['OPERATIVO', 'STANDBY', 'INACTIVO', 'EN_REPARACION', 'FUERA_SERVICIO', 'BAJA']),
  criticidad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']),
  criticidad_justificacion: z.string().optional(),
  fecha_instalacion: optionalDate,
  fecha_inicio_servicio_mekanos: optionalDate,
  en_garantia: z.boolean(),
  fecha_inicio_garantia: optionalDate,
  fecha_fin_garantia: optionalDate,
  proveedor_garantia: z.string().optional(),
  horas_actuales: optionalNumber,
  fecha_ultima_lectura_horas: optionalDate,
  estado_pintura: z.enum(['EXCELENTE', 'BUENO', 'REGULAR', 'MALO', 'NO_APLICA']).optional(),
  requiere_pintura: z.boolean(),
  tipo_contrato: z.enum(['SIN_CONTRATO', 'PREVENTIVO', 'INTEGRAL', 'POR_LLAMADA']).optional(),
  intervalo_tipo_a_dias_override: optionalNumber,
  intervalo_tipo_a_horas_override: optionalNumber,
  intervalo_tipo_b_dias_override: optionalNumber,
  intervalo_tipo_b_horas_override: optionalNumber,
  criterio_intervalo_override: z.enum(['DIAS', 'HORAS', 'LO_QUE_OCURRA_PRIMERO']).optional(),
  observaciones_generales: z.string().optional(),
  configuracion_especial: z.string().optional(),
});

const datosMotorSchema = z.object({
  tipo_motor: z.enum(['COMBUSTION', 'ELECTRICO']),
  marca_motor: z.string().min(1, 'Marca motor requerida').max(100),
  modelo_motor: z.string().max(100).optional(),
  numero_serie_motor: z.string().max(100).optional(),
  potencia_hp: optionalNumber,
  potencia_kw: optionalNumber,
  velocidad_nominal_rpm: optionalNumber,
  tipo_combustible: z.enum(['DIESEL', 'GASOLINA', 'GAS_NATURAL', 'GLP', 'DUAL', 'BIODIESEL']).optional(),
  numero_cilindros: optionalNumber,
  voltaje_arranque_vdc: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().refine(val => [12, 24, 48].includes(val), {
      message: 'El voltaje de arranque debe ser 12, 24 o 48 VDC'
    }).optional()
  ),
  capacidad_aceite_litros: optionalNumber,
  capacidad_refrigerante_litros: optionalNumber,
  tiene_turbocargador: z.boolean().default(false),
  tipo_arranque: z.enum(['ELECTRICO', 'MANUAL', 'NEUMATICO']).optional(),
  amperaje_arranque: optionalNumber,
  numero_baterias: optionalNumber,
  referencia_bateria: z.string().optional(),
  capacidad_bateria_ah: optionalNumber,
  tiene_radiador: z.boolean().default(false),
  radiador_alto_cm: optionalNumber,
  radiador_ancho_cm: optionalNumber,
  radiador_espesor_cm: optionalNumber,
  tiene_cargador_bateria: z.boolean().default(false),
  marca_cargador: z.string().optional(),
  modelo_cargador: z.string().optional(),
  amperaje_cargador: optionalNumber,
  voltaje_operacion_vac: z.string().optional(),
  numero_fases: z.enum(['MONOFASICO', 'TRIFASICO']).optional(),
  frecuencia_hz: optionalNumber,
  clase_aislamiento: z.enum(['A', 'B', 'F', 'H']).optional(),
  grado_proteccion_ip: z.string().optional(),
  amperaje_nominal: optionalNumber,
  factor_potencia: optionalNumber,
  anio_fabricacion: optionalNumber,
  aspiracion: z.string().optional(),
  sistema_enfriamiento: z.string().optional(),
  tipo_aceite: z.string().optional(),
  tipo_refrigerante: z.string().optional(),
  presion_aceite_minima_psi: optionalNumber,
  temperatura_operacion_maxima_c: optionalNumber,
  observaciones: z.string().optional(),
})
  .refine(data => !!data.potencia_hp || !!data.potencia_kw, {
    message: "Al menos una potencia (HP o kW) es obligatoria",
    path: ["potencia_hp"]
  })
  .refine(data => {
    if (data.tipo_motor === 'COMBUSTION') {
      return !!data.tipo_combustible && !!data.capacidad_aceite_litros;
    }
    return true;
  }, {
    message: "Para motores a COMBUSTIÓN, el tipo de combustible y capacidad de aceite son obligatorios",
    path: ["tipo_combustible"]
  })
  .refine(data => {
    if (data.tipo_motor === 'ELECTRICO') {
      return !!data.voltaje_operacion_vac;
    }
    return true;
  }, {
    message: "Para motores ELÉCTRICOS, el voltaje de operación es obligatorio",
    path: ["voltaje_operacion_vac"]
  });

const datosGeneradorSchema = z.object({
  marca_generador: z.string().min(1, 'Marca generador requerida').max(100),
  modelo_generador: z.string().max(100).optional(),
  numero_serie_generador: z.string().max(100).optional(),
  marca_alternador: z.string().max(100).optional(),
  modelo_alternador: z.string().max(100).optional(),
  numero_serie_alternador: z.string().max(100).optional(),
  potencia_kva: optionalNumber,
  potencia_kw: optionalNumber,
  voltaje_salida: z.string().min(1, 'Voltaje salida requerido'),
  amperaje_nominal_salida: optionalNumber,
  numero_fases: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().refine(val => [1, 3].includes(val), {
      message: 'El número de fases debe ser 1 (Monofásico) o 3 (Trifásico)'
    }).optional()
  ),
  frecuencia_hz: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().refine(val => [50, 60].includes(val), {
      message: 'La frecuencia debe ser 50 o 60 Hz'
    }).optional()
  ),
  factor_potencia: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(0.5, 'Mínimo 0.5').max(1, 'Máximo 1.0').optional()
  ),
  tipo_conexion: z.string().optional(),
  tiene_avr: z.boolean().default(false),
  marca_avr: z.string().optional(),
  modelo_avr: z.string().optional(),
  referencia_avr: z.string().optional(),
  tiene_modulo_control: z.boolean().default(false),
  marca_modulo_control: z.string().optional(),
  modelo_modulo_control: z.string().optional(),
  tiene_arranque_automatico: z.boolean().default(false),
  capacidad_tanque_principal_litros: optionalNumber,
  tiene_tanque_auxiliar: z.boolean().default(false),
  capacidad_tanque_auxiliar_litros: optionalNumber,
  tiene_cabina_insonorizada: z.boolean(),
  tiene_transferencia_automatica: z.boolean(),
  tipo_transferencia: z.string().optional(),
  ubicacion_transferencia: z.string().optional(),
  calibre_cable_potencia: z.string().optional(),
  longitud_cable_potencia_m: optionalNumber,
  clase_aislamiento: z.enum(['A', 'B', 'F', 'H']).optional(),
  grado_proteccion_ip: z.string().optional(),
  anio_fabricacion: optionalNumber,
  observaciones: z.string().optional(),
})
  .refine(data => !!data.potencia_kva || !!data.potencia_kw, {
    message: "Al menos una potencia (kVA o kW) es obligatoria",
    path: ["potencia_kva"]
  })
  .refine(data => {
    if (data.tiene_tanque_auxiliar === true) {
      return !!data.capacidad_tanque_auxiliar_litros;
    }
    return true;
  }, {
    message: "La capacidad del tanque auxiliar es obligatoria si se indica que tiene uno",
    path: ["capacidad_tanque_auxiliar_litros"]
  });

const datosBombaSchema = z.object({
  marca_bomba: z.string().min(1, 'Marca bomba requerida').max(100),
  modelo_bomba: z.string().max(100).optional(),
  numero_serie_bomba: z.string().max(100).optional(),
  tipo_bomba: z.enum(['CENTRIFUGA', 'TURBINA_VERTICAL_POZO', 'SUMERGIBLE', 'PERIFERICA', 'TURBINA', 'DESPLAZAMIENTO_POSITIVO']),
  aplicacion_bomba: z.enum(['AGUA_POTABLE', 'AGUAS_RESIDUALES', 'AGUAS_LLUVIAS', 'CONTRAINCENDIOS', 'INDUSTRIAL', 'PISCINA', 'RIEGO']).optional(),
  caudal_maximo_m3h: optionalNumber,
  altura_manometrica_maxima_m: optionalNumber,
  altura_presion_trabajo_m: optionalNumber,
  potencia_hidraulica_kw: optionalNumber,
  eficiencia_porcentaje: optionalNumber,
  diametro_aspiracion: z.string().max(50).optional(),
  diametro_descarga: z.string().max(50).optional(),
  presion_encendido_psi: optionalNumber,
  presion_apagado_psi: optionalNumber,
  numero_total_bombas_sistema: z.number().int().min(1).default(1),
  numero_bomba_en_sistema: z.number().int().min(1).default(1),
  referencia_sello_mecanico: z.string().optional(),
  tiene_panel_control: z.boolean(),
  marca_panel_control: z.string().optional(),
  modelo_panel_control: z.string().optional(),
  tiene_presostato: z.boolean().default(false),
  marca_presostato: z.string().optional(),
  modelo_presostato: z.string().optional(),
  tiene_arrancador_suave: z.boolean().default(false),
  tiene_variador_frecuencia: z.boolean().default(false),
  marca_variador: z.string().optional(),
  modelo_variador: z.string().optional(),
  tiene_contactor_externo: z.boolean().default(false),
  marca_contactor: z.string().optional(),
  amperaje_contactor: optionalNumber,
  tiene_tanques_hidroneumaticos: z.boolean().default(false),
  cantidad_tanques: optionalNumber,
  capacidad_tanques_litros: optionalNumber,
  presion_tanques_psi: optionalNumber,
  tiene_manometro: z.boolean().default(false),
  rango_manometro_min_psi: optionalNumber,
  rango_manometro_max_psi: optionalNumber,
  tiene_proteccion_nivel: z.boolean().default(false),
  tipo_proteccion_nivel: z.string().optional(),
  tiene_valvula_purga: z.boolean().default(false),
  tiene_valvula_cebado: z.boolean().default(false),
  tiene_valvula_cheque: z.boolean().default(false),
  tiene_valvula_pie: z.boolean().default(false),
  anio_fabricacion: optionalNumber,
  observaciones: z.string().optional(),
})
  .refine(data => data.numero_bomba_en_sistema <= data.numero_total_bombas_sistema, {
    message: "La posición de la bomba no puede ser mayor al total de bombas",
    path: ["numero_bomba_en_sistema"]
  })
  .refine(data => {
    if (data.presion_encendido_psi && data.presion_apagado_psi) {
      return data.presion_apagado_psi > data.presion_encendido_psi;
    }
    return true;
  }, {
    message: "La presión de apagado debe ser mayor a la de encendido",
    path: ["presion_apagado_psi"]
  })
  .refine(data => {
    if (data.altura_presion_trabajo_m && data.altura_manometrica_maxima_m) {
      return data.altura_presion_trabajo_m <= data.altura_manometrica_maxima_m;
    }
    return true;
  }, {
    message: "La altura de trabajo no puede exceder la altura máxima",
    path: ["altura_presion_trabajo_m"]
  })
  .refine(data => !(data.tiene_arrancador_suave && data.tiene_variador_frecuencia), {
    message: "Un equipo no puede tener Arrancador Suave y Variador de Frecuencia simultáneamente",
    path: ["tiene_variador_frecuencia"]
  });

const equipoFormSchema = z.object({
  tipo: z.enum(['GENERADOR', 'BOMBA', 'MOTOR']),
  datosEquipo: datosEquipoBaseSchema,
  datosMotor: datosMotorSchema.optional(),
  datosGenerador: datosGeneradorSchema.optional(),
  datosBomba: datosBombaSchema.optional(),
});

type EquipoFormData = z.infer<typeof equipoFormSchema>;

// COMPONENTE PRINCIPAL
export function EquipoForm({ onSuccess, clientePreseleccionado }: {
  onSuccess?: (data: unknown) => void,
  onCancel?: () => void,
  clientePreseleccionado?: number
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoEquipo | null>(null);
  // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Estado para config personalizada
  const [configParametros, setConfigParametros] = useState<ConfigParametros>({});
  // ✅ SEARCHABLE CLIENT SELECTOR
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const clienteComboRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Click-outside handler para cerrar dropdown de clientes
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clienteComboRef.current && !clienteComboRef.current.contains(e.target as Node)) {
        setClienteDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const crearEquipoMutation = useCrearEquipo();

  // Hooks de Selectores
  const { data: clientesOptions } = useClientesSelector();
  const { data: tiposEquipoOptions, isLoading: loadingTipos } = useTiposEquipoSelector();

  /**
   * ✅ GENERADOR AUTOMÁTICO DE CÓDIGO DE INVENTARIO (29-ENE-2026)
   * Formato: {TIPO}-{CLIENTE_PREFIJO}-{TIMESTAMP}
   * Ejemplo: GEN-NAVAS-A1B2C3
   */
  const generarCodigoAutomatico = () => {
    const tipo = tipoSeleccionado || 'EQP';
    const prefijo = tipo === 'GENERADOR' ? 'GEN' : tipo === 'BOMBA' ? 'BOM' : 'MOT';

    // Obtener prefijo del cliente seleccionado
    const clienteId = form.getValues('datosEquipo.id_cliente');
    let clientePrefijo = 'CLI';
    if (clienteId && clientesOptions) {
      const clienteSeleccionado = clientesOptions.find(c => c.value === String(clienteId));
      if (clienteSeleccionado) {
        // Extraer primeras 4 letras del nombre del cliente
        clientePrefijo = clienteSeleccionado.label
          .replace(/[^A-Za-z]/g, '')
          .substring(0, 4)
          .toUpperCase() || 'CLI';
      }
    }

    // Generar sufijo único basado en timestamp
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();

    const codigoGenerado = `${prefijo}-${clientePrefijo}-${timestamp}${random}`;
    form.setValue('datosEquipo.codigo_equipo', codigoGenerado);

    toast({
      title: '✨ Código generado',
      description: `Se ha generado el código: ${codigoGenerado}`,
    });
  };

  const form = useForm<z.infer<typeof equipoFormSchema>>({
    // @ts-expect-error - Resolver complex types
    resolver: zodResolver(equipoFormSchema),
    defaultValues: {
      tipo: 'GENERADOR',
      datosEquipo: {
        codigo_equipo: '',
        id_cliente: clientePreseleccionado || 0,
        id_tipo_equipo: 0,
        id_sede: undefined,
        ubicacion_texto: '',
        estado_equipo: 'OPERATIVO',
        criticidad: 'MEDIA',
        en_garantia: false,
        requiere_pintura: false,
      },
      datosMotor: {
        tipo_motor: 'COMBUSTION',
        marca_motor: '',
        modelo_motor: '',
        numero_serie_motor: '',
        potencia_hp: undefined,
        potencia_kw: undefined,
        velocidad_nominal_rpm: undefined,
        tipo_combustible: undefined,
        numero_cilindros: undefined,
        voltaje_arranque_vdc: undefined,
        capacidad_aceite_litros: undefined,
        capacidad_refrigerante_litros: undefined,
        tiene_turbocargador: false,
        tipo_arranque: undefined,
        amperaje_arranque: undefined,
        numero_baterias: undefined,
        referencia_bateria: '',
        capacidad_bateria_ah: undefined,
        tiene_radiador: false,
        radiador_alto_cm: undefined,
        radiador_ancho_cm: undefined,
        radiador_espesor_cm: undefined,
        tiene_cargador_bateria: false,
        marca_cargador: '',
        modelo_cargador: '',
        amperaje_cargador: undefined,
        voltaje_operacion_vac: '',
        numero_fases: undefined,
        frecuencia_hz: undefined,
        clase_aislamiento: undefined,
        grado_proteccion_ip: '',
        amperaje_nominal: undefined,
        factor_potencia: undefined,
        anio_fabricacion: undefined,
        aspiracion: '',
        sistema_enfriamiento: '',
        tipo_aceite: '',
        tipo_refrigerante: '',
        presion_aceite_minima_psi: undefined,
        temperatura_operacion_maxima_c: undefined,
        observaciones: '',
      },
      datosGenerador: {
        marca_generador: '',
        modelo_generador: '',
        numero_serie_generador: '',
        marca_alternador: '',
        modelo_alternador: '',
        numero_serie_alternador: '',
        potencia_kva: undefined,
        potencia_kw: undefined,
        voltaje_salida: '220/127V',
        amperaje_nominal_salida: undefined,
        numero_fases: 3,
        frecuencia_hz: 60,
        factor_potencia: 0.8,
        tipo_conexion: '',
        tiene_avr: false,
        marca_avr: '',
        modelo_avr: '',
        referencia_avr: '',
        tiene_modulo_control: false,
        marca_modulo_control: '',
        modelo_modulo_control: '',
        tiene_arranque_automatico: false,
        capacidad_tanque_principal_litros: undefined,
        tiene_tanque_auxiliar: false,
        capacidad_tanque_auxiliar_litros: undefined,
        tiene_cabina_insonorizada: false,
        tiene_transferencia_automatica: false,
        tipo_transferencia: '',
        ubicacion_transferencia: '',
        calibre_cable_potencia: '',
        longitud_cable_potencia_m: undefined,
        clase_aislamiento: undefined,
        grado_proteccion_ip: '',
        anio_fabricacion: undefined,
        observaciones: '',
      },
      datosBomba: {
        marca_bomba: '',
        modelo_bomba: '',
        numero_serie_bomba: '',
        tipo_bomba: 'CENTRIFUGA',
        aplicacion_bomba: undefined,
        caudal_maximo_m3h: undefined,
        altura_manometrica_maxima_m: undefined,
        altura_presion_trabajo_m: undefined,
        potencia_hidraulica_kw: undefined,
        eficiencia_porcentaje: undefined,
        diametro_aspiracion: '',
        diametro_descarga: '',
        presion_encendido_psi: undefined,
        presion_apagado_psi: undefined,
        numero_total_bombas_sistema: 1,
        numero_bomba_en_sistema: 1,
        referencia_sello_mecanico: '',
        tiene_panel_control: false,
        marca_panel_control: '',
        modelo_panel_control: '',
        tiene_presostato: false,
        marca_presostato: '',
        modelo_presostato: '',
        tiene_arrancador_suave: false,
        tiene_variador_frecuencia: false,
        marca_variador: '',
        modelo_variador: '',
        tiene_contactor_externo: false,
        marca_contactor: '',
        amperaje_contactor: undefined,
        tiene_tanques_hidroneumaticos: false,
        cantidad_tanques: undefined,
        capacidad_tanques_litros: undefined,
        presion_tanques_psi: undefined,
        tiene_manometro: false,
        rango_manometro_min_psi: undefined,
        rango_manometro_max_psi: undefined,
        tiene_proteccion_nivel: false,
        tipo_proteccion_nivel: '',
        tiene_valvula_purga: false,
        tiene_valvula_cebado: false,
        tiene_valvula_cheque: false,
        tiene_valvula_pie: false,
        anio_fabricacion: undefined,
        observaciones: '',
      }
    }
  });

  const { setValue, register, formState: { errors }, control, trigger, handleSubmit } = form;

  const nextStep = async (step: number) => {
    // Validar campos del paso actual antes de avanzar
    let fieldsToValidate: Path<EquipoFormData>[] = [];

    if (step === 2) {
      // Validamos TODOS los campos obligatorios y críticos del paso 2 (General)
      fieldsToValidate = [
        'datosEquipo.id_cliente' as const,
        'datosEquipo.codigo_equipo' as const,
        'datosEquipo.id_tipo_equipo' as const,
        'datosEquipo.nombre_equipo' as const,
        'datosEquipo.numero_serie_equipo' as const,
        'datosEquipo.ubicacion_texto' as const,
        'datosEquipo.estado_equipo' as const,
        'datosEquipo.criticidad' as const,
        'datosEquipo.en_garantia' as const,
        'datosEquipo.requiere_pintura' as const
      ];

      // Si está en garantía, validamos campos de garantía
      if (enGarantia) {
        fieldsToValidate.push('datosEquipo.fecha_inicio_garantia' as const);
        fieldsToValidate.push('datosEquipo.fecha_fin_garantia' as const);
      }
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.warn('Validación fallida en paso', step, errors);
      // Forzar scroll al primer error para que el usuario lo vea
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const idCliente = useWatch({
    control,
    name: 'datosEquipo.id_cliente'
  });

  const enGarantia = useWatch({
    control,
    name: 'datosEquipo.en_garantia'
  });

  const tipoMotor = useWatch({
    control,
    name: 'datosMotor.tipo_motor'
  });

  const watchTieneTanqueAux = useWatch({
    control,
    name: 'datosGenerador.tiene_tanque_auxiliar' as const
  });

  const watchTieneAVR = useWatch({
    control,
    name: 'datosGenerador.tiene_avr' as const
  });

  const watchTieneModuloControl = useWatch({
    control,
    name: 'datosGenerador.tiene_modulo_control' as const
  });

  const watchTieneRadiador = useWatch({
    control,
    name: 'datosMotor.tiene_radiador' as const
  });

  const watchTieneCargador = useWatch({
    control,
    name: 'datosMotor.tiene_cargador_bateria' as const
  });

  const watchTieneVariador = useWatch({
    control,
    name: 'datosBomba.tiene_variador_frecuencia' as const
  });

  const watchTienePresostato = useWatch({
    control,
    name: 'datosBomba.tiene_presostato' as const
  });

  const watchTieneTanquesHidro = useWatch({
    control,
    name: 'datosBomba.tiene_tanques_hidroneumaticos' as const
  });

  const watchTieneManometro = useWatch({
    control,
    name: 'datosBomba.tiene_manometro' as const
  });

  const watchTieneContactor = useWatch({
    control,
    name: 'datosBomba.tiene_contactor_externo' as const
  });

  const watchTieneProteccionNivel = useWatch({
    control,
    name: 'datosBomba.tiene_proteccion_nivel' as const
  });

  const watchTienePanelControl = useWatch({
    control,
    name: 'datosBomba.tiene_panel_control' as const
  });

  const { data: sedesOptions, isLoading: loadingSedes } = useSedesSelector(idCliente || 0);

  // Efecto para cambiar el tipo de equipo en el form
  useEffect(() => {
    if (tipoSeleccionado) {
      setValue('tipo', tipoSeleccionado);

      // Intentar auto-seleccionar la categoría en el dropdown de Step 2
      if (tiposEquipoOptions) {
        const matchingTipo = tiposEquipoOptions.find(t =>
          t.label.toUpperCase().includes(tipoSeleccionado.toUpperCase()) ||
          tipoSeleccionado.toUpperCase().includes(t.label.toUpperCase())
        );
        if (matchingTipo) {
          setValue('datosEquipo.id_tipo_equipo', parseInt(matchingTipo.value));
        }
      }

      // Resetear datos específicos
      if (tipoSeleccionado === 'GENERADOR') {
        setValue('datosMotor', {
          tipo_motor: 'COMBUSTION',
          marca_motor: '',
          modelo_motor: '',
          numero_serie_motor: '',
          potencia_hp: undefined,
          potencia_kw: undefined,
          velocidad_nominal_rpm: undefined,
          tipo_combustible: undefined,
          numero_cilindros: undefined,
          voltaje_arranque_vdc: undefined,
          capacidad_aceite_litros: undefined,
          capacidad_refrigerante_litros: undefined,
          tiene_turbocargador: false,
          tipo_arranque: undefined,
          amperaje_arranque: undefined,
          numero_baterias: undefined,
          referencia_bateria: '',
          capacidad_bateria_ah: undefined,
          tiene_radiador: false,
          radiador_alto_cm: undefined,
          radiador_ancho_cm: undefined,
          radiador_espesor_cm: undefined,
          tiene_cargador_bateria: false,
          marca_cargador: '',
          modelo_cargador: '',
          amperaje_cargador: undefined,
          voltaje_operacion_vac: '',
          numero_fases: undefined,
          frecuencia_hz: undefined,
          clase_aislamiento: undefined,
          grado_proteccion_ip: '',
          amperaje_nominal: undefined,
          factor_potencia: undefined,
          anio_fabricacion: undefined,
          aspiracion: '',
          sistema_enfriamiento: '',
          tipo_aceite: '',
          tipo_refrigerante: '',
          presion_aceite_minima_psi: undefined,
          temperatura_operacion_maxima_c: undefined,
          observaciones: '',
        } as any);
        setValue('datosGenerador', {
          marca_generador: '',
          modelo_generador: '',
          numero_serie_generador: '',
          marca_alternador: '',
          modelo_alternador: '',
          numero_serie_alternador: '',
          potencia_kva: undefined,
          potencia_kw: undefined,
          voltaje_salida: '220/127V',
          amperaje_nominal_salida: undefined,
          numero_fases: 3,
          frecuencia_hz: 60,
          factor_potencia: 0.8,
          tipo_conexion: '',
          tiene_avr: false,
          marca_avr: '',
          modelo_avr: '',
          referencia_avr: '',
          tiene_modulo_control: false,
          marca_modulo_control: '',
          modelo_modulo_control: '',
          tiene_arranque_automatico: false,
          capacidad_tanque_principal_litros: undefined,
          tiene_tanque_auxiliar: false,
          capacidad_tanque_auxiliar_litros: undefined,
          tiene_cabina_insonorizada: false,
          tiene_transferencia_automatica: false,
          tipo_transferencia: '',
          ubicacion_transferencia: '',
          calibre_cable_potencia: '',
          longitud_cable_potencia_m: undefined,
          clase_aislamiento: undefined,
          grado_proteccion_ip: '',
          anio_fabricacion: undefined,
          observaciones: '',
        } as any);
        setValue('datosBomba', undefined);
      } else if (tipoSeleccionado === 'BOMBA') {
        setValue('datosMotor', {
          tipo_motor: 'ELECTRICO',
          marca_motor: '',
          modelo_motor: '',
          numero_serie_motor: '',
          potencia_hp: undefined,
          potencia_kw: undefined,
          velocidad_nominal_rpm: undefined,
          tipo_combustible: undefined,
          numero_cilindros: undefined,
          voltaje_arranque_vdc: undefined,
          capacidad_aceite_litros: undefined,
          capacidad_refrigerante_litros: undefined,
          tiene_turbocargador: false,
          tipo_arranque: undefined,
          amperaje_arranque: undefined,
          numero_baterias: undefined,
          referencia_bateria: '',
          capacidad_bateria_ah: undefined,
          tiene_radiador: false,
          radiador_alto_cm: undefined,
          radiador_ancho_cm: undefined,
          radiador_espesor_cm: undefined,
          tiene_cargador_bateria: false,
          marca_cargador: '',
          modelo_cargador: '',
          amperaje_cargador: undefined,
          voltaje_operacion_vac: '',
          numero_fases: undefined,
          frecuencia_hz: undefined,
          clase_aislamiento: undefined,
          grado_proteccion_ip: '',
          amperaje_nominal: undefined,
          factor_potencia: undefined,
          anio_fabricacion: undefined,
          aspiracion: '',
          sistema_enfriamiento: '',
          tipo_aceite: '',
          tipo_refrigerante: '',
          presion_aceite_minima_psi: undefined,
          temperatura_operacion_maxima_c: undefined,
          observaciones: '',
        } as any);
        setValue('datosBomba', {
          marca_bomba: '',
          modelo_bomba: '',
          numero_serie_bomba: '',
          tipo_bomba: 'CENTRIFUGA',
          aplicacion_bomba: undefined,
          caudal_maximo_m3h: undefined,
          altura_manometrica_maxima_m: undefined,
          altura_presion_trabajo_m: undefined,
          potencia_hidraulica_kw: undefined,
          eficiencia_porcentaje: undefined,
          diametro_aspiracion: '',
          diametro_descarga: '',
          presion_encendido_psi: undefined,
          presion_apagado_psi: undefined,
          numero_total_bombas_sistema: 1,
          numero_bomba_en_sistema: 1,
          referencia_sello_mecanico: '',
          tiene_panel_control: false,
          marca_panel_control: '',
          modelo_panel_control: '',
          tiene_presostato: false,
          marca_presostato: '',
          modelo_presostato: '',
          tiene_arrancador_suave: false,
          tiene_variador_frecuencia: false,
          marca_variador: '',
          modelo_variador: '',
          tiene_contactor_externo: false,
          marca_contactor: '',
          amperaje_contactor: undefined,
          tiene_tanques_hidroneumaticos: false,
          cantidad_tanques: undefined,
          capacidad_tanques_litros: undefined,
          presion_tanques_psi: undefined,
          tiene_manometro: false,
          rango_manometro_min_psi: undefined,
          rango_manometro_max_psi: undefined,
          tiene_proteccion_nivel: false,
          tipo_proteccion_nivel: '',
          tiene_valvula_purga: false,
          tiene_valvula_cebado: false,
          tiene_valvula_cheque: false,
          tiene_valvula_pie: false,
          anio_fabricacion: undefined,
          observaciones: '',
        } as any);
        setValue('datosGenerador', undefined);
      } else {
        setValue('datosMotor', {
          tipo_motor: 'COMBUSTION',
          marca_motor: '',
          modelo_motor: '',
          numero_serie_motor: '',
          potencia_hp: undefined,
          potencia_kw: undefined,
          velocidad_nominal_rpm: undefined,
          tipo_combustible: undefined,
          numero_cilindros: undefined,
          voltaje_arranque_vdc: undefined,
          capacidad_aceite_litros: undefined,
          capacidad_refrigerante_litros: undefined,
          tiene_turbocargador: false,
          tipo_arranque: undefined,
          amperaje_arranque: undefined,
          numero_baterias: undefined,
          referencia_bateria: '',
          capacidad_bateria_ah: undefined,
          tiene_radiador: false,
          radiador_alto_cm: undefined,
          radiador_ancho_cm: undefined,
          radiador_espesor_cm: undefined,
          tiene_cargador_bateria: false,
          marca_cargador: '',
          modelo_cargador: '',
          amperaje_cargador: undefined,
          voltaje_operacion_vac: '',
          numero_fases: undefined,
          frecuencia_hz: undefined,
          clase_aislamiento: undefined,
          grado_proteccion_ip: '',
          amperaje_nominal: undefined,
          factor_potencia: undefined,
          anio_fabricacion: undefined,
          aspiracion: '',
          sistema_enfriamiento: '',
          tipo_aceite: '',
          tipo_refrigerante: '',
          presion_aceite_minima_psi: undefined,
          temperatura_operacion_maxima_c: undefined,
          observaciones: '',
        } as any);
        setValue('datosGenerador', undefined);
        setValue('datosBomba', undefined);
      }
    }
  }, [tipoSeleccionado, setValue, tiposEquipoOptions]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFormSubmit = async (data: any) => {
    // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Incluir config en el payload
    const payloadConConfig = {
      ...data,
      config_parametros: Object.keys(configParametros).length > 0 ? configParametros : undefined,
    };
    console.log('Intentando registrar equipo:', payloadConConfig);
    try {
      const result = await crearEquipoMutation.mutateAsync(payloadConConfig as CreateEquipoPayload);
      console.log('Resultado registro:', result);
      if (result.success && onSuccess) {
        toast({
          title: '✅ Equipo registrado',
          description: `El equipo ${result.data?.codigo_equipo || ''} se ha creado exitosamente.`,
        });
        onSuccess(result.data);
      } else if (!result.success) {
        // Si el backend devuelve un error estructurado
        const errorMsg = result.error || 'Error desconocido al registrar el equipo';
        toast({
          title: '❌ Error del servidor',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } catch (error: unknown) {
      console.error('Error en mutación:', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      const apiError = err?.response?.data?.message;
      const detailedError = Array.isArray(apiError) ? apiError.join('\n') : apiError;

      // Mensajes amigables para errores comunes
      let friendlyMessage = detailedError || err.message || 'Error inesperado';
      if (friendlyMessage.includes('Ya existe un equipo con el código')) {
        friendlyMessage = 'Este código de inventario ya está en uso. Use el botón "Generar" para crear uno nuevo automáticamente.';
      }

      toast({
        title: '❌ Error al registrar equipo',
        description: friendlyMessage,
        variant: 'destructive',
      });
    }
  };

  const onInvalid = (errors: Record<string, unknown>) => {
    console.error('ERRORES DE VALIDACIÓN DETECTADOS:', errors);
    console.error('Form state:', form.formState.errors);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit as never, onInvalid)} className="space-y-8 max-w-5xl mx-auto p-4">
      {/* Debug info - Solo visible en desarrollo si se desea */}
      {Object.keys(errors).length > 0 && (
        <div className="p-6 bg-red-50 border-2 border-red-200 rounded-3xl text-red-800 shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="font-black text-lg uppercase tracking-tight">Errores de Validación Detectados</p>
          </div>
          <ul className="space-y-2">
            {Object.entries(errors).map(([key, value]) => {
              if (['datosEquipo', 'datosMotor', 'datosGenerador', 'datosBomba'].includes(key) && typeof value === 'object') {
                return Object.entries(value as object).map(([subKey, subValue]) => (
                  <li key={`${key}.${subKey}`} className="flex items-center gap-2 text-sm font-bold bg-white/50 p-2 rounded-lg border border-red-100">
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-red-400 uppercase text-[10px] font-black">{key.replace('datos', '')}.{subKey}:</span>
                    <span>{typeof subValue === 'object' && subValue !== null && 'message' in subValue ? String(subValue.message) : 'Error en campo'}</span>
                  </li>
                ));
              }
              return (
                <li key={key} className="flex items-center gap-2 text-sm font-bold bg-white/50 p-2 rounded-lg border border-red-100">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-red-400 uppercase text-[10px] font-black">{key}:</span>
                  <span>{value && typeof value === 'object' && 'message' in value ? String(value.message) : 'Error en subcampo'}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs font-bold opacity-60 italic">* Por favor, revise los campos marcados en rojo en cada pestaña.</p>
        </div>
      )}
      {/* Wizard Header */}
      <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        {[
          { step: 1, label: 'Tipo' },
          { step: 2, label: 'General' },
          { step: 3, label: 'Técnico' }
        ].map((item) => (
          <div key={item.step} className="flex items-center flex-1 last:flex-none">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all",
              currentStep >= item.step ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white border-gray-200 text-gray-400"
            )}>
              {item.step}
            </div>
            <span className={cn("ml-3 font-semibold hidden md:block", currentStep >= item.step ? "text-blue-600" : "text-gray-400")}>
              {item.label}
            </span>
            {item.step < 3 && <div className={cn("flex-1 h-0.5 mx-4", currentStep > item.step ? "bg-blue-600" : "bg-gray-100")} />}
          </div>
        ))}
      </div>

      {/* PASO 1: TIPO DE EQUIPO */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-center">
            <h2 className="text-3xl font-black text-gray-900">Registro de Equipo</h2>
            <p className="text-gray-500 mt-2">Seleccione la naturaleza del equipo para habilitar los campos técnicos correspondientes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'GENERADOR', label: 'Generador / Planta', desc: 'Equipos de generación eléctrica a combustión.', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { id: 'BOMBA', label: 'Bomba / Motobomba', desc: 'Equipos de bombeo de agua o fluidos.', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50' },
              { id: 'MOTOR', label: 'Motor Independiente', desc: 'Motores eléctricos o de combustión solos.', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-50' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTipoSeleccionado(item.id as TipoEquipo);
                  setCurrentStep(2);
                }}
                className={cn(
                  "p-8 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-4 hover:shadow-xl group",
                  tipoSeleccionado === item.id ? "border-blue-600 bg-blue-50/30 ring-4 ring-blue-50" : "border-gray-100 hover:border-gray-200 bg-white"
                )}
              >
                <div className={cn("p-5 rounded-2xl transition-transform group-hover:scale-110", item.bg)}>
                  <item.icon className={cn("w-10 h-10", item.color)} />
                </div>
                <div>
                  <span className="block font-black text-xl text-gray-800">{item.label}</span>
                  <span className="text-sm text-gray-500 mt-1 block">{item.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PASO 2: DATOS BASE Y UBICACIÓN */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-gray-900">Información de Identificación</h2>
                <p className="text-gray-500 text-sm">Datos básicos y ubicación del equipo en las instalaciones.</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                  <span className="text-red-500 font-bold">*</span> = Campo obligatorio
                </p>
                <p className="text-xs text-gray-400 italic">Los campos opcionales se indican expresamente</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Cliente Selector - Searchable Combobox */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                  Cliente Propietario <span className="text-red-500">*</span>
                </label>
                <input type="hidden" {...register('datosEquipo.id_cliente' as const, { valueAsNumber: true })} />
                <div ref={clienteComboRef} className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nombre o NIT del cliente..."
                    value={clienteDropdownOpen ? clienteSearch : (
                      clientesOptions?.find(c => c.value === String(form.getValues('datosEquipo.id_cliente')))?.label || ''
                    )}
                    onChange={(e) => {
                      setClienteSearch(e.target.value);
                      if (!clienteDropdownOpen) setClienteDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setClienteDropdownOpen(true);
                      setClienteSearch('');
                    }}
                    className={cn(
                      "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                      errors.datosEquipo?.id_cliente ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                  {clienteDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                      {(() => {
                        const q = clienteSearch.toLowerCase().trim();
                        const filtered = clientesOptions?.filter(opt => {
                          if (!q) return true;
                          return opt.label.toLowerCase().includes(q) || (opt.nit && opt.nit.toLowerCase().includes(q));
                        }) || [];
                        if (filtered.length === 0) {
                          return (
                            <div className="px-4 py-3 text-sm text-gray-500 italic">
                              No se encontraron clientes
                            </div>
                          );
                        }
                        return filtered.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              form.setValue('datosEquipo.id_cliente', Number(opt.value), { shouldValidate: true });
                              setClienteSearch('');
                              setClienteDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors text-sm border-b border-gray-50 last:border-b-0",
                              String(form.getValues('datosEquipo.id_cliente')) === opt.value && "bg-blue-50 font-semibold text-blue-700"
                            )}
                          >
                            <div className="font-medium">{opt.label}</div>
                            {opt.nit && <div className="text-xs text-gray-400">NIT: {opt.nit}</div>}
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                {errors.datosEquipo?.id_cliente && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.id_cliente.message}
                  </p>
                )}
              </div>

              {/* Sede Selector (Cascading) */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Sede / Sucursal</label>
                <select
                  {...register('datosEquipo.id_sede' as const, { valueAsNumber: true })}
                  disabled={!idCliente || loadingSedes}
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50 disabled:opacity-50",
                    errors.datosEquipo?.id_sede ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                >
                  <option value="">{loadingSedes ? 'Cargando sedes...' : (sedesOptions?.length === 0 ? 'No hay sedes para este cliente' : 'Seleccione sede (opcional)')}</option>
                  {sedesOptions?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.datosEquipo?.id_sede && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.id_sede.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                  Código de Inventario <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    {...register('datosEquipo.codigo_equipo' as const, {
                      onChange: (e) => {
                        // ✅ FIX 27-ENE-2026: Auto-normalizar a formato válido (mayúsculas, sin espacios)
                        const normalized = e.target.value
                          .toUpperCase()
                          .replace(/\s+/g, '-')  // Espacios → guiones
                          .replace(/[^A-Z0-9\-]/g, '');  // Remover caracteres inválidos
                        e.target.value = normalized;
                      }
                    })}
                    placeholder="Ej: GEN-NAVAS-JD-001"
                    className={cn(
                      "flex-1 p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50 uppercase font-mono",
                      errors.datosEquipo?.codigo_equipo ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                  <button
                    type="button"
                    onClick={generarCodigoAutomatico}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
                    title="Generar código automáticamente"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">Generar</span>
                  </button>
                </div>
                <p className="text-[10px] text-blue-600 ml-1 italic flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Use el botón &quot;Generar&quot; para crear un código único automáticamente, o escriba uno manualmente.
                </p>
                {errors.datosEquipo?.codigo_equipo && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.codigo_equipo.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                  Categoría Técnica <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('datosEquipo.id_tipo_equipo' as const, { valueAsNumber: true })}
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.id_tipo_equipo ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                >
                  <option value="">{loadingTipos ? 'Cargando categorías...' : (tiposEquipoOptions?.length === 0 ? 'No hay categorías disponibles' : 'Seleccione categoría...')}</option>
                  {tiposEquipoOptions?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 ml-1 italic">
                  <AlertCircle className="w-2 h-2 inline mr-1" />
                  Esta es la &quot;Categoría de Equipo&quot; (ID EQUIPO) que define qué campos técnicos se pedirán en el siguiente paso.
                </p>
                {errors.datosEquipo?.id_tipo_equipo && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.id_tipo_equipo.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                  Nombre / Alias <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                </label>
                <input
                  {...register('datosEquipo.nombre_equipo' as const)}
                  placeholder="Ej: Planta de Emergencia Principal (se genera automáticamente si se deja vacío)"
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.nombre_equipo ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                />
                {errors.datosEquipo?.nombre_equipo && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.nombre_equipo.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                  Número de Serie (Chasis) <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                </label>
                <input
                  {...register('datosEquipo.numero_serie_equipo' as const)}
                  placeholder="S/N del equipo completo (si está disponible)"
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.numero_serie_equipo ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                />
                {errors.datosEquipo?.numero_serie_equipo && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.numero_serie_equipo.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                  Ubicación Física Detallada <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('datosEquipo.ubicacion_texto' as const)}
                  placeholder="Describa exactamente dónde se encuentra el equipo (ej: Sótano 2, Cuarto Eléctrico, junto a la bomba de incendio)."
                  rows={3}
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.ubicacion_texto ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                />
                {errors.datosEquipo?.ubicacion_texto && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.ubicacion_texto.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN: ESTADO Y CRITICIDAD */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
              <div className="p-3 bg-purple-50 rounded-xl">
                <AlertCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Estado y Criticidad</h2>
                <p className="text-gray-500 text-sm">Defina la importancia operativa y el estado actual del equipo.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                  Estado Operativo <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('datosEquipo.estado_equipo' as const)}
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.estado_equipo ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                >
                  <option value="OPERATIVO">Operativo</option>
                  <option value="STANDBY">Standby / Reserva</option>
                  <option value="INACTIVO">Inactivo</option>
                  <option value="EN_REPARACION">En Reparación</option>
                  <option value="FUERA_SERVICIO">Fuera de Servicio</option>
                  <option value="BAJA">Baja Definitiva</option>
                </select>
                {errors.datosEquipo?.estado_equipo && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.estado_equipo.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                  Criticidad <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('datosEquipo.criticidad' as const)}
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.criticidad ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                >
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Crítica</option>
                </select>
                {errors.datosEquipo?.criticidad && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.criticidad.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Justificación Criticidad</label>
                <input
                  {...register('datosEquipo.criticidad_justificacion' as const)}
                  placeholder="¿Por qué esta criticidad?"
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.criticidad_justificacion ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                />
                {errors.datosEquipo?.criticidad_justificacion && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.criticidad_justificacion.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN: GARANTÍA Y SERVICIO */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
              <div className="p-3 bg-green-50 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Garantía y Servicio</h2>
                <p className="text-gray-500 text-sm">Fechas clave y detalles de cobertura.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Fecha Instalación</label>
                <input
                  type="date"
                  {...register('datosEquipo.fecha_instalacion' as const)}
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.fecha_instalacion ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                />
                {errors.datosEquipo?.fecha_instalacion && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.fecha_instalacion.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Inicio Servicio Mekanos</label>
                <input
                  type="date"
                  {...register('datosEquipo.fecha_inicio_servicio_mekanos' as const)}
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.fecha_inicio_servicio_mekanos ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                />
                {errors.datosEquipo?.fecha_inicio_servicio_mekanos && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.fecha_inicio_servicio_mekanos.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Tipo Contrato</label>
                <select
                  {...register('datosEquipo.tipo_contrato' as const)}
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.tipo_contrato ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                >
                  <option value="SIN_CONTRATO">Sin Contrato</option>
                  <option value="PREVENTIVO">Preventivo</option>
                  <option value="INTEGRAL">Integral</option>
                  <option value="POR_LLAMADA">Por Llamada</option>
                </select>
                {errors.datosEquipo?.tipo_contrato && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.tipo_contrato.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" {...register('datosEquipo.en_garantia' as const)} className="w-6 h-6 rounded-lg border-gray-300 text-blue-600" />
                <label className="text-sm font-black text-gray-700">¿Está en Garantía?</label>
              </div>

              {enGarantia && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Fin Garantía</label>
                    <input
                      type="date"
                      {...register('datosEquipo.fecha_fin_garantia' as const)}
                      className={cn(
                        "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                        errors.datosEquipo?.fecha_fin_garantia ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                    {errors.datosEquipo?.fecha_fin_garantia && (
                      <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.fecha_fin_garantia.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Proveedor Garantía</label>
                    <input
                      {...register('datosEquipo.proveedor_garantia' as const)}
                      className={cn(
                        "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                        errors.datosEquipo?.proveedor_garantia ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                    {errors.datosEquipo?.proveedor_garantia && (
                      <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.proveedor_garantia.message}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SECCIÓN: MANTENIMIENTO Y PINTURA */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
              <div className="p-3 bg-orange-50 rounded-xl">
                <Paintbrush className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Mantenimiento y Pintura</h2>
                <p className="text-gray-500 text-sm">Estado físico y parámetros de mantenimiento.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Estado Pintura</label>
                <select
                  {...register('datosEquipo.estado_pintura' as const)}
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.estado_pintura ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                >
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="REGULAR">Regular</option>
                  <option value="MALO">Malo</option>
                  <option value="NO_APLICA">No Aplica</option>
                </select>
                {errors.datosEquipo?.estado_pintura && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.estado_pintura.message}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 pt-4">
                <input type="checkbox" {...register('datosEquipo.requiere_pintura' as const)} className="w-6 h-6 rounded-lg border-gray-300 text-blue-600" />
                <label className="text-sm font-black text-gray-700">Requiere Pintura</label>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Horas Actuales</label>
                <input
                  type="number"
                  {...register('datosEquipo.horas_actuales' as const, { valueAsNumber: true })}
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.horas_actuales ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                />
                {errors.datosEquipo?.horas_actuales && (
                  <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.horas_actuales.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-gray-50 pt-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Override Días Tipo A</label>
                  <input
                    type="number"
                    {...register('datosEquipo.intervalo_tipo_a_dias_override' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                      errors.datosEquipo?.intervalo_tipo_a_dias_override ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                  {errors.datosEquipo?.intervalo_tipo_a_dias_override && (
                    <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.intervalo_tipo_a_dias_override.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Override Horas Tipo A</label>
                  <input
                    type="number"
                    {...register('datosEquipo.intervalo_tipo_a_horas_override' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                      errors.datosEquipo?.intervalo_tipo_a_horas_override ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                  {errors.datosEquipo?.intervalo_tipo_a_horas_override && (
                    <p className="text-red-600 text-xs font-bold ml-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.datosEquipo.intervalo_tipo_a_horas_override.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Criterio Intervalo</label>
                  <select {...register('datosEquipo.criterio_intervalo_override' as const)} className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50/50">
                    <option value="DIAS">Días</option>
                    <option value="HORAS">Horas</option>
                    <option value="LO_QUE_OCURRA_PRIMERO">Lo que ocurra primero</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-3 space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Observaciones Generales</label>
                <textarea {...register('datosEquipo.observaciones_generales' as const)} rows={2} className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50/50" />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <button type="button" onClick={() => setCurrentStep(1)} className="flex items-center gap-2 px-6 py-3 text-gray-500 font-bold hover:text-gray-800 transition-colors">
              <ChevronLeft className="w-5 h-5" /> Atrás
            </button>
            <div className="flex flex-col items-end gap-2">
              {errors.datosEquipo && Object.keys(errors.datosEquipo).length > 0 && (
                <span className="text-red-600 text-xs font-black uppercase tracking-tighter animate-bounce flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Revisar {Object.keys(errors.datosEquipo).length} campos faltantes
                </span>
              )}
              <button type="button" onClick={() => nextStep(2)} className="flex items-center gap-2 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                Siguiente Paso <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASO 3: ESPECIFICACIONES TÉCNICAS (100% FIDELIDAD) */}
      {currentStep === 3 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">

          {/* SECCIÓN MOTOR (COMÚN) */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
              <div className="p-3 bg-orange-50 rounded-xl">
                <Fuel className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">Especificaciones del Motor</h3>
                <p className="text-gray-500 text-sm">Detalles técnicos del motor que impulsa el equipo.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  Tipo Motor <span className="text-red-500">*</span>
                </label>
                <select {...register('datosMotor.tipo_motor' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30">
                  <option value="COMBUSTION">Combustión Interna</option>
                  <option value="ELECTRICO">Motor Eléctrico</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  Marca Motor <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('datosMotor.marca_motor' as const)}
                  className={cn(
                    "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                    errors.datosMotor?.marca_motor ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                  placeholder="Ej: Perkins, Cummins, WEG"
                />
                {errors.datosMotor?.marca_motor && (
                  <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                    <AlertCircle className="w-2 h-2" /> {errors.datosMotor.marca_motor.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Modelo Motor</label>
                <input {...register('datosMotor.modelo_motor' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Número de Serie Motor</label>
                <input {...register('datosMotor.numero_serie_motor' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  Potencia (HP) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('datosMotor.potencia_hp' as const, { valueAsNumber: true })}
                  className={cn(
                    "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                    errors.datosMotor?.potencia_hp ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                  placeholder="Requerido si kW está vacío"
                />
                {errors.datosMotor?.potencia_hp && (
                  <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                    <AlertCircle className="w-2 h-2" /> {errors.datosMotor.potencia_hp.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  Potencia (kW) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('datosMotor.potencia_kw' as const, { valueAsNumber: true })}
                  className={cn(
                    "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                    errors.datosMotor?.potencia_kw ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                  placeholder="Requerido si HP está vacío"
                />
                {errors.datosMotor?.potencia_kw && (
                  <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                    <AlertCircle className="w-2 h-2" /> {errors.datosMotor.potencia_kw.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">RPM Nominales</label>
                <input
                  type="number"
                  {...register('datosMotor.velocidad_nominal_rpm' as const, { valueAsNumber: true })}
                  className={cn(
                    "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                    errors.datosMotor?.velocidad_nominal_rpm ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                />
                {errors.datosMotor?.velocidad_nominal_rpm && (
                  <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                    <AlertCircle className="w-2 h-2" /> {errors.datosMotor.velocidad_nominal_rpm.message}
                  </p>
                )}
              </div>

              {tipoMotor === 'COMBUSTION' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      Combustible <span className="text-red-500">*</span>
                    </label>
                    <select {...register('datosMotor.tipo_combustible' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30">
                      <option value="DIESEL">Diesel</option>
                      <option value="GASOLINA">Gasolina</option>
                      <option value="GAS_NATURAL">Gas Natural</option>
                      <option value="GLP">GLP</option>
                    </select>
                    <p className="text-[10px] text-blue-600 italic flex items-center gap-1">
                      <AlertCircle className="w-2 h-2" /> Obligatorio para motores a combustión
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Cilindros</label>
                    <input
                      type="number"
                      {...register('datosMotor.numero_cilindros' as const, { valueAsNumber: true })}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.numero_cilindros ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      Voltaje Arranque (VDC)
                      <span className="text-[10px] lowercase font-normal italic">(Batería)</span>
                    </label>
                    <select
                      {...register('datosMotor.voltaje_arranque_vdc' as const, { valueAsNumber: true })}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.voltaje_arranque_vdc ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    >
                      <option value="">Seleccione VDC...</option>
                      <option value="12">12 VDC</option>
                      <option value="24">24 VDC</option>
                      <option value="48">48 VDC</option>
                    </select>
                    {errors.datosMotor?.voltaje_arranque_vdc && (
                      <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                        <AlertCircle className="w-2 h-2" /> {errors.datosMotor.voltaje_arranque_vdc.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      Capacidad Aceite (L) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('datosMotor.capacidad_aceite_litros' as const, { valueAsNumber: true })}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.capacidad_aceite_litros ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                    <p className="text-[10px] text-blue-600 italic flex items-center gap-1">
                      <AlertCircle className="w-2 h-2" /> Obligatorio para motores a combustión
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Capacidad Refrig. (L)</label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('datosMotor.capacidad_refrigerante_litros' as const, { valueAsNumber: true })}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.capacidad_refrigerante_litros ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Aspiración</label>
                    <input {...register('datosMotor.aspiracion' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: Natural, Turbo" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Sistema Enfriamiento</label>
                    <input {...register('datosMotor.sistema_enfriamiento' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: Radiador, Intercambiador" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">¿Tiene Turbocargador?</label>
                    <div className="flex items-center gap-3 pt-2">
                      <input type="checkbox" {...register('datosMotor.tiene_turbocargador' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                      <label className="text-sm font-bold text-gray-700">Sí</label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Tipo de Arranque</label>
                    <select {...register('datosMotor.tipo_arranque' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30">
                      <option value="">Seleccione tipo...</option>
                      <option value="ELECTRICO">Eléctrico</option>
                      <option value="MANUAL">Manual</option>
                      <option value="NEUMATICO">Neumático</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Amperaje Arranque (CCA)</label>
                    <input type="number" {...register('datosMotor.amperaje_arranque' as const, { valueAsNumber: true })} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Referencia Batería</label>
                    <input {...register('datosMotor.referencia_bateria' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: 8D, 4D, 31-S" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Capacidad Batería (Ah)</label>
                    <input
                      type="number"
                      {...register('datosMotor.capacidad_bateria_ah' as const, { valueAsNumber: true })}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.capacidad_bateria_ah ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Cantidad Baterías</label>
                    <input
                      type="number"
                      {...register('datosMotor.numero_baterias' as const, { valueAsNumber: true })}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.numero_baterias ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                  </div>

                  {/* SUB-SECCIÓN RADIADOR */}
                  <div className="md:col-span-3 border-t border-gray-50 pt-4">
                    <div className="flex items-center gap-3 mb-4">
                      <input type="checkbox" {...register('datosMotor.tiene_radiador' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                      <label className="text-sm font-black text-gray-700 uppercase">¿Tiene Radiador Propio?</label>
                    </div>
                    {watchTieneRadiador && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-8 animate-in fade-in slide-in-from-left-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase">Alto (cm)</label>
                          <input type="number" step="0.1" {...register('datosMotor.radiador_alto_cm' as const, { valueAsNumber: true })} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase">Ancho (cm)</label>
                          <input type="number" step="0.1" {...register('datosMotor.radiador_ancho_cm' as const, { valueAsNumber: true })} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase">Espesor/Panal (cm)</label>
                          <input type="number" step="0.1" {...register('datosMotor.radiador_espesor_cm' as const, { valueAsNumber: true })} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SUB-SECCIÓN CARGADOR BATERÍA */}
                  <div className="md:col-span-3 border-t border-gray-50 pt-4">
                    <div className="flex items-center gap-3 mb-4">
                      <input type="checkbox" {...register('datosMotor.tiene_cargador_bateria' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                      <label className="text-sm font-black text-gray-700 uppercase">¿Tiene Cargador de Baterías?</label>
                    </div>
                    {watchTieneCargador && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-8 animate-in fade-in slide-in-from-left-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase">Marca Cargador</label>
                          <input {...register('datosMotor.marca_cargador' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase">Modelo Cargador</label>
                          <input {...register('datosMotor.modelo_cargador' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase">Amperaje (A)</label>
                          <input type="number" step="0.1" {...register('datosMotor.amperaje_cargador' as const, { valueAsNumber: true })} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Aceite Recomendado</label>
                    <input {...register('datosMotor.tipo_aceite' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: 15W40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Refrigerante Recomendado</label>
                    <input {...register('datosMotor.tipo_refrigerante' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: ELC" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Presión Aceite Mín (PSI)</label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('datosMotor.presion_aceite_minima_psi' as const, { valueAsNumber: true })}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.presion_aceite_minima_psi ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Temp. Máx Operación (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('datosMotor.temperatura_operacion_maxima_c' as const, { valueAsNumber: true })}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.temperatura_operacion_maxima_c ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      Voltaje Operación (VAC) <span className="text-red-500">*</span>
                    </label>
                    <input {...register('datosMotor.voltaje_operacion_vac' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: 220/440" />
                    <p className="text-[10px] text-blue-600 italic flex items-center gap-1">
                      <AlertCircle className="w-2 h-2" /> Obligatorio para motores eléctricos
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      Fases <span className="text-red-500">*</span>
                    </label>
                    <select {...register('datosMotor.numero_fases' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30">
                      <option value="">Seleccione fases...</option>
                      <option value="MONOFASICO">Monofásico</option>
                      <option value="TRIFASICO">Trifásico</option>
                    </select>
                    <p className="text-[10px] text-blue-600 italic flex items-center gap-1">
                      <AlertCircle className="w-2 h-2" /> Obligatorio para motores eléctricos
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Frecuencia (Hz)</label>
                    <input type="number" {...register('datosMotor.frecuencia_hz' as const, { valueAsNumber: true })} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Amperaje Nominal (A)</label>
                    <input type="number" step="0.1" {...register('datosMotor.amperaje_nominal' as const, { valueAsNumber: true })} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Clase Aislamiento</label>
                    <select {...register('datosMotor.clase_aislamiento' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30">
                      <option value="">Seleccione clase...</option>
                      <option value="A">Clase A</option>
                      <option value="B">Clase B</option>
                      <option value="F">Clase F</option>
                      <option value="H">Clase H</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Grado Prot. IP</label>
                    <input {...register('datosMotor.grado_proteccion_ip' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: IP55" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Factor Potencia (cos φ)</label>
                    <input type="number" step="0.01" {...register('datosMotor.factor_potencia' as const, { valueAsNumber: true })} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Año de Fabricación</label>
                    <input type="number" {...register('datosMotor.anio_fabricacion' as const, { valueAsNumber: true })} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
                  </div>
                  <div className="md:col-span-3 space-y-2 border-t border-gray-50 pt-4">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Observaciones del Motor</label>
                    <textarea {...register('datosMotor.observaciones' as const)} rows={2} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Detalles técnicos adicionales, historial de reparaciones mayores, etc." />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SECCIÓN ESPECÍFICA GENERADOR */}
          {tipoSeleccionado === 'GENERADOR' && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
              <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                <div className="p-3 bg-yellow-50 rounded-xl">
                  <Zap className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Datos del Generador / Alternador</h3>
                  <p className="text-gray-500 text-sm">Especificaciones eléctricas de la parte generatriz.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    Marca Generador <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('datosGenerador.marca_generador' as const)}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.marca_generador ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                  {errors.datosGenerador?.marca_generador && (
                    <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle className="w-2 h-2" /> {errors.datosGenerador.marca_generador.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Modelo Generador</label>
                  <input {...register('datosGenerador.modelo_generador' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">S/N Generador</label>
                  <input {...register('datosGenerador.numero_serie_generador' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
                </div>

                {/* CAMPOS ALTERNADOR */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Marca Alternador</label>
                  <input {...register('datosGenerador.marca_alternador' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Modelo Alternador</label>
                  <input {...register('datosGenerador.modelo_alternador' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">S/N Alternador</label>
                  <input {...register('datosGenerador.numero_serie_alternador' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Potencia (kVA)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosGenerador.potencia_kva' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.potencia_kva ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Potencia (kW)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosGenerador.potencia_kw' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.potencia_kw ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    Voltaje Salida <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('datosGenerador.voltaje_salida' as const)}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.voltaje_salida ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                    placeholder="Ej: 220/127V"
                  />
                  {errors.datosGenerador?.voltaje_salida && (
                    <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle className="w-2 h-2" /> {errors.datosGenerador.voltaje_salida.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Amperaje Nom. (A)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosGenerador.amperaje_nominal_salida' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.amperaje_nominal_salida ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Fases Salida</label>
                  <select
                    {...register('datosGenerador.numero_fases' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.numero_fases ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  >
                    <option value="">Seleccione fases...</option>
                    <option value="1">1 - Monofásico</option>
                    <option value="3">3 - Trifásico</option>
                  </select>
                  {errors.datosGenerador?.numero_fases && (
                    <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle className="w-2 h-2" /> {errors.datosGenerador.numero_fases.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Frecuencia Salida (Hz)</label>
                  <select
                    {...register('datosGenerador.frecuencia_hz' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.frecuencia_hz ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  >
                    <option value="">Seleccione Hz...</option>
                    <option value="50">50 Hz</option>
                    <option value="60">60 Hz</option>
                  </select>
                  {errors.datosGenerador?.frecuencia_hz && (
                    <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle className="w-2 h-2" /> {errors.datosGenerador.frecuencia_hz.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Factor Potencia</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('datosGenerador.factor_potencia' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.factor_potencia ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Tipo Conexión</label>
                  <input {...register('datosGenerador.tipo_conexion' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: Estrella, Delta" />
                </div>

                {/* SUB-SECCIÓN AVR */}
                <div className="md:col-span-3 border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    <input type="checkbox" {...register('datosGenerador.tiene_avr' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                    <label className="text-sm font-black text-gray-700 uppercase">¿Tiene Regulador Voltaje (AVR)?</label>
                  </div>
                  {watchTieneAVR && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-8 animate-in fade-in slide-in-from-left-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Marca AVR</label>
                        <input {...register('datosGenerador.marca_avr' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Modelo AVR</label>
                        <input {...register('datosGenerador.modelo_avr' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Ref/Parte AVR</label>
                        <input {...register('datosGenerador.referencia_avr' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* SUB-SECCIÓN MÓDULO CONTROL */}
                <div className="md:col-span-3 border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    <input type="checkbox" {...register('datosGenerador.tiene_modulo_control' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                    <label className="text-sm font-black text-gray-700 uppercase">¿Tiene Módulo de Control (DSE, COMAP...)?</label>
                  </div>
                  {watchTieneModuloControl && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-8 animate-in fade-in slide-in-from-left-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Marca Módulo</label>
                        <input {...register('datosGenerador.marca_modulo_control' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Modelo Módulo</label>
                        <input {...register('datosGenerador.modelo_modulo_control' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                      </div>
                      <div className="flex items-center gap-3 pt-6">
                        <input type="checkbox" {...register('datosGenerador.tiene_arranque_automatico' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                        <label className="text-[10px] font-black text-gray-400 uppercase">Arranque Automático</label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Tanque Principal (L)</label>
                  <input
                    type="number"
                    {...register('datosGenerador.capacidad_tanque_principal_litros' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.capacidad_tanque_principal_litros ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>

                {/* SUB-SECCIÓN TANQUE AUXILIAR */}
                <div className="md:col-span-2 border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    <input type="checkbox" {...register('datosGenerador.tiene_tanque_auxiliar' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                    <label className="text-sm font-black text-gray-700 uppercase">¿Tiene Tanque Auxiliar?</label>
                  </div>
                  {watchTieneTanqueAux && (
                    <div className="space-y-2 pl-8 animate-in fade-in slide-in-from-left-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Capacidad Auxiliar (L) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        {...register('datosGenerador.capacidad_tanque_auxiliar_litros' as const, { valueAsNumber: true })}
                        className={cn(
                          "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-white",
                          errors.datosGenerador?.capacidad_tanque_auxiliar_litros ? "border-red-500 bg-red-50/30" : "border-gray-200"
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* SUB-SECCIÓN TRANSFERENCIA */}
                <div className="md:col-span-3 border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    <input type="checkbox" {...register('datosGenerador.tiene_transferencia_automatica' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                    <label className="text-sm font-black text-gray-700 uppercase">¿Tiene Tablero de Transferencia?</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Tipo Transferencia</label>
                      <input {...register('datosGenerador.tipo_transferencia' as const)} className={cn("w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30")} placeholder="Ej: Automática, Manual" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Ubicación Transferencia</label>
                      <input {...register('datosGenerador.ubicacion_transferencia' as const)} className={cn("w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30")} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Calibre Cable Potencia</label>
                  <input {...register('datosGenerador.calibre_cable_potencia' as const)} className={cn("w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30")} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Longitud Cable (m)</label>
                  <input type="number" step="0.1" {...register('datosGenerador.longitud_cable_potencia_m' as const, { valueAsNumber: true })} className={cn("w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30")} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" {...register('datosGenerador.tiene_cabina_insonorizada' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                  <label className="text-sm font-bold text-gray-700">Cabina Insonorizada</label>
                </div>

                {/* CAMPOS TÉCNICOS ADICIONALES */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Clase Aislamiento</label>
                  <select {...register('datosGenerador.clase_aislamiento' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30">
                    <option value="">Seleccione clase...</option>
                    <option value="A">Clase A</option>
                    <option value="B">Clase B</option>
                    <option value="F">Clase F</option>
                    <option value="H">Clase H</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Grado Prot. IP</label>
                  <input {...register('datosGenerador.grado_proteccion_ip' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: IP23" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Año de Fabricación</label>
                  <input
                    type="number"
                    {...register('datosGenerador.anio_fabricacion' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.anio_fabricacion ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Observaciones Generador</label>
                  <textarea
                    {...register('datosGenerador.observaciones' as const)}
                    rows={2}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30"
                    placeholder="Detalles específicos del alternador o componentes del generador..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN ESPECÍFICA BOMBA */}
          {tipoSeleccionado === 'BOMBA' && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
              <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Droplets className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Datos de la Bomba Hidráulica</h3>
                  <p className="text-gray-500 text-sm">Especificaciones de rendimiento y conexión hidráulica.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Aplicación</label>
                  <select {...register('datosBomba.aplicacion_bomba' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30">
                    <option value="">Seleccione aplicación...</option>
                    <option value="AGUA_POTABLE">Agua Potable</option>
                    <option value="AGUAS_RESIDUALES">Aguas Residuales</option>
                    <option value="AGUAS_LLUVIAS">Aguas Lluvias</option>
                    <option value="CONTRAINCENDIOS">Contra-incendios</option>
                    <option value="INDUSTRIAL">Industrial</option>
                    <option value="PISCINA">Piscina</option>
                    <option value="RIEGO">Riego</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Potencia Hidr. (kW)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosBomba.potencia_hidraulica_kw' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.potencia_hidraulica_kw ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Eficiencia (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosBomba.eficiencia_porcentaje' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.eficiencia_porcentaje ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Marca Bomba <span className="text-red-500">*</span></label>
                  <input
                    {...register('datosBomba.marca_bomba' as const)}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.marca_bomba ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                  {errors.datosBomba?.marca_bomba && (
                    <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle className="w-2 h-2" /> {errors.datosBomba.marca_bomba.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Modelo Bomba</label>
                  <input
                    {...register('datosBomba.modelo_bomba' as const)}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.modelo_bomba ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Número de Serie Bomba</label>
                  <input
                    {...register('datosBomba.numero_serie_bomba' as const)}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.numero_serie_bomba ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    Tipo Bomba <span className="text-red-500">*</span>
                  </label>
                  <select {...register('datosBomba.tipo_bomba' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30">
                    <option value="CENTRIFUGA">Centrífuga</option>
                    <option value="SUMERGIBLE">Sumergible</option>
                    <option value="TURBINA_VERTICAL">Turbina Vertical</option>
                    <option value="MULTIETAPAS">Multietapas</option>
                    <option value="DIAFRAGMA">Diafragma</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Caudal Máx (m3/h)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosBomba.caudal_maximo_m3h' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.caudal_maximo_m3h ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Altura Máx (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosBomba.altura_manometrica_maxima_m' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.altura_manometrica_maxima_m ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Succión / Aspiración</label>
                  <input
                    {...register('datosBomba.diametro_aspiracion' as const)}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.diametro_aspiracion ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                    placeholder="Ej: 2 pulg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Descarga</label>
                  <input
                    {...register('datosBomba.diametro_descarga' as const)}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.diametro_descarga ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                    placeholder="Ej: 1.5 pulg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Altura Trabajo (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosBomba.altura_presion_trabajo_m' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.altura_presion_trabajo_m ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                    placeholder="≤ Altura Máx"
                  />
                  {errors.datosBomba?.altura_presion_trabajo_m && (
                    <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle className="w-2 h-2" /> {errors.datosBomba.altura_presion_trabajo_m.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider font-bold">Total Bombas Sistema</label>
                  <input
                    type="number"
                    {...register('datosBomba.numero_total_bombas_sistema' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.numero_total_bombas_sistema ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider font-bold">Posición Bomba (#)</label>
                  <input
                    type="number"
                    {...register('datosBomba.numero_bomba_en_sistema' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.numero_bomba_en_sistema ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                  {errors.datosBomba?.numero_bomba_en_sistema && (
                    <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle className="w-2 h-2" /> {errors.datosBomba.numero_bomba_en_sistema.message}
                    </p>
                  )}
                </div>

                {/* CONTROLES HIDRÁULICOS Y ELÉCTRICOS */}
                <div className="flex flex-col gap-6 md:col-span-3 border-t border-gray-50 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Toggles de Control */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Sistemas de Control</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" {...register('datosBomba.tiene_presostato' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                          <label className="text-sm font-bold text-gray-700">Control por Presostato</label>
                        </div>
                        {watchTienePresostato && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-left-2 pl-8">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Marca Presostato</label>
                                <input {...register('datosBomba.marca_presostato' as const)} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Modelo Presostato</label>
                                <input {...register('datosBomba.modelo_presostato' as const)} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Encendido (PSI)</label>
                                <input type="number" step="0.1" {...register('datosBomba.presion_encendido_psi' as const, { valueAsNumber: true })} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Apagado (PSI)</label>
                                <input type="number" step="0.1" {...register('datosBomba.presion_apagado_psi' as const, { valueAsNumber: true })} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                                {errors.datosBomba?.presion_apagado_psi && <p className="text-red-500 text-[9px] font-bold">{errors.datosBomba.presion_apagado_psi.message}</p>}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <input type="checkbox" {...register('datosBomba.tiene_contactor_externo' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                          <label className="text-sm font-bold text-gray-700">Contactor Externo</label>
                        </div>
                        {watchTieneContactor && (
                          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-left-2 pl-8">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase">Marca Contactor</label>
                              <input {...register('datosBomba.marca_contactor' as const)} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase">Amperaje (A)</label>
                              <input type="number" step="0.1" {...register('datosBomba.amperaje_contactor' as const, { valueAsNumber: true })} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <input type="checkbox" {...register('datosBomba.tiene_variador_frecuencia' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                          <label className="text-sm font-bold text-gray-700">Variador de Frecuencia (VFD)</label>
                        </div>
                        {watchTieneVariador && (
                          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-left-2 pl-8">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase">Marca VFD</label>
                              <input {...register('datosBomba.marca_variador' as const)} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase">Modelo VFD</label>
                              <input {...register('datosBomba.modelo_variador' as const)} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <input type="checkbox" {...register('datosBomba.tiene_arrancador_suave' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                          <label className="text-sm font-bold text-gray-700">Arrancador Suave</label>
                        </div>
                        {errors.datosBomba?.tiene_variador_frecuencia && (
                          <p className="text-red-600 text-[10px] font-bold pl-8 italic">{errors.datosBomba.tiene_variador_frecuencia.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Toggles de Instrumentación y Almacenamiento */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Almacenamiento e Inst.</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" {...register('datosBomba.tiene_tanques_hidroneumaticos' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                          <label className="text-sm font-bold text-gray-700">Tanques Hidroneumáticos</label>
                        </div>
                        {watchTieneTanquesHidro && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-left-2 pl-8">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Cantidad</label>
                                <input type="number" {...register('datosBomba.cantidad_tanques' as const, { valueAsNumber: true })} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Capacidad (L)</label>
                                <input type="number" step="0.1" {...register('datosBomba.capacidad_tanques_litros' as const, { valueAsNumber: true })} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Presión (PSI)</label>
                                <input type="number" step="0.1" {...register('datosBomba.presion_tanques_psi' as const, { valueAsNumber: true })} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <input type="checkbox" {...register('datosBomba.tiene_manometro' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                          <label className="text-sm font-bold text-gray-700">Manómetro</label>
                        </div>
                        {watchTieneManometro && (
                          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-left-2 pl-8">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase">Rango Mín (PSI)</label>
                              <input type="number" step="0.1" {...register('datosBomba.rango_manometro_min_psi' as const, { valueAsNumber: true })} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase">Rango Máx (PSI)</label>
                              <input type="number" step="0.1" {...register('datosBomba.rango_manometro_max_psi' as const, { valueAsNumber: true })} className="w-full p-2 rounded-lg border border-gray-200 bg-white" />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <input type="checkbox" {...register('datosBomba.tiene_proteccion_nivel' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                          <label className="text-sm font-bold text-gray-700">Protección de Nivel</label>
                        </div>
                        {watchTieneProteccionNivel && (
                          <div className="animate-in fade-in slide-in-from-left-2 pl-8">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase">Tipo Protección</label>
                              <input {...register('datosBomba.tipo_proteccion_nivel' as const)} className="w-full p-2 rounded-lg border border-gray-200 bg-white" placeholder="Ej: Electrodos, Flotador" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* VÁLVULAS Y ACCESORIOS */}
                <div className="md:col-span-3 border-t border-gray-50 pt-6">
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest border-l-4 border-blue-500 pl-3 mb-4">Válvulas y Accesorios</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" {...register('datosBomba.tiene_valvula_purga' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                      <label className="text-sm font-bold text-gray-700">Válvula Purga</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" {...register('datosBomba.tiene_valvula_cebado' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                      <label className="text-sm font-bold text-gray-700">Válvula Cebado</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" {...register('datosBomba.tiene_valvula_cheque' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                      <label className="text-sm font-bold text-gray-700">Válvula Cheque</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" {...register('datosBomba.tiene_valvula_pie' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                      <label className="text-sm font-bold text-gray-700">Válvula Pie</label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Referencia Sello Mecánico</label>
                  <input
                    {...register('datosBomba.referencia_sello_mecanico' as const)}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.referencia_sello_mecanico ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Año de Fabricación</label>
                  <input
                    type="number"
                    {...register('datosBomba.anio_fabricacion' as const, { valueAsNumber: true })}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.anio_fabricacion ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="md:col-span-3 border-t border-gray-50 pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <input type="checkbox" {...register('datosBomba.tiene_panel_control' as const)} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                    <label className="text-sm font-black text-gray-700 uppercase">¿Tiene Panel de Control?</label>
                  </div>
                  {watchTienePanelControl && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-8 animate-in fade-in slide-in-from-left-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Marca Panel</label>
                        <input {...register('datosBomba.marca_panel_control' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Modelo Panel</label>
                        <input {...register('datosBomba.modelo_panel_control' as const)} className="w-full p-3 rounded-xl border border-gray-200 bg-white" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="md:col-span-3 space-y-2 border-t border-gray-50 pt-4">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Observaciones de la Bomba</label>
                  <textarea
                    {...register('datosBomba.observaciones' as const)}
                    rows={2}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30"
                    placeholder="Detalles específicos del rendimiento, estado de sellos, o historial de mantenimiento hidráulico..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Sección de Configuración Personalizada */}
          {tipoSeleccionado && tipoSeleccionado !== 'MOTOR' && (
            <div className="mt-8">
              <ConfigParametrosEditor
                tipoEquipo={tipoSeleccionado}
                value={configParametros}
                onChange={setConfigParametros}
                disabled={crearEquipoMutation.isPending}
              />
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <button type="button" onClick={() => setCurrentStep(2)} className="flex items-center gap-2 px-6 py-3 text-gray-500 font-bold hover:text-gray-800 transition-colors">
              <ChevronLeft className="w-5 h-5" /> Atrás
            </button>
            <button
              type="submit"
              disabled={crearEquipoMutation.isPending}
              className="flex items-center gap-3 px-12 py-4 bg-green-600 text-white rounded-2xl font-black hover:bg-green-700 transition-all shadow-xl shadow-green-100 disabled:opacity-50"
            >
              {crearEquipoMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
              REGISTRAR EQUIPO COMPLETO
            </button>
          </div>
        </div>
      )}

      {/* Error Alert - Mejorado para 409 Conflictos */}
      {crearEquipoMutation.isError && (() => {
        const error = crearEquipoMutation.error;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosError = error as any;
        const status = axiosError?.response?.status;
        const backendMessageRaw = axiosError?.response?.data?.message;

        // ✅ FIX 27-ENE-2026: Normalizar mensaje del backend (puede ser string, array, u objeto)
        const backendMessage = typeof backendMessageRaw === 'string'
          ? backendMessageRaw
          : Array.isArray(backendMessageRaw)
            ? backendMessageRaw.join(', ')
            : JSON.stringify(backendMessageRaw);

        const isConflict = status === 409;
        const isDuplicateCode = backendMessage?.toLowerCase().includes('código');
        const isDuplicateSerial = backendMessage?.toLowerCase().includes('serie');

        return (
          <div className={`p-6 rounded-3xl flex items-start gap-4 animate-in slide-in-from-bottom-2 ${isConflict
            ? 'bg-amber-50 border-2 border-amber-300 text-amber-800'
            : 'bg-red-50 border border-red-100 text-red-700'
            }`}>
            <div className={`p-3 rounded-xl ${isConflict ? 'bg-amber-100' : 'bg-red-100'}`}>
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <p className="font-black text-lg mb-1">
                {isConflict ? '⚠️ Dato Duplicado Detectado' : 'Error en el Registro'}
              </p>
              <p className="text-sm font-medium opacity-90 mb-3">
                {backendMessage || (error instanceof Error ? error.message : 'Verifique que todos los campos obligatorios (*) estén llenos.')}
              </p>
              {isConflict && (
                <div className="bg-white/60 rounded-xl p-4 border border-amber-200">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-600 mb-2">Sugerencia:</p>
                  <ul className="text-sm space-y-1">
                    {isDuplicateCode && <li>• Modifique el <strong>Código de Equipo</strong> para que sea único.</li>}
                    {isDuplicateSerial && <li>• Verifique el <strong>Número de Serie</strong> - ya existe en el sistema.</li>}
                    {!isDuplicateCode && !isDuplicateSerial && <li>• Verifique que los identificadores únicos no estén duplicados.</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </form>
  );
}

export default EquipoForm;
