/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks para la carga de datos en el formulario de equipos
 */

import { getClientes } from '@/features/clientes';
import { useQuery } from '@tanstack/react-query';
import { sedesService } from '../lib/sedes.service';
import { tiposEquipoService } from '../lib/tipos-equipo.service';

/**
 * Hook para obtener el listado de clientes para el selector
 */
export function useClientesSelector() {
  return useQuery({
    queryKey: ['clientes', 'selector'],
    queryFn: async () => {
      const response = await getClientes({ take: 1000 });
      return response.data.map(c => {
        const baseName = c.persona?.nombre_comercial || c.persona?.razon_social || `Cliente ${c.id_cliente}`;
        // ✅ MULTI-SEDE: Si es sede, mostrar "NombreSede (NombrePrincipal)"
        const label = (c as any).nombre_sede
          ? `${(c as any).nombre_sede} (${baseName})`
          : baseName;
        const nit = (c.persona as any)?.numero_documento || '';
        return { value: c.id_cliente.toString(), label, nit };
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para obtener el listado de sedes filtrado por cliente
 */
export function useSedesSelector(idCliente?: number) {
  return useQuery({
    queryKey: ['sedes', 'selector', idCliente],
    queryFn: async () => {
      if (!idCliente) return [];
      const data = await sedesService.listarSedesPorCliente(idCliente);
      return data.map(s => ({
        value: s.id_sede.toString(),
        label: s.nombre_sede,
      }));
    },
    enabled: !!idCliente,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para obtener los tipos de equipo (Generador, Bomba, etc)
 */
export function useTiposEquipoSelector() {
  return useQuery({
    queryKey: ['tipos-equipo', 'selector'],
    queryFn: async () => {
      const data = await tiposEquipoService.listarTodos();
      return data.map(t => ({
        value: t.id_tipo_equipo.toString(),
        label: t.nombre_tipo,
      }));
    },
    staleTime: 1000 * 60 * 60, // 1 hora
  });
}
