/**
 * FORMULARIO DE EQUIPO DINÁMICO - MEKANOS S.A.S
 * 
 * Formulario que cambia según el tipo de equipo seleccionado.
 * Versión: 5.3 - Strict Types & Zod Fix
 */

'use client';

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
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
  codigo_equipo: z.string().min(1, 'Código requerido').max(50),
  id_cliente: requiredNumber('Seleccione un cliente'),
  id_tipo_equipo: requiredNumber('Seleccione categoría'),
  id_sede: optionalNumber,
  nombre_equipo: z.string().max(200).optional(),
  numero_serie_equipo: z.string().max(100).optional(),
  ubicacion_texto: z.string().min(5, 'Ubicación requerida').max(1000),
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
  numero_cilindros: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().max(24, 'Máximo 24 cilindros').optional()
  ),
  voltaje_arranque_vdc: optionalNumber,
  capacidad_aceite_litros: optionalNumber,
  capacidad_refrigerante_litros: optionalNumber,
  voltaje_operacion_vac: z.string().optional(),
  frecuencia_hz: optionalNumber,
  aspiracion: z.string().optional(),
  sistema_enfriamiento: z.string().optional(),
  capacidad_baterias_ah: optionalNumber,
  cantidad_baterias: optionalNumber,
  tipo_aceite_recomendado: z.string().optional(),
  tipo_refrigerante_recomendado: z.string().optional(),
  presion_aceite_minima_psi: optionalNumber,
  temperatura_operacion_maxima_c: optionalNumber,
});

const datosGeneradorSchema = z.object({
  marca_generador: z.string().min(1, 'Marca generador requerida').max(100),
  modelo_generador: z.string().max(100).optional(),
  numero_serie_generador: z.string().max(100).optional(),
  potencia_kva: optionalNumber,
  potencia_kw_generador: optionalNumber,
  voltaje_salida: z.string().min(1, 'Voltaje salida requerido'),
  amperaje_maximo: optionalNumber,
  numero_fases: optionalNumber,
  frecuencia_hz_generador: optionalNumber,
  factor_potencia: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().max(1, 'El factor de potencia debe estar entre 0 y 1').optional()
  ),
  tipo_conexion: z.string().optional(),
  marca_avr: z.string().optional(),
  modelo_avr: z.string().optional(),
  marca_controlador: z.string().optional(),
  modelo_controlador: z.string().optional(),
  capacidad_tanque_principal_litros: optionalNumber,
  tiene_cabina_insonorizada: z.boolean(),
  tiene_transferencia_automatica: z.boolean(),
  tipo_transferencia: z.string().optional(),
  ubicacion_transferencia: z.string().optional(),
  calibre_cable_potencia: z.string().optional(),
  longitud_cable_potencia_m: optionalNumber,
});

const datosBombaSchema = z.object({
  marca_bomba: z.string().min(1, 'Marca bomba requerida').max(100),
  modelo_bomba: z.string().max(100).optional(),
  numero_serie_bomba: z.string().max(100).optional(),
  tipo_bomba: z.string().min(1, 'Tipo de bomba requerido'),
  caudal_maximo_m3h: optionalNumber,
  altura_manometrica_maxima_m: optionalNumber,
  presion_maxima_psi: optionalNumber,
  diametro_succion_pulgadas: optionalNumber,
  diametro_descarga_pulgadas: optionalNumber,
  presion_encendido_psi: optionalNumber,
  presion_apagado_psi: optionalNumber,
  material_cuerpo_bomba: z.string().optional(),
  material_impulsor: z.string().optional(),
  tipo_sello_mecanico: z.string().optional(),
  succion_positiva: z.boolean(),
  tiene_tablero_control: z.boolean(),
  marca_tablero_control: z.string().optional(),
  modelo_tablero_control: z.string().optional(),
  radiador_alto_cm: optionalNumber,
  radiador_ancho_cm: optionalNumber,
  radiador_panal_cm: optionalNumber,
});

const equipoFormSchema = z.object({
  tipo: z.enum(['GENERADOR', 'BOMBA', 'MOTOR']),
  datosEquipo: datosEquipoBaseSchema,
  datosMotor: datosMotorSchema.optional(),
  datosGenerador: datosGeneradorSchema.optional(),
  datosBomba: datosBombaSchema.optional(),
});

type EquipoFormData = z.infer<typeof equipoFormSchema>;

// 
// COMPONENTE PRINCIPAL
// 

export function EquipoForm({ onSuccess, clientePreseleccionado }: {
  onSuccess?: (data: unknown) => void,
  onCancel?: () => void,
  clientePreseleccionado?: number
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoEquipo | null>(null);

  const crearEquipoMutation = useCrearEquipo();

  // Hooks de Selectores
  const { data: clientesOptions } = useClientesSelector();
  const { data: tiposEquipoOptions, isLoading: loadingTipos } = useTiposEquipoSelector();

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
      },
    }
  });

  const { setValue, register, formState: { errors }, control, trigger, handleSubmit } = form;

  const nextStep = async (step: number) => {
    // Validar campos del paso actual antes de avanzar
    let fieldsToValidate: Path<EquipoFormData>[] = [];

    if (step === 2) {
      // Validamos TODOS los campos obligatorios y críticos del paso 2 (General)
      fieldsToValidate = [
        'datosEquipo.id_cliente',
        'datosEquipo.codigo_equipo',
        'datosEquipo.id_tipo_equipo',
        'datosEquipo.nombre_equipo',
        'datosEquipo.numero_serie_equipo',
        'datosEquipo.ubicacion_texto',
        'datosEquipo.estado_equipo',
        'datosEquipo.criticidad',
        'datosEquipo.en_garantia',
        'datosEquipo.requiere_pintura'
      ];

      // Si está en garantía, validamos campos de garantía
      if (enGarantia) {
        fieldsToValidate.push('datosEquipo.fecha_inicio_garantia');
        fieldsToValidate.push('datosEquipo.fecha_fin_garantia');
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
        setValue('datosMotor', { tipo_motor: 'COMBUSTION', marca_motor: '' });
        setValue('datosGenerador', {
          marca_generador: '',
          voltaje_salida: '220/127V',
          tiene_cabina_insonorizada: false,
          tiene_transferencia_automatica: false
        });
        setValue('datosBomba', undefined);
      } else if (tipoSeleccionado === 'BOMBA') {
        setValue('datosMotor', { tipo_motor: 'ELECTRICO', marca_motor: '' });
        setValue('datosBomba', {
          marca_bomba: '',
          tipo_bomba: 'CENTRIFUGA',
          succion_positiva: false,
          tiene_tablero_control: false
        });
        setValue('datosGenerador', undefined);
      } else {
        setValue('datosMotor', { tipo_motor: 'COMBUSTION', marca_motor: '' });
        setValue('datosGenerador', undefined);
        setValue('datosBomba', undefined);
      }
    }
  }, [tipoSeleccionado, setValue, tiposEquipoOptions]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFormSubmit = async (data: any) => {
    console.log('Intentando registrar equipo:', data);
    try {
      const result = await crearEquipoMutation.mutateAsync(data as CreateEquipoPayload);
      console.log('Resultado registro:', result);
      if (result.success && onSuccess) {
        onSuccess(result.data);
      } else if (!result.success) {
        // Si el backend devuelve un error estructurado
        const errorMsg = result.error || 'Error desconocido al registrar el equipo';
        alert(`ERROR DEL SERVIDOR: ${errorMsg}`);
      }
    } catch (error: unknown) {
      console.error('Error en mutación:', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      const apiError = err?.response?.data?.message;
      const detailedError = Array.isArray(apiError) ? apiError.join('\n') : apiError;
      alert(`ERROR DE RED/SERVIDOR:\n${detailedError || err.message || 'Error inesperado'}`);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onInvalid = (errs: any) => {
    console.error('ERRORES DE VALIDACIÓN DETECTADOS:', errs);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit as never, onInvalid as never)} className="space-y-8 max-w-5xl mx-auto p-4">
      {/* Debug info - Solo visible en desarrollo si se desea */}
      {Object.keys(errors).length > 0 && (
        <div className="p-6 bg-red-50 border-2 border-red-200 rounded-3xl text-red-800 shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="font-black text-lg uppercase tracking-tight">Errores de Validación Detectados</p>
          </div>
          <ul className="space-y-2">
            {Object.entries(errors).map(([key, value]) => {
              if (key === 'datosEquipo' && typeof value === 'object') {
                return Object.entries(value as object).map(([subKey, subValue]) => (
                  <li key={`${key}.${subKey}`} className="flex items-center gap-2 text-sm font-bold bg-white/50 p-2 rounded-lg border border-red-100">
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-red-400 uppercase text-[10px] font-black">{subKey}:</span>
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
              <div>
                <h2 className="text-2xl font-black text-gray-900">Información de Identificación</h2>
                <p className="text-gray-500 text-sm">Datos básicos y ubicación del equipo en las instalaciones.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Cliente Selector */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-1">
                  Cliente Propietario <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('datosEquipo.id_cliente')}
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50",
                    errors.datosEquipo?.id_cliente ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                >
                  <option value="">Seleccione un cliente...</option>
                  {clientesOptions?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
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
                  {...register('datosEquipo.id_sede')}
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
                <input
                  {...register('datosEquipo.codigo_equipo')}
                  placeholder="Ej: MEK-GEN-001"
                  className={cn(
                    "w-full p-4 rounded-2xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/50 uppercase font-mono",
                    errors.datosEquipo?.codigo_equipo ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                />
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
                  {...register('datosEquipo.id_tipo_equipo')}
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
                  Nombre / Alias <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('datosEquipo.nombre_equipo')}
                  placeholder="Ej: Planta de Emergencia Principal"
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
                  Número de Serie (Chasis) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('datosEquipo.numero_serie_equipo')}
                  placeholder="S/N del equipo completo"
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
                  {...register('datosEquipo.ubicacion_texto')}
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
                  {...register('datosEquipo.estado_equipo')}
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
                  {...register('datosEquipo.criticidad')}
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
                  {...register('datosEquipo.criticidad_justificacion')}
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
                  {...register('datosEquipo.fecha_instalacion')}
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
                  {...register('datosEquipo.fecha_inicio_servicio_mekanos')}
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
                  {...register('datosEquipo.tipo_contrato')}
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
                <input type="checkbox" {...register('datosEquipo.en_garantia')} className="w-6 h-6 rounded-lg border-gray-300 text-blue-600" />
                <label className="text-sm font-black text-gray-700">¿Está en Garantía?</label>
              </div>

              {enGarantia && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Fin Garantía</label>
                    <input
                      type="date"
                      {...register('datosEquipo.fecha_fin_garantia')}
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
                      {...register('datosEquipo.proveedor_garantia')}
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
                  {...register('datosEquipo.estado_pintura')}
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
                <input type="checkbox" {...register('datosEquipo.requiere_pintura')} className="w-6 h-6 rounded-lg border-gray-300 text-blue-600" />
                <label className="text-sm font-black text-gray-700">Requiere Pintura</label>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Horas Actuales</label>
                <input
                  type="number"
                  {...register('datosEquipo.horas_actuales')}
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
                    {...register('datosEquipo.intervalo_tipo_a_dias_override')}
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
                    {...register('datosEquipo.intervalo_tipo_a_horas_override')}
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
                  <select {...register('datosEquipo.criterio_intervalo_override')} className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50/50">
                    <option value="DIAS">Días</option>
                    <option value="HORAS">Horas</option>
                    <option value="LO_QUE_OCURRA_PRIMERO">Lo que ocurra primero</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-3 space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Observaciones Generales</label>
                <textarea {...register('datosEquipo.observaciones_generales')} rows={2} className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50/50" />
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
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Tipo Motor</label>
                <select {...register('datosMotor.tipo_motor')} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30">
                  <option value="COMBUSTION">Combustión Interna</option>
                  <option value="ELECTRICO">Motor Eléctrico</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  Marca Motor <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('datosMotor.marca_motor')}
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
                <input {...register('datosMotor.modelo_motor')} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Número de Serie Motor</label>
                <input {...register('datosMotor.numero_serie_motor')} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Potencia (HP)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('datosMotor.potencia_hp')}
                  className={cn(
                    "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                    errors.datosMotor?.potencia_hp ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
                />
                {errors.datosMotor?.potencia_hp && (
                  <p className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                    <AlertCircle className="w-2 h-2" /> {errors.datosMotor.potencia_hp.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Potencia (kW)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('datosMotor.potencia_kw')}
                  className={cn(
                    "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                    errors.datosMotor?.potencia_kw ? "border-red-500 bg-red-50/30" : "border-gray-200"
                  )}
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
                  {...register('datosMotor.velocidad_nominal_rpm')}
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
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Combustible</label>
                    <select {...register('datosMotor.tipo_combustible')} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30">
                      <option value="DIESEL">Diesel</option>
                      <option value="GASOLINA">Gasolina</option>
                      <option value="GAS_NATURAL">Gas Natural</option>
                      <option value="GLP">GLP</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Cilindros</label>
                    <input
                      type="number"
                      {...register('datosMotor.numero_cilindros')}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.numero_cilindros ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Voltaje Arranque (VDC)</label>
                    <input
                      type="number"
                      {...register('datosMotor.voltaje_arranque_vdc')}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.voltaje_arranque_vdc ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Capacidad Aceite (L)</label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('datosMotor.capacidad_aceite_litros')}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.capacidad_aceite_litros ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Capacidad Refrig. (L)</label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('datosMotor.capacidad_refrigerante_litros')}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.capacidad_refrigerante_litros ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Aspiración</label>
                    <input {...register('datosMotor.aspiracion')} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: Natural, Turbo" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Sistema Enfriamiento</label>
                    <input {...register('datosMotor.sistema_enfriamiento')} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: Radiador, Intercambiador" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Capacidad Baterías (Ah)</label>
                    <input
                      type="number"
                      {...register('datosMotor.capacidad_baterias_ah')}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.capacidad_baterias_ah ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Cantidad Baterías</label>
                    <input
                      type="number"
                      {...register('datosMotor.cantidad_baterias')}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.cantidad_baterias ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Aceite Recomendado</label>
                    <input {...register('datosMotor.tipo_aceite_recomendado')} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: 15W40" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Refrigerante Recomendado</label>
                    <input {...register('datosMotor.tipo_refrigerante_recomendado')} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Presión Aceite Mín (PSI)</label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('datosMotor.presion_aceite_minima_psi')}
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
                      {...register('datosMotor.temperatura_operacion_maxima_c')}
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
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Voltaje Operación (VAC)</label>
                    <input {...register('datosMotor.voltaje_operacion_vac')} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: 220/440" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Frecuencia (Hz)</label>
                    <input
                      type="number"
                      {...register('datosMotor.frecuencia_hz')}
                      className={cn(
                        "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                        errors.datosMotor?.frecuencia_hz ? "border-red-500 bg-red-50/30" : "border-gray-200"
                      )}
                    />
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
                    {...register('datosGenerador.marca_generador')}
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
                  <input {...register('datosGenerador.modelo_generador')} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Potencia (kVA)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosGenerador.potencia_kva')}
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
                    {...register('datosGenerador.potencia_kw_generador')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.potencia_kw_generador ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    Voltaje Salida <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('datosGenerador.voltaje_salida')}
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
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Amperaje Máx.</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosGenerador.amperaje_maximo')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.amperaje_maximo ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Fases</label>
                  <select
                    {...register('datosGenerador.numero_fases')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.numero_fases ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  >
                    <option value={1}>Monofásico</option>
                    <option value={2}>Bifásico</option>
                    <option value={3}>Trifásico</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Frecuencia (Hz)</label>
                  <input
                    type="number"
                    {...register('datosGenerador.frecuencia_hz_generador')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.frecuencia_hz_generador ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Factor Potencia</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('datosGenerador.factor_potencia')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.factor_potencia ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Tipo Conexión</label>
                  <input {...register('datosGenerador.tipo_conexion')} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30" placeholder="Ej: Estrella, Delta" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Marca AVR</label>
                  <input
                    {...register('datosGenerador.marca_avr')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.marca_avr ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Modelo AVR</label>
                  <input
                    {...register('datosGenerador.modelo_avr')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.modelo_avr ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Marca Controlador</label>
                  <input
                    {...register('datosGenerador.marca_controlador')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.marca_controlador ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Modelo Controlador</label>
                  <input
                    {...register('datosGenerador.modelo_controlador')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.modelo_controlador ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Tanque Comb. (L)</label>
                  <input
                    type="number"
                    {...register('datosGenerador.capacidad_tanque_principal_litros')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.capacidad_tanque_principal_litros ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Tipo Transferencia</label>
                  <input
                    {...register('datosGenerador.tipo_transferencia')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.tipo_transferencia ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Ubicación Transferencia</label>
                  <input
                    {...register('datosGenerador.ubicacion_transferencia')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.ubicacion_transferencia ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Calibre Cable Potencia</label>
                  <input
                    {...register('datosGenerador.calibre_cable_potencia')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.calibre_cable_potencia ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Longitud Cable (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosGenerador.longitud_cable_potencia_m')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosGenerador?.longitud_cable_potencia_m ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" {...register('datosGenerador.tiene_cabina_insonorizada')} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                  <label className="text-sm font-bold text-gray-700">Cabina Insonorizada</label>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" {...register('datosGenerador.tiene_transferencia_automatica')} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                  <label className="text-sm font-bold text-gray-700">Transferencia Auto.</label>
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
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    Marca Bomba <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('datosBomba.marca_bomba')}
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
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Tipo Bomba</label>
                  <select {...register('datosBomba.tipo_bomba')} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/30">
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
                    {...register('datosBomba.caudal_maximo_m3h')}
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
                    {...register('datosBomba.altura_manometrica_maxima_m')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.altura_manometrica_maxima_m ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Presión Máx (PSI)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosBomba.presion_maxima_psi')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.presion_maxima_psi ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Succión (pulg)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosBomba.diametro_succion_pulgadas')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.diametro_succion_pulgadas ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Descarga (pulg)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosBomba.diametro_descarga_pulgadas')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.diametro_descarga_pulgadas ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Presión Encendido (PSI)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosBomba.presion_encendido_psi')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.presion_encendido_psi ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Presión Apagado (PSI)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('datosBomba.presion_apagado_psi')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.presion_apagado_psi ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Material Cuerpo</label>
                  <input
                    {...register('datosBomba.material_cuerpo_bomba')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.material_cuerpo_bomba ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Material Impulsor</label>
                  <input
                    {...register('datosBomba.material_impulsor')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.material_impulsor ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Tipo Sello Mecánico</label>
                  <input
                    {...register('datosBomba.tipo_sello_mecanico')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.tipo_sello_mecanico ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Marca Tablero Control</label>
                  <input
                    {...register('datosBomba.marca_tablero_control')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.marca_tablero_control ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Modelo Tablero Control</label>
                  <input
                    {...register('datosBomba.modelo_tablero_control')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.modelo_tablero_control ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Radiador Alto (cm)</label>
                  <input
                    type="number"
                    {...register('datosBomba.radiador_alto_cm')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.radiador_alto_cm ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Radiador Ancho (cm)</label>
                  <input
                    type="number"
                    {...register('datosBomba.radiador_ancho_cm')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.radiador_ancho_cm ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Radiador Panal (cm)</label>
                  <input
                    type="number"
                    {...register('datosBomba.radiador_panal_cm')}
                    className={cn(
                      "w-full p-3 rounded-xl border focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-gray-50/30",
                      errors.datosBomba?.radiador_panal_cm ? "border-red-500 bg-red-50/30" : "border-gray-200"
                    )}
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" {...register('datosBomba.succion_positiva')} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                  <label className="text-sm font-bold text-gray-700">Succión Positiva</label>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" {...register('datosBomba.tiene_tablero_control')} className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                  <label className="text-sm font-bold text-gray-700">Tiene Tablero Control</label>
                </div>
              </div>
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

      {/* Error Alert */}
      {crearEquipoMutation.isError && (
        <div className="p-6 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-4 text-red-700 animate-in shake-1">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="font-black text-lg">Error en el Registro</p>
            <p className="text-sm font-medium opacity-80">
              {crearEquipoMutation.error instanceof Error ? crearEquipoMutation.error.message : 'Verifique que todos los campos obligatorios (*) estén llenos y que el código de equipo no esté duplicado.'}
            </p>
          </div>
        </div>
      )}
    </form>
  );
}

export default EquipoForm;
