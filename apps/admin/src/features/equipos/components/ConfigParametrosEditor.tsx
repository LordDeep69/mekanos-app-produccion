/**
 * EDITOR DE CONFIGURACIÓN DE PARÁMETROS - MEKANOS S.A.S
 * 
 * Permite personalizar unidades de medida y rangos por equipo.
 * Sistema de resolución en cascada: equipo → plantilla → catálogo global.
 * 
 * @version 1.0 - 06-ENE-2026
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gauge, RefreshCw, Settings2, Thermometer, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

// Tipos para la configuración de parámetros
interface UnidadesConfig {
    temperatura?: string;
    presion?: string;
    voltaje?: string;
    frecuencia?: string;
    corriente?: string;
    velocidad?: string;
    vibracion?: string;
    potencia?: string;
}

interface RangoParametro {
    min_normal?: number;
    max_normal?: number;
    min_critico?: number;
    max_critico?: number;
    valor_ideal?: number;
}

interface RangosConfig {
    [parametro: string]: RangoParametro;
}

interface ConfigParametros {
    unidades?: UnidadesConfig;
    rangos?: RangosConfig;
}

// Opciones de unidades por tipo de magnitud
const OPCIONES_UNIDADES = {
    temperatura: [
        { value: '°C', label: '°C (Celsius)' },
        { value: '°F', label: '°F (Fahrenheit)' },
        { value: 'K', label: 'K (Kelvin)' },
    ],
    presion: [
        { value: 'PSI', label: 'PSI' },
        { value: 'bar', label: 'bar' },
        { value: 'kPa', label: 'kPa' },
        { value: 'atm', label: 'atm' },
    ],
    voltaje: [
        { value: 'V', label: 'V (Voltios)' },
        { value: 'kV', label: 'kV (Kilovoltios)' },
    ],
    frecuencia: [
        { value: 'Hz', label: 'Hz (Hertz)' },
        { value: 'kHz', label: 'kHz (Kilohertz)' },
    ],
    corriente: [
        { value: 'A', label: 'A (Amperios)' },
        { value: 'mA', label: 'mA (Miliamperios)' },
    ],
    velocidad: [
        { value: 'RPM', label: 'RPM' },
        { value: 'rad/s', label: 'rad/s' },
    ],
    vibracion: [
        { value: 'mm/s', label: 'mm/s' },
        { value: 'in/s', label: 'in/s' },
        { value: 'g', label: 'g (aceleración)' },
    ],
    potencia: [
        { value: 'kW', label: 'kW (Kilovatios)' },
        { value: 'HP', label: 'HP (Caballos de fuerza)' },
        { value: 'W', label: 'W (Vatios)' },
    ],
};

// Valores por defecto (catálogo global)
const UNIDADES_DEFAULT: UnidadesConfig = {
    temperatura: '°C',
    presion: 'PSI',
    voltaje: 'V',
    frecuencia: 'Hz',
    corriente: 'A',
    velocidad: 'RPM',
    vibracion: 'mm/s',
    potencia: 'kW',
};

// Parámetros específicos para generadores
const PARAMETROS_GENERADOR = [
    { key: 'frecuencia_generador', label: 'Frecuencia del Generador', magnitud: 'frecuencia' },
    { key: 'voltaje_generador', label: 'Voltaje del Generador', magnitud: 'voltaje' },
    { key: 'temperatura_refrigerante', label: 'Temperatura de Refrigerante', magnitud: 'temperatura' },
    { key: 'presion_aceite', label: 'Presión de Aceite', magnitud: 'presion' },
    { key: 'velocidad_motor', label: 'Velocidad de Motor', magnitud: 'velocidad' },
    { key: 'corriente_generador', label: 'Corriente del Generador', magnitud: 'corriente' },
    { key: 'carga_bateria', label: 'Carga de Batería', magnitud: 'voltaje' },
];

// Parámetros específicos para bombas
const PARAMETROS_BOMBA = [
    { key: 'presion_descarga', label: 'Presión de Descarga', magnitud: 'presion' },
    { key: 'presion_succion', label: 'Presión de Succión', magnitud: 'presion' },
    { key: 'voltaje_motor', label: 'Voltaje del Motor', magnitud: 'voltaje' },
    { key: 'corriente_motor', label: 'Corriente del Motor', magnitud: 'corriente' },
    { key: 'vibracion', label: 'Vibración', magnitud: 'vibracion' },
    { key: 'temperatura_motor', label: 'Temperatura del Motor', magnitud: 'temperatura' },
];

// ✅ VALORES POR DEFECTO PARA RANGOS (según unidad seleccionada)
const RANGOS_DEFAULT_GENERADOR: Record<string, Record<string, RangoParametro>> = {
    frecuencia_generador: {
        'Hz': { min_normal: 59, max_normal: 61, min_critico: 57, max_critico: 63 },
    },
    voltaje_generador: {
        'V': { min_normal: 210, max_normal: 230, min_critico: 200, max_critico: 240 },
        'kV': { min_normal: 0.21, max_normal: 0.23, min_critico: 0.20, max_critico: 0.24 },
    },
    temperatura_refrigerante: {
        '°C': { min_normal: 80, max_normal: 95, min_critico: 70, max_critico: 105 },
        '°F': { min_normal: 176, max_normal: 203, min_critico: 158, max_critico: 221 },
        'K': { min_normal: 353, max_normal: 368, min_critico: 343, max_critico: 378 },
    },
    presion_aceite: {
        'PSI': { min_normal: 40, max_normal: 60, min_critico: 30, max_critico: 70 },
        'bar': { min_normal: 2.8, max_normal: 4.1, min_critico: 2.1, max_critico: 4.8 },
        'kPa': { min_normal: 276, max_normal: 414, min_critico: 207, max_critico: 483 },
    },
    velocidad_motor: {
        'RPM': { min_normal: 1750, max_normal: 1850, min_critico: 1700, max_critico: 1900 },
    },
    corriente_generador: {
        'A': { min_normal: 0, max_normal: 100, min_critico: 0, max_critico: 120 },
    },
    carga_bateria: {
        'V': { min_normal: 12.5, max_normal: 14.5, min_critico: 11.5, max_critico: 15.0 },
        'VDC': { min_normal: 12.5, max_normal: 14.5, min_critico: 11.5, max_critico: 15.0 },
    },
};

const RANGOS_DEFAULT_BOMBA: Record<string, Record<string, RangoParametro>> = {
    presion_descarga: {
        'PSI': { min_normal: 60, max_normal: 100, min_critico: 50, max_critico: 120 },
        'bar': { min_normal: 4.1, max_normal: 6.9, min_critico: 3.4, max_critico: 8.3 },
    },
    presion_succion: {
        'PSI': { min_normal: 5, max_normal: 15, min_critico: 2, max_critico: 20 },
        'bar': { min_normal: 0.3, max_normal: 1.0, min_critico: 0.1, max_critico: 1.4 },
    },
    voltaje_motor: {
        'V': { min_normal: 210, max_normal: 230, min_critico: 200, max_critico: 240 },
    },
    corriente_motor: {
        'A': { min_normal: 0, max_normal: 50, min_critico: 0, max_critico: 60 },
    },
    vibracion: {
        'mm/s': { min_normal: 0, max_normal: 4.5, min_critico: 0, max_critico: 7.1 },
        'in/s': { min_normal: 0, max_normal: 0.18, min_critico: 0, max_critico: 0.28 },
    },
    temperatura_motor: {
        '°C': { min_normal: 40, max_normal: 80, min_critico: 30, max_critico: 100 },
        '°F': { min_normal: 104, max_normal: 176, min_critico: 86, max_critico: 212 },
    },
};

interface ConfigParametrosEditorProps {
    tipoEquipo: 'GENERADOR' | 'BOMBA' | 'MOTOR';
    value?: ConfigParametros;
    onChange: (config: ConfigParametros) => void;
    disabled?: boolean;
}

export function ConfigParametrosEditor({
    tipoEquipo,
    value,
    onChange,
    disabled = false,
}: ConfigParametrosEditorProps) {
    const [habilitarPersonalizacion, setHabilitarPersonalizacion] = useState(false);
    const [unidades, setUnidades] = useState<UnidadesConfig>(value?.unidades || {});
    const [rangos, setRangos] = useState<RangosConfig>(value?.rangos || {});

    // Determinar parámetros según tipo de equipo
    const parametros = tipoEquipo === 'GENERADOR' ? PARAMETROS_GENERADOR : PARAMETROS_BOMBA;

    // Detectar si hay configuración personalizada
    useEffect(() => {
        const tieneConfig = value && (
            (value.unidades && Object.keys(value.unidades).length > 0) ||
            (value.rangos && Object.keys(value.rangos).length > 0)
        );
        setHabilitarPersonalizacion(!!tieneConfig);
        if (value?.unidades) setUnidades(value.unidades);
        if (value?.rangos) setRangos(value.rangos);
    }, [value]);

    // Actualizar config cuando cambian unidades o rangos
    const actualizarConfig = (newUnidades: UnidadesConfig, newRangos: RangosConfig) => {
        if (!habilitarPersonalizacion) {
            onChange({});
            return;
        }

        const config: ConfigParametros = {};
        if (Object.keys(newUnidades).length > 0) {
            config.unidades = newUnidades;
        }
        if (Object.keys(newRangos).length > 0) {
            config.rangos = newRangos;
        }
        onChange(config);
    };

    const handleUnidadChange = (magnitud: keyof UnidadesConfig, valor: string) => {
        const newUnidades = { ...unidades, [magnitud]: valor };
        setUnidades(newUnidades);
        actualizarConfig(newUnidades, rangos);
    };

    const handleRangoChange = (parametro: string, campo: keyof RangoParametro, valor: number | undefined) => {
        const newRangos = {
            ...rangos,
            [parametro]: {
                ...rangos[parametro],
                [campo]: valor,
            },
        };
        setRangos(newRangos);
        actualizarConfig(unidades, newRangos);
    };

    const handleTogglePersonalizacion = (checked: boolean) => {
        setHabilitarPersonalizacion(checked);
        if (!checked) {
            setUnidades({});
            setRangos({});
            onChange({});
        }
    };

    const resetearADefecto = () => {
        setUnidades({});
        setRangos({});
        onChange({});
    };

    // ✅ Cargar valores por defecto según unidades seleccionadas
    const cargarValoresPorDefecto = () => {
        const rangosDefault = tipoEquipo === 'GENERADOR' ? RANGOS_DEFAULT_GENERADOR : RANGOS_DEFAULT_BOMBA;
        const nuevosRangos: RangosConfig = {};

        parametros.forEach((param) => {
            const rangosParam = rangosDefault[param.key];
            if (rangosParam) {
                // Obtener unidad seleccionada o default
                const unidadActual = unidades[param.magnitud as keyof UnidadesConfig]
                    || UNIDADES_DEFAULT[param.magnitud as keyof UnidadesConfig];

                // Buscar rangos para esa unidad, o usar el primero disponible
                const rangoParaUnidad = rangosParam[unidadActual || '']
                    || Object.values(rangosParam)[0];

                if (rangoParaUnidad) {
                    nuevosRangos[param.key] = { ...rangoParaUnidad };
                }
            }
        });

        setRangos(nuevosRangos);
        actualizarConfig(unidades, nuevosRangos);
    };

    return (
        <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">Configuración de Parámetros</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="habilitar-config" className="text-sm text-muted-foreground">
                            Personalizar
                        </Label>
                        <Switch
                            id="habilitar-config"
                            checked={habilitarPersonalizacion}
                            onCheckedChange={handleTogglePersonalizacion}
                            disabled={disabled}
                        />
                    </div>
                </div>
                <CardDescription>
                    {habilitarPersonalizacion
                        ? 'Configure unidades y rangos específicos para este equipo'
                        : 'Usando configuración del catálogo global'}
                </CardDescription>
            </CardHeader>

            {habilitarPersonalizacion && (
                <CardContent>
                    <Tabs defaultValue="unidades" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="unidades" className="gap-2">
                                <Gauge className="h-4 w-4" />
                                Unidades
                            </TabsTrigger>
                            <TabsTrigger value="rangos" className="gap-2">
                                <Thermometer className="h-4 w-4" />
                                Rangos
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="unidades" className="space-y-4 pt-4">
                            <p className="text-sm text-muted-foreground mb-4">
                                Seleccione las unidades de medida para cada parámetro. Dejar vacío para usar el valor por defecto.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Temperatura */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Thermometer className="h-4 w-4 text-red-500" />
                                        Temperatura
                                    </Label>
                                    <Select
                                        value={unidades.temperatura || ''}
                                        onValueChange={(v) => handleUnidadChange('temperatura', v)}
                                        disabled={disabled}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={`Por defecto: ${UNIDADES_DEFAULT.temperatura}`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {OPCIONES_UNIDADES.temperatura.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Presión */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Gauge className="h-4 w-4 text-blue-500" />
                                        Presión
                                    </Label>
                                    <Select
                                        value={unidades.presion || ''}
                                        onValueChange={(v) => handleUnidadChange('presion', v)}
                                        disabled={disabled}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={`Por defecto: ${UNIDADES_DEFAULT.presion}`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {OPCIONES_UNIDADES.presion.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Voltaje */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-yellow-500" />
                                        Voltaje
                                    </Label>
                                    <Select
                                        value={unidades.voltaje || ''}
                                        onValueChange={(v) => handleUnidadChange('voltaje', v)}
                                        disabled={disabled}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={`Por defecto: ${UNIDADES_DEFAULT.voltaje}`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {OPCIONES_UNIDADES.voltaje.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Frecuencia */}
                                <div className="space-y-2">
                                    <Label>Frecuencia</Label>
                                    <Select
                                        value={unidades.frecuencia || ''}
                                        onValueChange={(v) => handleUnidadChange('frecuencia', v)}
                                        disabled={disabled}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={`Por defecto: ${UNIDADES_DEFAULT.frecuencia}`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {OPCIONES_UNIDADES.frecuencia.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Corriente */}
                                <div className="space-y-2">
                                    <Label>Corriente</Label>
                                    <Select
                                        value={unidades.corriente || ''}
                                        onValueChange={(v) => handleUnidadChange('corriente', v)}
                                        disabled={disabled}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={`Por defecto: ${UNIDADES_DEFAULT.corriente}`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {OPCIONES_UNIDADES.corriente.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Velocidad */}
                                <div className="space-y-2">
                                    <Label>Velocidad (RPM)</Label>
                                    <Select
                                        value={unidades.velocidad || ''}
                                        onValueChange={(v) => handleUnidadChange('velocidad', v)}
                                        disabled={disabled}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={`Por defecto: ${UNIDADES_DEFAULT.velocidad}`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {OPCIONES_UNIDADES.velocidad.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Vibración (solo para bombas) */}
                                {tipoEquipo === 'BOMBA' && (
                                    <div className="space-y-2">
                                        <Label>Vibración</Label>
                                        <Select
                                            value={unidades.vibracion || ''}
                                            onValueChange={(v) => handleUnidadChange('vibracion', v)}
                                            disabled={disabled}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={`Por defecto: ${UNIDADES_DEFAULT.vibracion}`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {OPCIONES_UNIDADES.vibracion.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="rangos" className="space-y-4 pt-4">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-muted-foreground">
                                    Configure rangos personalizados para alertas.
                                </p>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={cargarValoresPorDefecto}
                                    disabled={disabled}
                                    className="gap-2 bg-green-100 hover:bg-green-200 text-green-700"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Cargar Valores Recomendados
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {parametros.map((param) => (
                                    <Card key={param.key} className="p-4">
                                        <Label className="font-medium mb-3 block">{param.label}</Label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Mín. Normal</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="—"
                                                    value={rangos[param.key]?.min_normal ?? ''}
                                                    onChange={(e) =>
                                                        handleRangoChange(
                                                            param.key,
                                                            'min_normal',
                                                            e.target.value ? parseFloat(e.target.value) : undefined
                                                        )
                                                    }
                                                    disabled={disabled}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Máx. Normal</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="—"
                                                    value={rangos[param.key]?.max_normal ?? ''}
                                                    onChange={(e) =>
                                                        handleRangoChange(
                                                            param.key,
                                                            'max_normal',
                                                            e.target.value ? parseFloat(e.target.value) : undefined
                                                        )
                                                    }
                                                    disabled={disabled}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Mín. Crítico</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="—"
                                                    value={rangos[param.key]?.min_critico ?? ''}
                                                    onChange={(e) =>
                                                        handleRangoChange(
                                                            param.key,
                                                            'min_critico',
                                                            e.target.value ? parseFloat(e.target.value) : undefined
                                                        )
                                                    }
                                                    disabled={disabled}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Máx. Crítico</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="—"
                                                    value={rangos[param.key]?.max_critico ?? ''}
                                                    onChange={(e) =>
                                                        handleRangoChange(
                                                            param.key,
                                                            'max_critico',
                                                            e.target.value ? parseFloat(e.target.value) : undefined
                                                        )
                                                    }
                                                    disabled={disabled}
                                                    className="h-8"
                                                />
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={resetearADefecto}
                            disabled={disabled}
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Restaurar Valores por Defecto
                        </Button>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

export default ConfigParametrosEditor;
