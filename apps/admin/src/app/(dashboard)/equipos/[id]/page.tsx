/**
 * PÁGINA DE DETALLE DE EQUIPO - MEKANOS S.A.S
 * Ruta: /equipos/[id]
 * @version 1.0 - 07-ENE-2026
 */

'use client';

import { useCambiarEstadoEquipo, useEquipo, useRegistrarLecturaHorometro } from '@/features/equipos';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Droplets,
  Edit,
  FileText,
  Fuel,
  Gauge,
  History,
  Loader2,
  MapPin,
  PaintBucket,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Timer,
  Wrench,
  X,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

function TipoBadge({ tipo }: { tipo: string }) {
  const config: Record<string, { icon: typeof Zap; color: string; label: string }> = {
    GENERADOR: { icon: Zap, color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Generador' },
    BOMBA: { icon: Droplets, color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Bomba' },
    MOTOR: { icon: Settings, color: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Motor' },
  };
  const { icon: Icon, color, label } = config[tipo] || { icon: Zap, color: 'bg-gray-100 text-gray-800', label: tipo };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border', color)}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    OPERATIVO: 'bg-green-100 text-green-800 border-green-300',
    STANDBY: 'bg-blue-100 text-blue-800 border-blue-300',
    INACTIVO: 'bg-gray-100 text-gray-600 border-gray-300',
    EN_REPARACION: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    FUERA_SERVICIO: 'bg-red-100 text-red-800 border-red-300',
    BAJA: 'bg-gray-200 text-gray-500 border-gray-400',
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
    <span className={cn('px-3 py-1.5 rounded-full text-sm font-medium border', colors[estado] || 'bg-gray-100 border-gray-300')}>
      {labels[estado] || estado}
    </span>
  );
}

function CriticidadBadge({ criticidad }: { criticidad: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    BAJA: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    MEDIA: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    ALTA: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
    CRITICA: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  };
  const { bg, text, dot } = config[criticidad] || config.MEDIA;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium', bg, text)}>
      <span className={cn('w-2 h-2 rounded-full', dot)} />
      Criticidad {criticidad}
    </span>
  );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: typeof Zap; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Icon className="h-5 w-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || '—'}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL: CAMBIAR ESTADO
// ═══════════════════════════════════════════════════════════════════════════════
const ESTADOS_EQUIPO = [
  { value: 'OPERATIVO', label: 'Operativo', color: 'bg-green-100 text-green-800' },
  { value: 'STANDBY', label: 'Standby', color: 'bg-blue-100 text-blue-800' },
  { value: 'INACTIVO', label: 'Inactivo', color: 'bg-gray-100 text-gray-600' },
  { value: 'EN_REPARACION', label: 'En Reparación', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'FUERA_SERVICIO', label: 'Fuera de Servicio', color: 'bg-red-100 text-red-800' },
  { value: 'BAJA', label: 'Baja', color: 'bg-gray-200 text-gray-500' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cambiar Estado del Equipo</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nuevo Estado</label>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS_EQUIPO.map((estado) => (
                <button
                  key={estado.value}
                  type="button"
                  onClick={() => setNuevoEstado(estado.value)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                    nuevoEstado === estado.value
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-transparent',
                    estado.color
                  )}
                >
                  {estado.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo del cambio <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe el motivo del cambio de estado..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cambiarEstado.isPending || nuevoEstado === estadoActual}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {cambiarEstado.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Cambiar Estado'
              )}
            </button>
          </div>
          {cambiarEstado.isError && (
            <p className="text-sm text-red-600 text-center">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Registrar Lectura de Horómetro</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-blue-700">Horas actuales:</span>
            <span className="font-bold text-blue-800">{horasActuales.toLocaleString()} hrs</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Lectura (hrs)</label>
            <input
              type="number"
              step="0.01"
              min={horasActuales}
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                horas && !esValido ? 'border-red-300 bg-red-50' : 'border-gray-300'
              )}
              placeholder={`Mínimo ${horasActuales} hrs`}
              required
            />
            {horas && !esValido && (
              <p className="text-sm text-red-600 mt-1">La lectura no puede ser menor a las horas actuales</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Lectura tomada durante mantenimiento preventivo..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={registrarLectura.isPending || !esValido}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {registrarLectura.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Registrar
                </>
              )}
            </button>
          </div>
          {registrarLectura.isError && (
            <p className="text-sm text-red-600 text-center">
              Error: {(registrarLectura.error as Error)?.message || 'No se pudo registrar la lectura'}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function FichaTecnicaGenerador({ datos, motor }: { datos: any; motor: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <InfoCard title="Datos del Generador" icon={Zap}>
        <DataRow label="Marca" value={datos?.marca_generador} />
        <DataRow label="Modelo" value={datos?.modelo_generador} />
        <DataRow label="Serie" value={datos?.numero_serie_generador} />
        <DataRow label="Potencia kVA" value={datos?.potencia_kva ? `${datos.potencia_kva} kVA` : null} />
        <DataRow label="Potencia kW" value={datos?.potencia_kw ? `${datos.potencia_kw} kW` : null} />
        <DataRow label="Factor Potencia" value={datos?.factor_potencia ? `${datos.factor_potencia} cos φ` : null} />
        <DataRow label="Voltaje Salida" value={datos?.voltaje_salida} />
        <DataRow label="Amperaje Nominal" value={datos?.amperaje_nominal_salida ? `${datos.amperaje_nominal_salida} A` : null} />
        <DataRow label="Fases" value={datos?.numero_fases === 1 ? 'Monofásico' : datos?.numero_fases === 3 ? 'Trifásico' : datos?.numero_fases} />
        <DataRow label="Frecuencia" value={datos?.frecuencia_hz ? `${datos.frecuencia_hz} Hz` : null} />
        <DataRow label="Tipo Conexión" value={datos?.tipo_conexion} />
        <DataRow label="Año Fabricación" value={datos?.a_o_fabricacion} />
      </InfoCard>
      <InfoCard title="Alternador" icon={Gauge}>
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
        <InfoCard title="Motor" icon={Fuel}>
          <DataRow label="Tipo Motor" value={motor.tipo_motor} />
          <DataRow label="Marca" value={motor.marca_motor} />
          <DataRow label="Modelo" value={motor.modelo_motor} />
          <DataRow label="Serie" value={motor.numero_serie_motor} />
          <DataRow label="Potencia HP" value={motor.potencia_hp ? `${motor.potencia_hp} HP` : null} />
          <DataRow label="Potencia kW" value={motor.potencia_kw ? `${motor.potencia_kw} kW` : null} />
          <DataRow label="RPM" value={motor.velocidad_nominal_rpm} />
          <DataRow label="Combustible" value={motor.tipo_combustible} />
          <DataRow label="Cilindros" value={motor.numero_cilindros} />
          <DataRow label="Cilindrada (cc)" value={motor.cilindrada_cc} />
          <DataRow label="Voltaje Arranque" value={motor.voltaje_arranque_vdc ? `${motor.voltaje_arranque_vdc} VDC` : null} />
          <DataRow label="Amperaje Arranque" value={motor.amperaje_arranque ? `${motor.amperaje_arranque} CCA` : null} />
          <DataRow label="Tipo Arranque" value={motor.tipo_arranque} />
          <DataRow label="Turbocargador" value={motor.tiene_turbocargador ? 'Sí' : 'No'} />
          <DataRow label="Capacidad Aceite" value={motor.capacidad_aceite_litros ? `${motor.capacidad_aceite_litros} L` : null} />
          <DataRow label="Capacidad Refrigerante" value={motor.capacidad_refrigerante_litros ? `${motor.capacidad_refrigerante_litros} L` : null} />
          <DataRow label="Tipo Aceite" value={motor.tipo_aceite} />
          <DataRow label="Tipo Refrigerante" value={motor.tipo_refrigerante} />
          <DataRow label="Presión Aceite Mínima" value={motor.presion_aceite_minima_psi ? `${motor.presion_aceite_minima_psi} PSI` : null} />
          <DataRow label="Temp. Máx Operación" value={motor.temperatura_operacion_maxima_c ? `${motor.temperatura_operacion_maxima_c} °C` : null} />
          <DataRow label="Aspiración" value={motor.aspiracion} />
          <DataRow label="Sistema Enfriamiento" value={motor.sistema_enfriamiento} />
          <DataRow label="Baterías" value={motor.numero_baterias} />
          <DataRow label="Referencia Batería" value={motor.referencia_bateria} />
          <DataRow label="Capacidad Batería" value={motor.capacidad_bateria_ah ? `${motor.capacidad_bateria_ah} Ah` : null} />
          <DataRow label="Tiene Radiador" value={motor.tiene_radiador ? 'Sí' : 'No'} />
          {motor.tiene_radiador && (
            <>
              <DataRow label="Radiador (Alto)" value={motor.radiador_alto_cm ? `${motor.radiador_alto_cm} cm` : null} />
              <DataRow label="Radiador (Ancho)" value={motor.radiador_ancho_cm ? `${motor.radiador_ancho_cm} cm` : null} />
              <DataRow label="Radiador (Espesor)" value={motor.radiador_espesor_cm ? `${motor.radiador_espesor_cm} cm` : null} />
            </>
          )}
          <DataRow label="Cargador Batería" value={motor.tiene_cargador_bateria ? 'Sí' : 'No'} />
          {motor.tiene_cargador_bateria && (
            <>
              <DataRow label="Marca Cargador" value={motor.marca_cargador} />
              <DataRow label="Modelo Cargador" value={motor.modelo_cargador} />
              <DataRow label="Amperaje Cargador" value={motor.amperaje_cargador ? `${motor.amperaje_cargador} A` : null} />
            </>
          )}
          <DataRow label="Observaciones Motor" value={motor.observaciones} />
        </InfoCard>
      )}
      <InfoCard title="Control y Combustible" icon={Settings}>
        <DataRow label="Módulo Control" value={datos?.tiene_modulo_control ? 'Sí' : 'No'} />
        {datos?.tiene_modulo_control && (
          <>
            <DataRow label="Marca Módulo" value={datos?.marca_modulo_control} />
            <DataRow label="Modelo Módulo" value={datos?.modelo_modulo_control} />
          </>
        )}
        <DataRow label="Arranque Automático" value={datos?.tiene_arranque_automatico ? 'Sí' : 'No'} />
        <DataRow label="Tanque Principal" value={datos?.capacidad_tanque_principal_litros ? `${datos.capacidad_tanque_principal_litros} L` : null} />
        <DataRow label="Tanque Auxiliar" value={datos?.tiene_tanque_auxiliar ? `${datos.capacidad_tanque_auxiliar_litros || '—'} L` : 'No'} />
        <DataRow label="Cabina Insonorizada" value={datos?.tiene_cabina_insonorizada ? 'Sí' : 'No'} />
        <DataRow label="Transferencia Automática" value={datos?.tiene_transferencia_automatica ? 'Sí' : 'No'} />
        {datos?.tiene_transferencia_automatica && (
          <>
            <DataRow label="Tipo Transferencia" value={datos?.tipo_transferencia} />
            <DataRow label="Ubicación Transferencia" value={datos?.ubicacion_transferencia} />
          </>
        )}
        <DataRow label="Calibre Cable Potencia" value={datos?.calibre_cable_potencia} />
        <DataRow label="Longitud Cable" value={datos?.longitud_cable_potencia_m ? `${datos.longitud_cable_potencia_m} m` : null} />
        <DataRow label="Observaciones Generador" value={datos?.observaciones} />
      </InfoCard>
    </div>
  );
}

function FichaTecnicaBomba({ datos, motor }: { datos: any; motor: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <InfoCard title="Datos de la Bomba" icon={Droplets}>
        <DataRow label="Marca" value={datos?.marca_bomba} />
        <DataRow label="Modelo" value={datos?.modelo_bomba} />
        <DataRow label="Serie" value={datos?.numero_serie_bomba} />
        <DataRow label="Tipo Bomba" value={datos?.tipo_bomba} />
        <DataRow label="Aplicación" value={datos?.aplicacion_bomba} />
        <DataRow label="Año Fabricación" value={datos?.a_o_fabricacion} />
        <DataRow label="Caudal Máximo" value={datos?.caudal_maximo_m3h ? `${datos.caudal_maximo_m3h} m³/h` : null} />
        <DataRow label="Altura Manométrica Máx" value={datos?.altura_manometrica_maxima_m ? `${datos.altura_manometrica_maxima_m} m` : null} />
        <DataRow label="Altura Presión Trabajo" value={datos?.altura_presion_trabajo_m ? `${datos.altura_presion_trabajo_m} m` : null} />
        <DataRow label="Potencia Hidráulica" value={datos?.potencia_hidraulica_kw ? `${datos.potencia_hidraulica_kw} kW` : null} />
        <DataRow label="Eficiencia" value={datos?.eficiencia_porcentaje ? `${datos.eficiencia_porcentaje}%` : null} />
        <DataRow label="Diámetro Succión" value={datos?.diametro_aspiracion} />
        <DataRow label="Diámetro Descarga" value={datos?.diametro_descarga} />
        <DataRow label="Sello Mecánico" value={datos?.referencia_sello_mecanico} />
        <DataRow label="Bombas en Sistema" value={`${datos?.numero_bomba_en_sistema || 1} de ${datos?.numero_total_bombas_sistema || 1}`} />
        <DataRow label="Observaciones Bomba" value={datos?.observaciones} />
      </InfoCard>
      <InfoCard title="Presiones y Control" icon={Gauge}>
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
            <DataRow label="Presión Encendido" value={datos?.presion_encendido_psi ? `${datos.presion_encendido_psi} PSI` : null} />
            <DataRow label="Presión Apagado" value={datos?.presion_apagado_psi ? `${datos.presion_apagado_psi} PSI` : null} />
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
            <DataRow label="Amperaje Contactor" value={datos?.amperaje_contactor ? `${datos.amperaje_contactor} A` : null} />
          </>
        )}
      </InfoCard>
      <InfoCard title="Sistema Hidroneumático" icon={Settings}>
        <DataRow label="Tanques Hidroneumáticos" value={datos?.tiene_tanques_hidroneumaticos ? 'Sí' : 'No'} />
        {datos?.tiene_tanques_hidroneumaticos && (
          <>
            <DataRow label="Cantidad Tanques" value={datos?.cantidad_tanques} />
            <DataRow label="Capacidad Tanques" value={datos?.capacidad_tanques_litros ? `${datos.capacidad_tanques_litros} L` : null} />
            <DataRow label="Presión Tanques" value={datos?.presion_tanques_psi ? `${datos.presion_tanques_psi} PSI` : null} />
          </>
        )}
        <DataRow label="Manómetro" value={datos?.tiene_manometro ? 'Sí' : 'No'} />
        {datos?.tiene_manometro && (
          <>
            <DataRow label="Rango Mínimo" value={datos?.rango_manometro_min_psi ? `${datos.rango_manometro_min_psi} PSI` : null} />
            <DataRow label="Rango Máximo" value={datos?.rango_manometro_max_psi ? `${datos.rango_manometro_max_psi} PSI` : null} />
          </>
        )}
        <DataRow label="Protección de Nivel" value={datos?.tiene_proteccion_nivel ? 'Sí' : 'No'} />
        {datos?.tiene_proteccion_nivel && (
          <DataRow label="Tipo Protección" value={datos?.tipo_proteccion_nivel} />
        )}
        <DataRow label="Válvula de Purga" value={datos?.tiene_valvula_purga ? 'Sí' : 'No'} />
        <DataRow label="Válvula de Cebado" value={datos?.tiene_valvula_cebado ? 'Sí' : 'No'} />
        <DataRow label="Válvula de Cheque" value={datos?.tiene_valvula_cheque ? 'Sí' : 'No'} />
        <DataRow label="Válvula de Pie" value={datos?.tiene_valvula_pie ? 'Sí' : 'No'} />
      </InfoCard>
      {motor && (
        <InfoCard title="Motor Eléctrico" icon={Zap}>
          <DataRow label="Tipo Motor" value={motor.tipo_motor} />
          <DataRow label="Marca" value={motor.marca_motor} />
          <DataRow label="Modelo" value={motor.modelo_motor} />
          <DataRow label="Serie" value={motor.numero_serie_motor} />
          <DataRow label="Potencia HP" value={motor.potencia_hp ? `${motor.potencia_hp} HP` : null} />
          <DataRow label="Potencia kW" value={motor.potencia_kw ? `${motor.potencia_kw} kW` : null} />
          <DataRow label="RPM" value={motor.velocidad_nominal_rpm} />
          <DataRow label="Voltaje" value={motor.voltaje_operacion_vac} />
          <DataRow label="Fases" value={motor.numero_fases === 'MONOFASICO' ? 'Monofásico' : motor.numero_fases === 'TRIFASICO' ? 'Trifásico' : motor.numero_fases} />
          <DataRow label="Frecuencia" value={motor.frecuencia_hz ? `${motor.frecuencia_hz} Hz` : null} />
          <DataRow label="Amperaje Nominal" value={motor.amperaje_nominal ? `${motor.amperaje_nominal} A` : null} />
          <DataRow label="Factor Potencia" value={motor.factor_potencia ? `${motor.factor_potencia} cos φ` : null} />
          <DataRow label="Clase Aislamiento" value={motor.clase_aislamiento} />
          <DataRow label="Grado Protección IP" value={motor.grado_proteccion_ip} />
          <DataRow label="Año Fabricación" value={motor.a_o_fabricacion} />
          <DataRow label="Capacidad Aceite" value={motor.capacidad_aceite_litros ? `${motor.capacidad_aceite_litros} L` : null} />
          <DataRow label="Capacidad Refrigerante" value={motor.capacidad_refrigerante_litros ? `${motor.capacidad_refrigerante_litros} L` : null} />
          <DataRow label="Tipo Aceite" value={motor.tipo_aceite} />
          <DataRow label="Tipo Refrigerante" value={motor.tipo_refrigerante} />
          <DataRow label="Tiene Radiador" value={motor.tiene_radiador ? 'Sí' : 'No'} />
          {motor.tiene_radiador && (
            <>
              <DataRow label="Radiador (Alto)" value={motor.radiador_alto_cm ? `${motor.radiador_alto_cm} cm` : null} />
              <DataRow label="Radiador (Ancho)" value={motor.radiador_ancho_cm ? `${motor.radiador_ancho_cm} cm` : null} />
              <DataRow label="Radiador (Espesor)" value={motor.radiador_espesor_cm ? `${motor.radiador_espesor_cm} cm` : null} />
            </>
          )}
          <DataRow label="Cargador Batería" value={motor.tiene_cargador_bateria ? 'Sí' : 'No'} />
          {motor.tiene_cargador_bateria && (
            <>
              <DataRow label="Marca Cargador" value={motor.marca_cargador} />
              <DataRow label="Modelo Cargador" value={motor.modelo_cargador} />
              <DataRow label="Amperaje Cargador" value={motor.amperaje_cargador ? `${motor.amperaje_cargador} A` : null} />
            </>
          )}
          <DataRow label="Observaciones Motor" value={motor.observaciones} />
        </InfoCard>
      )}
    </div>
  );
}

export default function EquipoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  // Estados para modales
  const [modalEstadoOpen, setModalEstadoOpen] = useState(false);
  const [modalLecturaOpen, setModalLecturaOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useEquipo(id);
  const equipo = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-gray-500">Cargando información del equipo...</p>
        </div>
      </div>
    );
  }

  if (isError || !equipo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900">Error al cargar el equipo</h2>
        <p className="text-gray-500">{(error as Error)?.message || 'No se encontró el equipo'}</p>
        <button onClick={() => router.push('/equipos')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Volver a Equipos
        </button>
      </div>
    );
  }

  const datosEspecificos = equipo.datos_especificos;
  const motor = datosEspecificos?.motor;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => router.push('/equipos')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{equipo.codigo_equipo}</span>
              <TipoBadge tipo={equipo.tipo} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{equipo.nombre_equipo || 'Sin nombre'}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <EstadoBadge estado={equipo.estado_equipo} />
              <CriticidadBadge criticidad={equipo.criticidad} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModalEstadoOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Cambiar Estado
          </button>
          <button
            onClick={() => setModalLecturaOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Registrar Horómetro
          </button>
          <Link href={`/equipos/${id}/editar`} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Edit className="h-4 w-4" />
            Editar
          </Link>
        </div>
      </div>

      {/* Info General */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard title="Cliente" icon={Building2}>
          <p className="font-medium text-gray-900">{equipo.cliente?.nombre || 'Sin cliente'}</p>
          {equipo.sede && <p className="text-sm text-gray-500 mt-1">{equipo.sede.nombre}</p>}
        </InfoCard>
        <InfoCard title="Ubicación" icon={MapPin}>
          <p className="text-gray-900">{equipo.ubicacion_texto || 'Sin ubicación'}</p>
        </InfoCard>
        <InfoCard title="Fechas Clave" icon={Calendar}>
          <DataRow label="Instalación" value={equipo.fecha_instalacion ? new Date(equipo.fecha_instalacion).toLocaleDateString('es-CO') : null} />
          <DataRow label="Inicio Servicio Mekanos" value={equipo.fecha_inicio_servicio_mekanos ? new Date(equipo.fecha_inicio_servicio_mekanos).toLocaleDateString('es-CO') : null} />
          <DataRow label="Registro" value={equipo.fecha_creacion ? new Date(equipo.fecha_creacion).toLocaleDateString('es-CO') : null} />
        </InfoCard>
      </div>

      {/* Número de Serie y Contrato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {equipo.numero_serie_equipo && (
          <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
            <Settings className="h-5 w-5 text-gray-400" />
            <div>
              <span className="text-sm text-gray-500">Número de Serie:</span>
              <span className="ml-2 font-mono font-medium text-gray-900">{equipo.numero_serie_equipo}</span>
            </div>
          </div>
        )}
        <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-400" />
          <div>
            <span className="text-sm text-gray-500">Tipo de Contrato:</span>
            <span className="ml-2 font-medium text-gray-900">
              {equipo.tipo_contrato?.replace(/_/g, ' ') || 'Sin contrato'}
            </span>
          </div>
        </div>
      </div>

      {/* Horómetro y Estado Físico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="Horómetro" icon={Timer}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Horas Actuales</span>
            <span className="text-2xl font-bold text-blue-600">
              {equipo.horas_actuales ? `${Number(equipo.horas_actuales).toLocaleString()} hrs` : '0 hrs'}
            </span>
          </div>
          <DataRow
            label="Última Lectura"
            value={equipo.fecha_ultima_lectura_horas
              ? new Date(equipo.fecha_ultima_lectura_horas).toLocaleDateString('es-CO')
              : 'Sin registro'}
          />
        </InfoCard>
        <InfoCard title="Estado Físico" icon={PaintBucket}>
          <DataRow
            label="Estado Pintura"
            value={
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                equipo.estado_pintura === 'EXCELENTE' && 'bg-green-100 text-green-700',
                equipo.estado_pintura === 'BUENO' && 'bg-blue-100 text-blue-700',
                equipo.estado_pintura === 'REGULAR' && 'bg-yellow-100 text-yellow-700',
                equipo.estado_pintura === 'MALO' && 'bg-red-100 text-red-700',
                !equipo.estado_pintura && 'bg-gray-100 text-gray-600'
              )}>
                {equipo.estado_pintura || 'No evaluado'}
              </span>
            }
          />
          <DataRow
            label="Requiere Pintura"
            value={equipo.requiere_pintura
              ? <span className="text-orange-600 font-medium">Sí</span>
              : <span className="text-green-600">No</span>
            }
          />
        </InfoCard>
      </div>

      {/* Garantía */}
      <InfoCard title="Información de Garantía" icon={Shield}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <DataRow
              label="En Garantía"
              value={
                equipo.en_garantia
                  ? <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle className="h-4 w-4" /> Sí
                  </span>
                  : <span className="text-gray-500">No</span>
              }
            />
            <DataRow label="Proveedor" value={equipo.proveedor_garantia} />
          </div>
          <div>
            <DataRow
              label="Inicio Garantía"
              value={equipo.fecha_inicio_garantia
                ? new Date(equipo.fecha_inicio_garantia).toLocaleDateString('es-CO')
                : null}
            />
            <DataRow
              label="Fin Garantía"
              value={equipo.fecha_fin_garantia
                ? new Date(equipo.fecha_fin_garantia).toLocaleDateString('es-CO')
                : null}
            />
          </div>
        </div>
      </InfoCard>

      {/* Intervalos de Mantenimiento */}
      {(equipo.intervalo_tipo_a_dias_override || equipo.intervalo_tipo_b_dias_override) && (
        <InfoCard title="Intervalos de Mantenimiento (Override)" icon={Wrench}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tipo A (Preventivo Menor)</h4>
              <DataRow label="Días" value={equipo.intervalo_tipo_a_dias_override ? `${equipo.intervalo_tipo_a_dias_override} días` : null} />
              <DataRow label="Horas" value={equipo.intervalo_tipo_a_horas_override ? `${equipo.intervalo_tipo_a_horas_override} hrs` : null} />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tipo B (Preventivo Mayor)</h4>
              <DataRow label="Días" value={equipo.intervalo_tipo_b_dias_override ? `${equipo.intervalo_tipo_b_dias_override} días` : null} />
              <DataRow label="Horas" value={equipo.intervalo_tipo_b_horas_override ? `${equipo.intervalo_tipo_b_horas_override} hrs` : null} />
            </div>
          </div>
          {equipo.criterio_intervalo_override && (
            <div className="mt-3 pt-3 border-t">
              <DataRow label="Criterio" value={equipo.criterio_intervalo_override?.replace(/_/g, ' ')} />
            </div>
          )}
        </InfoCard>
      )}

      {/* Observaciones */}
      {(equipo.observaciones_generales || equipo.configuracion_especial || equipo.criticidad_justificacion) && (
        <InfoCard title="Observaciones y Configuración" icon={FileText}>
          {equipo.criticidad_justificacion && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Justificación de Criticidad</h4>
              <p className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg">{equipo.criticidad_justificacion}</p>
            </div>
          )}
          {equipo.observaciones_generales && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Observaciones Generales</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{equipo.observaciones_generales}</p>
            </div>
          )}
          {equipo.configuracion_especial && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Configuración Especial</h4>
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg whitespace-pre-wrap">{equipo.configuracion_especial}</p>
            </div>
          )}
        </InfoCard>
      )}

      {/* Alerta de Baja */}
      {equipo.activo === false && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800">Equipo dado de baja</h4>
              {equipo.fecha_baja && (
                <p className="text-sm text-red-600 mt-1">
                  Fecha: {new Date(equipo.fecha_baja).toLocaleDateString('es-CO')}
                </p>
              )}
              {equipo.motivo_baja && (
                <p className="text-sm text-red-700 mt-2">{equipo.motivo_baja}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ficha Técnica según tipo */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Gauge className="h-5 w-5 text-blue-500" />
          Ficha Técnica
        </h2>
        {equipo.tipo === 'GENERADOR' && <FichaTecnicaGenerador datos={datosEspecificos} motor={motor} />}
        {equipo.tipo === 'BOMBA' && <FichaTecnicaBomba datos={datosEspecificos} motor={motor} />}
      </div>

      {/* Historial de Horómetro */}
      {equipo.lecturas_horometro && equipo.lecturas_horometro.length > 0 && (
        <InfoCard title="Últimas Lecturas de Horómetro" icon={Clock}>
          <div className="space-y-2">
            {equipo.lecturas_horometro.map((lectura: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{new Date(lectura.fecha_lectura).toLocaleDateString('es-CO')}</span>
                <span className="font-mono font-medium text-gray-900">{lectura.horas_lectura} hrs</span>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Historial de Estados */}
      {equipo.historial_estados && equipo.historial_estados.length > 0 && (
        <InfoCard title="Historial de Estados" icon={History}>
          <div className="space-y-2">
            {equipo.historial_estados.map((estado: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-900">{estado.estado_nuevo}</span>
                  {estado.motivo_cambio && <p className="text-xs text-gray-500">{estado.motivo_cambio}</p>}
                </div>
                <span className="text-sm text-gray-500">{new Date(estado.fecha_cambio).toLocaleDateString('es-CO')}</span>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Modales */}
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
        horasActuales={Number(equipo.horas_actuales) || 0}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
