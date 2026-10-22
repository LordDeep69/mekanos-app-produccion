/**
 * EXPEDIENTE 360° DE ACTIVO INDUSTRIAL (EAM) - MEKANOS S.A.S
 * Ruta: /equipos/[id]
 *
 * Arquitectura EAM 360° (Estándar SAP PM / Maximo):
 * - Cabecera institucional con vínculo directo a /clientes/[id] y creación rápida de OT
 * - 4 KPIs ejecutivos en vivo (Horómetro, Intervenciones OTs, Kit BOM, Inversión Repuestos WMS)
 * - Navegación estructurada en 3 pestañas:
 *   1. Ingeniería & Ficha Técnica (con tarjeta destacada de Fluidos, Lubricación y Baterías)
 *   2. Repuestos Compatibles (BOM) & Consumo WMS (conectado en vivo con Catálogo e Inventario)
 *   3. Historial de Órdenes de Servicio (OTs) & Hoja de Vida Técnica
 */

'use client';

import {
  EquipoRepuestosTab,
  HojaVidaEquipo,
  useCambiarEstadoEquipo,
  useEquipo,
  useFichaLogisticaEquipo,
  useRegistrarLecturaHorometro,
} from '@/features/equipos';
import { cn, formatDateSafe } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BatteryCharging,
  Boxes,
  Building2,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  DollarSign,
  Droplets,
  Edit,
  ExternalLink,
  FileText,
  Fuel,
  Gauge,
  History,
  Layers,
  Loader2,
  MapPin,
  PackageCheck,
  PaintBucket,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Timer,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

function TipoBadge({ tipo }: { tipo: string }) {
  const config: Record<string, { icon: typeof Zap; color: string; label: string }> = {
    GENERADOR: {
      icon: Zap,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      label: 'Generador',
    },
    BOMBA: {
      icon: Droplets,
      color: 'bg-blue-50 text-blue-800 border-blue-200',
      label: 'Bomba',
    },
    MOTOR: {
      icon: Settings,
      color: 'bg-violet-50 text-violet-800 border-violet-200',
      label: 'Motor',
    },
    COMPRESOR: {
      icon: Wind,
      color: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      label: 'Compresor',
    },
  };
  const { icon: Icon, color, label } = config[tipo] || {
    icon: Zap,
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    label: tipo,
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap',
        color,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    OPERATIVO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    STANDBY: 'bg-blue-50 text-blue-700 border-blue-200',
    INACTIVO: 'bg-slate-100 text-slate-600 border-slate-200',
    EN_REPARACION: 'bg-amber-50 text-amber-800 border-amber-200',
    FUERA_SERVICIO: 'bg-rose-50 text-rose-700 border-rose-200',
    BAJA: 'bg-slate-200 text-slate-500 border-slate-300',
  };
  const labels: Record<string, string> = {
    OPERATIVO: 'Operativo',
    STANDBY: 'Standby',
    INACTIVO: 'Inactivo',
    EN_REPARACION: 'En Reparación',
    FUERA_SERVICIO: 'Fuera de Servicio',
    BAJA: 'Baja',
  };
  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap',
        colors[estado] || 'bg-slate-100 border-slate-200',
      )}
    >
      {labels[estado] || estado}
    </span>
  );
}

function CriticidadBadge({ criticidad }: { criticidad: string }) {
  const config: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    BAJA: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-blue-500' },
    MEDIA: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
    ALTA: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500' },
    CRITICA: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-600' },
  };
  const { bg, text, border, dot } = config[criticidad] || config.MEDIA;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap',
        bg,
        text,
        border,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      Criticidad {criticidad}
    </span>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Zap;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60 rounded-t-xl">
        <Icon className="h-4 w-4 text-slate-500" />
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0 gap-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-900 text-right">{value || '—'}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL: CAMBIAR ESTADO
// ═══════════════════════════════════════════════════════════════════════════════
const ESTADOS_EQUIPO = [
  { value: 'OPERATIVO', label: 'Operativo', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { value: 'STANDBY', label: 'Standby', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  { value: 'INACTIVO', label: 'Inactivo', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'EN_REPARACION', label: 'En Reparación', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'FUERA_SERVICIO', label: 'Fuera de Servicio', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  { value: 'BAJA', label: 'Baja', color: 'bg-slate-200 text-slate-600 border-slate-300' },
];

function ModalCambiarEstado({
  isOpen,
  onClose,
  equipoId,
  estadoActual,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  equipoId: number;
  estadoActual: string;
  onSuccess: () => void;
}) {
  const [nuevoEstado, setNuevoEstado] = useState(estadoActual);
  const [motivo, setMotivo] = useState('');
  const cambiarEstado = useCambiarEstadoEquipo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevoEstado === estadoActual) {
      onClose();
      return;
    }
    try {
      await cambiarEstado.mutateAsync({
        id: equipoId,
        nuevo_estado: nuevoEstado,
        motivo_cambio: motivo || undefined,
      });
      onSuccess();
      onClose();
      setMotivo('');
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Cambiar Estado Operativo</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Nuevo Estado</label>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS_EQUIPO.map((estado) => (
                <button
                  key={estado.value}
                  type="button"
                  onClick={() => setNuevoEstado(estado.value)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                    nuevoEstado === estado.value
                      ? 'border-blue-600 ring-2 ring-blue-100'
                      : 'border-slate-200',
                    estado.color,
                  )}
                >
                  {estado.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo del cambio <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe el motivo técnico o administrativo del cambio..."
            />
          </div>
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cambiarEstado.isPending || nuevoEstado === estadoActual}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {cambiarEstado.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Estado'
              )}
            </button>
          </div>
          {cambiarEstado.isError && (
            <p className="text-xs text-rose-600 text-center">
              Error: {(cambiarEstado.error as Error)?.message || 'No se pudo cambiar el estado'}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL: REGISTRAR LECTURA HORÓMETRO
// ═══════════════════════════════════════════════════════════════════════════════
function ModalRegistrarLectura({
  isOpen,
  onClose,
  equipoId,
  horasActuales,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  equipoId: number;
  horasActuales: number;
  onSuccess: () => void;
}) {
  const [horas, setHoras] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const registrarLectura = useRegistrarLecturaHorometro();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const horasNum = parseFloat(horas);
    if (isNaN(horasNum) || horasNum < horasActuales) {
      return;
    }
    try {
      await registrarLectura.mutateAsync({
        id: equipoId,
        horas_lectura: horasNum,
        observaciones: observaciones || undefined,
      });
      onSuccess();
      onClose();
      setHoras('');
      setObservaciones('');
    } catch (err) {
      console.error('Error al registrar lectura:', err);
    }
  };

  if (!isOpen) return null;

  const horasNum = parseFloat(horas);
  const esValido = !isNaN(horasNum) && horasNum >= horasActuales;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Registrar Lectura de Horómetro</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700">Lectura actual acumulada:</span>
            <span className="font-mono font-bold text-sm text-blue-900">
              {horasActuales.toLocaleString()} hrs
            </span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nueva Lectura (hrs)
            </label>
            <input
              type="number"
              step="0.01"
              min={horasActuales}
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              className={cn(
                'w-full px-3 py-2 text-sm font-mono border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                horas && !esValido ? 'border-rose-300 bg-rose-50' : 'border-slate-300',
              )}
              placeholder={`Mínimo ${horasActuales} hrs`}
              required
            />
            {horas && !esValido && (
              <p className="text-xs text-rose-600 mt-1">
                La nueva lectura no puede ser inferior a las horas actuales ({horasActuales} hrs)
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observaciones <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Lectura tomada durante visita técnica preventiva..."
            />
          </div>
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={registrarLectura.isPending || !esValido}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {registrarLectura.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Guardar Lectura
                </>
              )}
            </button>
          </div>
          {registrarLectura.isError && (
            <p className="text-xs text-rose-600 text-center">
              Error: {(registrarLectura.error as Error)?.message || 'No se pudo registrar la lectura'}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FICHAS TÉCNICAS ESPECÍFICAS POR TIPO DE EQUIPO
// ═══════════════════════════════════════════════════════════════════════════════

function FichaTecnicaGenerador({ datos, motor }: { datos: any; motor: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <InfoCard title="Datos del Generador" icon={Zap}>
        <DataRow label="Marca" value={datos?.marca_generador} />
        <DataRow label="Modelo" value={datos?.modelo_generador} />
        <DataRow label="Serie" value={datos?.numero_serie_generador} />
        <DataRow label="Potencia kVA" value={datos?.potencia_kva ? `${datos.potencia_kva} kVA` : null} />
        <DataRow label="Potencia kW" value={datos?.potencia_kw ? `${datos.potencia_kw} kW` : null} />
        <DataRow label="Factor Potencia" value={datos?.factor_potencia ? `${datos.factor_potencia} cos φ` : null} />
        <DataRow label="Voltaje Salida" value={datos?.voltaje_salida} />
        <DataRow
          label="Amperaje Nominal"
          value={datos?.amperaje_nominal_salida ? `${datos.amperaje_nominal_salida} A` : null}
        />
        <DataRow
          label="Fases"
          value={
            datos?.numero_fases === 1
              ? 'Monofásico'
              : datos?.numero_fases === 3
                ? 'Trifásico'
                : datos?.numero_fases
          }
        />
        <DataRow label="Frecuencia" value={datos?.frecuencia_hz ? `${datos.frecuencia_hz} Hz` : null} />
        <DataRow label="Tipo Conexión" value={datos?.tipo_conexion} />
        <DataRow label="Año Fabricación" value={datos?.a_o_fabricacion} />
      </InfoCard>

      <InfoCard title="Alternador & Regulación (AVR)" icon={Gauge}>
        <DataRow label="Marca Alternador" value={datos?.marca_alternador} />
        <DataRow label="Modelo Alternador" value={datos?.modelo_alternador} />
        <DataRow label="Serie Alternador" value={datos?.numero_serie_alternador} />
        <DataRow label="Clase Aislamiento" value={datos?.clase_aislamiento} />
        <DataRow label="Grado Protección IP" value={datos?.grado_proteccion_ip} />
        <DataRow label="Tiene AVR" value={datos?.tiene_avr ? 'Sí' : 'No'} />
        {datos?.tiene_avr && (
          <>
            <DataRow label="Marca AVR" value={datos?.marca_avr} />
            <DataRow label="Modelo AVR" value={datos?.modelo_avr} />
            <DataRow label="Referencia AVR" value={datos?.referencia_avr} />
          </>
        )}
      </InfoCard>

      {motor && (
        <InfoCard title="Motor Primario (Combustión / Impulsor)" icon={Fuel}>
          <DataRow label="Tipo Motor" value={motor.tipo_motor} />
          <DataRow label="Marca" value={motor.marca_motor} />
          <DataRow label="Modelo" value={motor.modelo_motor} />
          <DataRow label="Serie" value={motor.numero_serie_motor} />
          <DataRow label="Potencia HP" value={motor.potencia_hp ? `${motor.potencia_hp} HP` : null} />
          <DataRow label="Potencia kW" value={motor.potencia_kw ? `${motor.potencia_kw} kW` : null} />
          <DataRow label="RPM" value={motor.velocidad_nominal_rpm ? `${motor.velocidad_nominal_rpm} RPM` : null} />
          <DataRow label="Combustible" value={motor.tipo_combustible} />
          <DataRow label="Cilindros" value={motor.numero_cilindros} />
          <DataRow label="Cilindrada (cc)" value={motor.cilindrada_cc} />
          <DataRow
            label="Voltaje Arranque"
            value={motor.voltaje_arranque_vdc ? `${motor.voltaje_arranque_vdc} VDC` : null}
          />
          <DataRow
            label="Amperaje Arranque"
            value={motor.amperaje_arranque ? `${motor.amperaje_arranque} CCA` : null}
          />
          <DataRow label="Tipo Arranque" value={motor.tipo_arranque} />
          <DataRow label="Turbocargador" value={motor.tiene_turbocargador ? 'Sí' : 'No'} />
          <DataRow
            label="Capacidad Aceite"
            value={motor.capacidad_aceite_litros ? `${motor.capacidad_aceite_litros} L` : null}
          />
          <DataRow
            label="Capacidad Refrigerante"
            value={motor.capacidad_refrigerante_litros ? `${motor.capacidad_refrigerante_litros} L` : null}
          />
          <DataRow label="Tipo Aceite" value={motor.tipo_aceite} />
          <DataRow label="Tipo Refrigerante" value={motor.tipo_refrigerante} />
          <DataRow label="Baterías" value={motor.numero_baterias} />
          <DataRow label="Referencia Batería" value={motor.referencia_bateria} />
          <DataRow
            label="Capacidad Batería"
            value={motor.capacidad_bateria_ah ? `${motor.capacidad_bateria_ah} Ah` : null}
          />
          <DataRow label="Tiene Radiador" value={motor.tiene_radiador ? 'Sí' : 'No'} />
          {motor.tiene_radiador && (
            <>
              <DataRow
                label="Dimensiones Radiador"
                value={
                  motor.radiador_alto_cm || motor.radiador_ancho_cm
                    ? `${motor.radiador_alto_cm || '—'} × ${motor.radiador_ancho_cm || '—'} × ${motor.radiador_espesor_cm || '—'} cm`
                    : null
                }
              />
            </>
          )}
          <DataRow label="Cargador Batería" value={motor.tiene_cargador_bateria ? 'Sí' : 'No'} />
          {motor.tiene_cargador_bateria && (
            <>
              <DataRow label="Marca / Modelo Cargador" value={`${motor.marca_cargador || ''} ${motor.modelo_cargador || ''}`.trim() || null} />
              <DataRow
                label="Amperaje Cargador"
                value={motor.amperaje_cargador ? `${motor.amperaje_cargador} A` : null}
              />
            </>
          )}
          <DataRow label="Observaciones Motor" value={motor.observaciones} />
        </InfoCard>
      )}

      <InfoCard title="Control, Tanques y Transferencia" icon={Settings}>
        <DataRow label="Módulo Control" value={datos?.tiene_modulo_control ? 'Sí' : 'No'} />
        {datos?.tiene_modulo_control && (
          <>
            <DataRow label="Marca Módulo" value={datos?.marca_modulo_control} />
            <DataRow label="Modelo Módulo" value={datos?.modelo_modulo_control} />
          </>
        )}
        <DataRow label="Arranque Automático" value={datos?.tiene_arranque_automatico ? 'Sí' : 'No'} />
        <DataRow
          label="Tanque Principal"
          value={
            datos?.capacidad_tanque_principal_litros ? `${datos.capacidad_tanque_principal_litros} L` : null
          }
        />
        <DataRow
          label="Tanque Auxiliar"
          value={datos?.tiene_tanque_auxiliar ? `${datos.capacidad_tanque_auxiliar_litros || '—'} L` : 'No'}
        />
        <DataRow label="Cabina Insonorizada" value={datos?.tiene_cabina_insonorizada ? 'Sí' : 'No'} />
        <DataRow
          label="Transferencia Automática"
          value={datos?.tiene_transferencia_automatica ? 'Sí' : 'No'}
        />
        {datos?.tiene_transferencia_automatica && (
          <>
            <DataRow label="Tipo Transferencia" value={datos?.tipo_transferencia} />
            <DataRow label="Ubicación Transferencia" value={datos?.ubicacion_transferencia} />
          </>
        )}
        <DataRow label="Calibre Cable Potencia" value={datos?.calibre_cable_potencia} />
        <DataRow
          label="Longitud Cable"
          value={datos?.longitud_cable_potencia_m ? `${datos.longitud_cable_potencia_m} m` : null}
        />
        <DataRow label="Observaciones Generador" value={datos?.observaciones} />
      </InfoCard>
    </div>
  );
}

function FichaTecnicaBomba({ datos, motor }: { datos: any; motor: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <InfoCard title="Datos Hidráulicos de la Bomba" icon={Droplets}>
        <DataRow label="Marca" value={datos?.marca_bomba} />
        <DataRow label="Modelo" value={datos?.modelo_bomba} />
        <DataRow label="Serie" value={datos?.numero_serie_bomba} />
        <DataRow label="Tipo Bomba" value={datos?.tipo_bomba} />
        <DataRow label="Aplicación" value={datos?.aplicacion_bomba} />
        <DataRow label="Año Fabricación" value={datos?.a_o_fabricacion} />
        <DataRow label="Caudal Máximo" value={datos?.caudal_maximo_m3h ? `${datos.caudal_maximo_m3h} m³/h` : null} />
        <DataRow
          label="Altura Manométrica Máx"
          value={datos?.altura_manometrica_maxima_m ? `${datos.altura_manometrica_maxima_m} m` : null}
        />
        <DataRow
          label="Altura Presión Trabajo"
          value={datos?.altura_presion_trabajo_m ? `${datos.altura_presion_trabajo_m} m` : null}
        />
        <DataRow
          label="Potencia Hidráulica"
          value={datos?.potencia_hidraulica_kw ? `${datos.potencia_hidraulica_kw} kW` : null}
        />
        <DataRow label="Eficiencia" value={datos?.eficiencia_porcentaje ? `${datos.eficiencia_porcentaje}%` : null} />
        <DataRow label="Diámetro Succión" value={datos?.diametro_aspiracion} />
        <DataRow label="Diámetro Descarga" value={datos?.diametro_descarga} />
        <DataRow label="Sello Mecánico" value={datos?.referencia_sello_mecanico} />
        <DataRow
          label="Bombas en Sistema"
          value={`${datos?.numero_bomba_en_sistema || 1} de ${datos?.numero_total_bombas_sistema || 1}`}
        />
        <DataRow label="Observaciones Bomba" value={datos?.observaciones} />
      </InfoCard>

      <InfoCard title="Presiones y Tablero de Control" icon={Gauge}>
        <DataRow label="Panel de Control" value={datos?.tiene_panel_control ? 'Sí' : 'No'} />
        {datos?.tiene_panel_control && (
          <>
            <DataRow label="Marca Panel" value={datos?.marca_panel_control} />
            <DataRow label="Modelo Panel" value={datos?.modelo_panel_control} />
          </>
        )}
        <DataRow label="Presostato" value={datos?.tiene_presostato ? 'Sí' : 'No'} />
        {datos?.tiene_presostato && (
          <>
            <DataRow label="Marca Presostato" value={datos?.marca_presostato} />
            <DataRow label="Modelo Presostato" value={datos?.modelo_presostato} />
            <DataRow
              label="Presión Encendido"
              value={datos?.presion_encendido_psi ? `${datos.presion_encendido_psi} PSI` : null}
            />
            <DataRow
              label="Presión Apagado"
              value={datos?.presion_apagado_psi ? `${datos.presion_apagado_psi} PSI` : null}
            />
          </>
        )}
        <DataRow label="Variador de Frecuencia" value={datos?.tiene_variador_frecuencia ? 'Sí' : 'No'} />
        {datos?.tiene_variador_frecuencia && (
          <>
            <DataRow label="Marca VFD" value={datos?.marca_variador} />
            <DataRow label="Modelo VFD" value={datos?.modelo_variador} />
          </>
        )}
        <DataRow label="Arrancador Suave" value={datos?.tiene_arrancador_suave ? 'Sí' : 'No'} />
        <DataRow label="Contactor Externo" value={datos?.tiene_contactor_externo ? 'Sí' : 'No'} />
        {datos?.tiene_contactor_externo && (
          <>
            <DataRow label="Marca Contactor" value={datos?.marca_contactor} />
            <DataRow
              label="Amperaje Contactor"
              value={datos?.amperaje_contactor ? `${datos.amperaje_contactor} A` : null}
            />
          </>
        )}
      </InfoCard>

      <InfoCard title="Sistema Hidroneumático & Válvulas" icon={Settings}>
        <DataRow label="Tanques Hidroneumáticos" value={datos?.tiene_tanques_hidroneumaticos ? 'Sí' : 'No'} />
        {datos?.tiene_tanques_hidroneumaticos && (
          <>
            <DataRow label="Cantidad Tanques" value={datos?.cantidad_tanques} />
            <DataRow
              label="Capacidad Tanques"
              value={datos?.capacidad_tanques_litros ? `${datos.capacidad_tanques_litros} L` : null}
            />
            <DataRow
              label="Presión Tanques"
              value={datos?.presion_tanques_psi ? `${datos.presion_tanques_psi} PSI` : null}
            />
          </>
        )}
        <DataRow label="Manómetro" value={datos?.tiene_manometro ? 'Sí' : 'No'} />
        {datos?.tiene_manometro && (
          <>
            <DataRow
              label="Rango Manómetro"
              value={`${datos?.rango_manometro_min_psi || 0} - ${datos?.rango_manometro_max_psi || '—'} PSI`}
            />
          </>
        )}
        <DataRow label="Protección de Nivel" value={datos?.tiene_proteccion_nivel ? 'Sí' : 'No'} />
        <DataRow label="Válvula de Purga" value={datos?.tiene_valvula_purga ? 'Sí' : 'No'} />
        <DataRow label="Válvula de Cebado" value={datos?.tiene_valvula_cebado ? 'Sí' : 'No'} />
        <DataRow label="Válvula de Cheque" value={datos?.tiene_valvula_cheque ? 'Sí' : 'No'} />
        <DataRow label="Válvula de Pie" value={datos?.tiene_valvula_pie ? 'Sí' : 'No'} />
      </InfoCard>

      {motor && (
        <InfoCard title="Motor Impulsor" icon={Zap}>
          <DataRow label="Tipo Motor" value={motor.tipo_motor} />
          <DataRow label="Marca" value={motor.marca_motor} />
          <DataRow label="Modelo" value={motor.modelo_motor} />
          <DataRow label="Serie" value={motor.numero_serie_motor} />
          <DataRow label="Potencia HP" value={motor.potencia_hp ? `${motor.potencia_hp} HP` : null} />
          <DataRow label="Potencia kW" value={motor.potencia_kw ? `${motor.potencia_kw} kW` : null} />
          <DataRow label="RPM" value={motor.velocidad_nominal_rpm ? `${motor.velocidad_nominal_rpm} RPM` : null} />
          <DataRow label="Voltaje" value={motor.voltaje_operacion_vac} />
          <DataRow
            label="Fases"
            value={
              motor.numero_fases === 'MONOFASICO'
                ? 'Monofásico'
                : motor.numero_fases === 'TRIFASICO'
                  ? 'Trifásico'
                  : motor.numero_fases
            }
          />
          <DataRow label="Frecuencia" value={motor.frecuencia_hz ? `${motor.frecuencia_hz} Hz` : null} />
          <DataRow label="Amperaje Nominal" value={motor.amperaje_nominal ? `${motor.amperaje_nominal} A` : null} />
          <DataRow label="Factor Potencia" value={motor.factor_potencia ? `${motor.factor_potencia} cos φ` : null} />
          <DataRow label="Clase Aislamiento" value={motor.clase_aislamiento} />
          <DataRow label="Grado Protección IP" value={motor.grado_proteccion_ip} />
          <DataRow label="Observaciones Motor" value={motor.observaciones} />
        </InfoCard>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA PRINCIPAL DEL EXPEDIENTE 360° (/equipos/[id])
// ═══════════════════════════════════════════════════════════════════════════════

type ActiveTab = 'ficha' | 'repuestos' | 'ordenes';

export default function EquipoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string, 10);

  const [activeTab, setActiveTab] = useState<ActiveTab>('ficha');
  const [modalEstadoOpen, setModalEstadoOpen] = useState(false);
  const [modalLecturaOpen, setModalLecturaOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useEquipo(id);
  const {
    data: fichaLogistica,
    isLoading: isLoadingLogistica,
    isError: isErrorLogistica,
    refetch: refetchLogistica,
  } = useFichaLogisticaEquipo(id);

  const equipo = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs font-medium text-slate-500">
            Cargando expediente técnico 360° del activo...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !equipo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 bg-white rounded-xl border border-slate-200 p-8">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-900">Error al cargar el activo</h2>
        <p className="text-xs text-slate-500">
          {(error as Error)?.message || 'No se encontró el equipo solicitado'}
        </p>
        <button
          onClick={() => router.push('/equipos')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Parque de Equipos
        </button>
      </div>
    );
  }

  const datosEspecificos = (equipo.datos_especificos || {}) as Record<string, any>;
  const motor = (datosEspecificos?.motor || null) as Record<string, any> | null;

  // Cálculos de KPIs en vivo (Filosofía de Referenciación Zero-Stress)
  const horasActualesNum = Number(equipo.horas_actuales || 0);
  const totalOrdenes = fichaLogistica?.resumen?.total_ordenes ?? 0;
  const totalBom = fichaLogistica?.resumen?.total_bom ?? 0;
  const bomCompatibles = fichaLogistica?.repuestos_compatibles || [];
  const bomTitulares = bomCompatibles.filter((b) => b.rol_repuesto !== 'ALTERNATIVO').length;
  const bomAlternativos = bomCompatibles.filter((b) => b.rol_repuesto === 'ALTERNATIVO').length;
  const bomEnBodega = bomCompatibles.filter((b) => b.stock_actual > 0).length;
  const bomBajoPedido = bomCompatibles.filter((b) => b.stock_actual <= 0).length;
  const totalInstalados = fichaLogistica?.resumen?.total_lineas_instaladas ?? 0;
  const inversionRepuestos = fichaLogistica?.resumen?.total_inversion_repuestos ?? 0;
  const ultimaOrden = fichaLogistica?.ordenes?.[0] || null;

  // Conversión Litros -> Galones para ayuda logística inmediata
  const aceiteLitros = motor?.capacidad_aceite_litros ? Number(motor.capacidad_aceite_litros) : null;
  const aceiteGalones = aceiteLitros ? (aceiteLitros / 3.78541).toFixed(1) : null;
  const refrigLitros = motor?.capacidad_refrigerante_litros
    ? Number(motor.capacidad_refrigerante_litros)
    : null;
  const refrigGalones = refrigLitros ? (refrigLitros / 3.78541).toFixed(1) : null;

  return (
    <div className="space-y-5 pb-10">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 1. CABECERA INSTITUCIONAL HOMOLOGADA                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <Link
            href="/equipos"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shrink-0 mt-0.5"
            title="Volver al Parque de Equipos"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-xs font-bold border border-slate-200 shrink-0">
                {equipo.codigo_equipo}
              </span>
              <TipoBadge tipo={equipo.tipo} />
              <EstadoBadge estado={equipo.estado_equipo} />
              <CriticidadBadge criticidad={equipo.criticidad} />
            </div>

            <h1 className="text-lg lg:text-xl font-bold text-slate-900 mt-1.5 truncate">
              {equipo.nombre_equipo || 'Activo sin nombre'}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                Cliente:{' '}
                {equipo.cliente?.id_cliente ? (
                  <Link
                    href={`/clientes/${equipo.cliente.id_cliente}`}
                    className="font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-0.5"
                  >
                    {equipo.cliente.nombre}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <strong className="text-slate-700">{equipo.cliente?.nombre || 'Sin cliente'}</strong>
                )}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-slate-700">
                  {equipo.sede?.nombre
                    ? `${equipo.sede.nombre} (${equipo.ubicacion_texto || ''})`
                    : equipo.ubicacion_texto || 'Sin ubicación'}
                </strong>
              </span>
              {equipo.numero_serie_equipo && (
                <>
                  <span>•</span>
                  <span className="font-mono text-slate-600">
                    S/N: <strong className="text-slate-800">{equipo.numero_serie_equipo}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botonera Ejecutiva Monolínea */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start lg:self-center">
          <button
            onClick={() => setModalEstadoOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
            <span>Cambiar Estado</span>
          </button>

          <button
            onClick={() => setModalLecturaOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <Timer className="h-3.5 w-3.5 text-emerald-600" />
            <span>+ Horómetro</span>
          </button>

          <Link
            href={`/ordenes/nueva?clienteId=${equipo.cliente?.id_cliente || ''}&equipoId=${id}`}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap"
            title="Programar nueva Orden de Servicio sobre este equipo"
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>+ Crear Orden de Servicio</span>
          </Link>

          <Link
            href={`/equipos/${id}/editar`}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Editar</span>
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 2. TARJETAS KPI EJECUTIVAS DEL ACTIVO                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Horómetro */}
        <div
          onClick={() => setModalLecturaOpen(true)}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-2xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Horómetro Acumulado
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg">
              <Timer className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900">
              {horasActualesNum.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-blue-700">hrs</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {equipo.fecha_ultima_lectura_horas
              ? `Últ. lectura: ${formatDateSafe(equipo.fecha_ultima_lectura_horas, { day: '2-digit', month: 'short', year: 'numeric' })}`
              : 'Click para registrar lectura'}
          </p>
        </div>

        {/* KPI 2: Intervenciones / OTs */}
        <button
          type="button"
          onClick={() => setActiveTab('ordenes')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-2xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Intervenciones / OTs
            </span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalOrdenes}</span>
            <span className="text-xs font-semibold text-indigo-700">órdenes</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {ultimaOrden
              ? `Última: ${ultimaOrden.numero_orden} (${ultimaOrden.estado_nombre || 'Activa'})`
              : 'Ver historial de órdenes'}
          </p>
        </button>

        {/* KPI 3: Kit BOM (Referenciación Técnica & Comercial Zero-Stress) */}
        <button
          type="button"
          onClick={() => setActiveTab('repuestos')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-2xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Kit de Repuestos (BOM)
            </span>
            <div className={cn(
              'p-1.5 rounded-lg border',
              totalBom === 0
                ? 'bg-slate-100 text-slate-600 border-slate-200'
                : bomBajoPedido === 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            )}>
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalBom}</span>
            <span className={cn(
              'text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap',
              totalBom === 0
                ? 'bg-slate-100 text-slate-600 border-slate-200'
                : bomAlternativos > 0
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            )}>
              {totalBom === 0
                ? 'Sin referencias'
                : bomAlternativos > 0
                ? `${bomTitulares} Titular${bomTitulares === 1 ? '' : 'es'} • ${bomAlternativos} Homólogo${bomAlternativos === 1 ? '' : 's'}`
                : `${totalBom} Referencia${totalBom === 1 ? '' : 's'} Homologada${totalBom === 1 ? '' : 's'}`}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {totalBom === 0
              ? 'Click para referenciar repuestos del Catálogo Maestro'
              : `${bomEnBodega} en bodega • ${bomBajoPedido} bajo pedido / cotizar`}
          </p>
        </button>

        {/* KPI 4: Inversión en Repuestos WMS */}
        <button
          type="button"
          onClick={() => setActiveTab('repuestos')}
          className="text-left bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-2xs cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Consumo Histórico WMS
            </span>
            <div className="p-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900 font-mono">
              $ {inversionRepuestos.toLocaleString('es-CO')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalInstalados} repuestos imputados en órdenes de servicio
          </p>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 3. NAVEGACIÓN POR PESTAÑAS EJECUTIVAS (TABS)                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('ficha')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
            activeTab === 'ficha'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          <Gauge className="h-4 w-4" />
          <span>1. Ingeniería & Ficha Técnica</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('repuestos')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
            activeTab === 'repuestos'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          <Boxes className="h-4 w-4" />
          <span>2. Repuestos Compatibles (BOM) & Consumo WMS</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              activeTab === 'repuestos'
                ? 'bg-blue-500 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
            )}
          >
            {totalBom} BOM • {totalInstalados} Usados
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ordenes')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
            activeTab === 'ordenes'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          <History className="h-4 w-4" />
          <span>3. Historial de Órdenes de Servicio (OTs)</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              activeTab === 'ordenes'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-700 border border-slate-200',
            )}
          >
            {totalOrdenes}
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 1: INGENIERÍA & FICHA TÉCNICA                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ficha' && (
        <div className="space-y-5">
          {/* Banner Destacado: Especificaciones de Lubricación, Fluidos y Baterías */}
          {motor && (
            <div className="bg-white rounded-xl border border-blue-200 shadow-2xs overflow-hidden">
              <div className="px-4 py-3 bg-blue-50/70 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                    Especificaciones Críticas de Lubricación, Fluidos y Arranque (Motor{' '}
                    {motor.marca_motor || 'Principal'} {motor.modelo_motor || ''})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('repuestos')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                  <span>Ver Kit BOM & Existencias en Bodega WMS →</span>
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500">
                    <Fuel className="h-3.5 w-3.5 text-amber-600" />
                    <span>Aceite Lubricante</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {aceiteLitros ? `${aceiteLitros} L` : 'No esp.'}{' '}
                    {aceiteGalones && (
                      <span className="text-xs font-semibold text-amber-700 font-mono">
                        (≈ {aceiteGalones} GAL)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Viscosidad: <strong className="text-slate-900">{motor.tipo_aceite || '15W40'}</strong>
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500">
                    <Droplets className="h-3.5 w-3.5 text-cyan-600" />
                    <span>Sistema de Enfriamiento</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {refrigLitros ? `${refrigLitros} L` : 'No esp.'}{' '}
                    {refrigGalones && (
                      <span className="text-xs font-semibold text-cyan-700 font-mono">
                        (≈ {refrigGalones} GAL)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Tipo: <strong className="text-slate-900">{motor.tipo_refrigerante || 'ELC 50/50'}</strong>
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500">
                    <BatteryCharging className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Baterías & Arranque</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {motor.numero_baterias ? `${motor.numero_baterias} unid.` : 'Estándar'} •{' '}
                    {motor.voltaje_arranque_vdc ? `${motor.voltaje_arranque_vdc} VDC` : '12/24 VDC'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Ref: <strong className="text-slate-900">{motor.referencia_bateria || 'N/A'}</strong>
                    {motor.capacidad_bateria_ah ? ` (${motor.capacidad_bateria_ah} Ah)` : ''}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500">
                    <Gauge className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Motor & Combustible</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-1 truncate">
                    {motor.marca_motor || 'N/A'} {motor.modelo_motor || ''}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {motor.tipo_combustible || 'DIESEL'} •{' '}
                    <strong className="text-slate-900">
                      {motor.velocidad_nominal_rpm ? `${motor.velocidad_nominal_rpm} RPM` : '1800 RPM'}
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tarjetas de Contexto Administrativo y Operativo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoCard title="Cliente & Ubicación" icon={Building2}>
              <DataRow
                label="Cliente"
                value={
                  equipo.cliente?.id_cliente ? (
                    <Link
                      href={`/clientes/${equipo.cliente.id_cliente}`}
                      className="text-blue-700 hover:underline font-bold inline-flex items-center gap-1"
                    >
                      {equipo.cliente.nombre}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    equipo.cliente?.nombre
                  )
                }
              />
              <DataRow label="Sede" value={equipo.sede?.nombre || 'Sede Principal'} />
              <DataRow label="Ubicación Física" value={equipo.ubicacion_texto} />
              <DataRow
                label="Contrato"
                value={equipo.tipo_contrato?.replace(/_/g, ' ') || 'Sin contrato'}
              />
            </InfoCard>

            <InfoCard title="Fechas Clave & Garantía" icon={Calendar}>
              <DataRow
                label="Instalación"
                value={formatDateSafe(equipo.fecha_instalacion, {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              />
              <DataRow
                label="Inicio Servicio Mekanos"
                value={formatDateSafe(equipo.fecha_inicio_servicio_mekanos, {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              />
              <DataRow
                label="En Garantía"
                value={
                  equipo.en_garantia ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle className="h-3.5 w-3.5" /> Sí ({equipo.proveedor_garantia || 'Vigente'})
                    </span>
                  ) : (
                    'No'
                  )
                }
              />
              <DataRow
                label="Registro en ERP"
                value={formatDateSafe(equipo.fecha_creacion, {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              />
            </InfoCard>

            <InfoCard title="Estado Físico & Pintura" icon={PaintBucket}>
              <DataRow
                label="Estado Pintura"
                value={
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-semibold',
                      equipo.estado_pintura === 'EXCELENTE' && 'bg-emerald-50 text-emerald-700',
                      equipo.estado_pintura === 'BUENO' && 'bg-blue-50 text-blue-700',
                      equipo.estado_pintura === 'REGULAR' && 'bg-amber-50 text-amber-700',
                      equipo.estado_pintura === 'MALO' && 'bg-rose-50 text-rose-700',
                      !equipo.estado_pintura && 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {equipo.estado_pintura || 'No evaluado'}
                  </span>
                }
              />
              <DataRow
                label="Requiere Pintura"
                value={
                  equipo.requiere_pintura ? (
                    <span className="text-amber-700 font-bold">Sí</span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">No</span>
                  )
                }
              />
              <DataRow label="Serie del Equipo" value={equipo.numero_serie_equipo} />
            </InfoCard>
          </div>

          {/* Alerta de Baja si aplica */}
          {equipo.activo === false && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-rose-800">Equipo dado de baja</h4>
                  {equipo.fecha_baja && (
                    <p className="text-xs text-rose-600 mt-1">
                      Fecha: {formatDateSafe(equipo.fecha_baja, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                  {equipo.motivo_baja && <p className="text-xs text-rose-700 mt-1">{equipo.motivo_baja}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Especificaciones Técnicas Polimórficas */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-blue-600" />
              Placa de Especificaciones de Ingeniería ({equipo.tipo})
            </h2>
            {equipo.tipo === 'GENERADOR' && (
              <FichaTecnicaGenerador datos={datosEspecificos} motor={motor} />
            )}
            {equipo.tipo === 'BOMBA' && <FichaTecnicaBomba datos={datosEspecificos} motor={motor} />}
            {equipo.tipo !== 'GENERADOR' && equipo.tipo !== 'BOMBA' && motor && (
              <FichaTecnicaGenerador datos={datosEspecificos} motor={motor} />
            )}
          </div>

          {/* Observaciones y Configuración Especial */}
          {(equipo.observaciones_generales ||
            equipo.configuracion_especial ||
            equipo.criticidad_justificacion) && (
            <InfoCard title="Observaciones y Configuración Especial" icon={FileText}>
              <div className="space-y-3">
                {equipo.criticidad_justificacion && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-1">Justificación de Criticidad</h4>
                    <p className="text-xs text-slate-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                      {equipo.criticidad_justificacion}
                    </p>
                  </div>
                )}
                {equipo.observaciones_generales && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-1">Observaciones Generales</h4>
                    <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-lg whitespace-pre-wrap">
                      {equipo.observaciones_generales}
                    </p>
                  </div>
                )}
                {equipo.configuracion_especial && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-1">Configuración Especial</h4>
                    <p className="text-xs text-slate-700 bg-blue-50 border border-blue-200 p-3 rounded-lg whitespace-pre-wrap">
                      {equipo.configuracion_especial}
                    </p>
                  </div>
                )}
              </div>
            </InfoCard>
          )}

          {/* Historial de Horómetro y Estados */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InfoCard title="Últimas Lecturas de Horómetro" icon={Clock}>
              {equipo.lecturas_horometro && equipo.lecturas_horometro.length > 0 ? (
                <div className="space-y-1.5">
                  {equipo.lecturas_horometro.map((lectura: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0"
                    >
                      <span className="text-xs text-slate-500">
                        {formatDateSafe(lectura.fecha_lectura, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {Number(lectura.horas_lectura).toLocaleString()} hrs
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">
                  No se han registrado lecturas de horómetro adicionales.
                </p>
              )}
            </InfoCard>

            <InfoCard title="Historial de Cambios de Estado" icon={History}>
              {equipo.historial_estados && equipo.historial_estados.length > 0 ? (
                <div className="space-y-1.5">
                  {equipo.historial_estados.map((estado: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900">{estado.estado_nuevo}</span>
                        {estado.motivo_cambio && (
                          <p className="text-[11px] text-slate-500">{estado.motivo_cambio}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatDateSafe(estado.fecha_cambio, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">
                  Sin cambios de estado registrados en bitácora.
                </p>
              )}
            </InfoCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 2: REPUESTOS COMPATIBLES (BOM) & CONSUMO WMS                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'repuestos' && (
        <EquipoRepuestosTab
          idEquipo={id}
          ficha={fichaLogistica}
          isLoading={isLoadingLogistica}
          isError={isErrorLogistica}
          onRetry={() => refetchLogistica()}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PESTAÑA 3: HISTORIAL DE ÓRDENES DE SERVICIO (OTs) & HOJA DE VIDA       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ordenes' && (
        <div className="space-y-6">
          {/* Tabla Ejecutiva de Órdenes de Servicio del Activo */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Órdenes de Servicio Ejecutadas y Programadas ({totalOrdenes})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trazabilidad directa entre el activo {equipo.codigo_equipo}, sus visitas técnicas y el costo total imputado
                </p>
              </div>
              <Link
                href={`/ordenes/nueva?clienteId=${equipo.cliente?.id_cliente || ''}&equipoId=${id}`}
                className="inline-flex items-center gap-1.5 h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Programar Nueva OT</span>
              </Link>
            </div>

            {!fichaLogistica?.ordenes || fichaLogistica.ordenes.length === 0 ? (
              <div className="text-center py-12 px-4">
                <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">
                  Sin Órdenes de Servicio vinculadas a este equipo
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Puedes crear una nueva Orden de Servicio usando el botón superior.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">N° Orden</th>
                      <th className="px-4 py-3">Tipo de Servicio</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Técnico Asignado</th>
                      <th className="px-4 py-3 text-right">Total Orden</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fichaLogistica.ordenes.map((ot) => (
                      <tr key={ot.id_orden_servicio} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={`/ordenes/${ot.id_orden_servicio}`}
                            className="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                          >
                            {ot.numero_orden}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {ot.tipo_servicio || 'Mantenimiento General'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {ot.estado_nombre || ot.estado_codigo || 'ACTIVA'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {formatDateSafe(ot.fecha_fin_real || ot.fecha_programada || ot.fecha_creacion, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {ot.tecnico || <span className="text-slate-400 italic">Sin asignar</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          $ {Number(ot.total_general || 0).toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/ordenes/${ot.id_orden_servicio}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition-colors"
                          >
                            <span>Abrir OT</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Línea de Tiempo Técnica (Mediciones, Actividades y PDFs) */}
          <HojaVidaEquipo equipoId={id} />
        </div>
      )}

      {/* Modales Operativos */}
      <ModalCambiarEstado
        isOpen={modalEstadoOpen}
        onClose={() => setModalEstadoOpen(false)}
        equipoId={id}
        estadoActual={equipo.estado_equipo}
        onSuccess={() => refetch()}
      />
      <ModalRegistrarLectura
        isOpen={modalLecturaOpen}
        onClose={() => setModalLecturaOpen(false)}
        equipoId={id}
        horasActuales={horasActualesNum}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
