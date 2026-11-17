'use client';

import {
  Activity,
  ArrowUpDown,
  BatteryCharging,
  Box,
  Cpu,
  DoorOpen,
  Droplets,
  Fan,
  Flame,
  Gauge,
  Layers,
  Settings,
  Shield,
  Thermometer,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  zap: Zap,
  droplets: Droplets,
  wrench: Wrench,
  settings: Settings,
  cog: Settings,
  wind: Wind,
  fan: Fan,
  thermometer: Thermometer,
  gauge: Gauge,
  cpu: Cpu,
  arrowupdown: ArrowUpDown,
  dooropen: DoorOpen,
  door: DoorOpen,
  shield: Shield,
  battery: BatteryCharging,
  activity: Activity,
  flame: Flame,
  layers: Layers,
  box: Box,
};

export function resolveEquipoLucideIcon(
  iconoUi?: string | null,
  codigoTipo?: string | null,
): LucideIcon {
  if (iconoUi) {
    const clean = iconoUi.replace(/[-_\s]/g, '').toLowerCase();
    if (ICON_MAP[clean]) return ICON_MAP[clean];
  }
  const code = (codigoTipo || '').toUpperCase();
  if (code.includes('GEN') || code.includes('ELEC')) return Zap;
  if (code.includes('BOM') || code.includes('HIDR')) return Droplets;
  if (code.includes('COMP')) return Wind;
  if (code.includes('HVAC') || code.includes('CHIL') || code.includes('CLIM')) return Thermometer;
  if (code.includes('ELEV') || code.includes('ASC')) return ArrowUpDown;
  if (code.includes('PUER') || code.includes('PORT') || code.includes('ACC')) return DoorOpen;
  if (code.includes('MOT')) return Settings;
  return Wrench;
}
