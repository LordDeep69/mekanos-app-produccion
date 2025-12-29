/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVICIO FRONTEND: Gestión Unificada de Usuarios
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Servicio que consume el endpoint /usuarios/gestion-completa del backend.
 * Proporciona métodos tipados para crear, buscar y listar usuarios.
 * 
 * PRINCIPIO: El frontend NO conoce la normalización de la BD.
 *            Envía UN paquete de datos, recibe UN resultado.
 * 
 * @author GitHub Copilot (Claude Opus 4.5)
 * @date 2025-12-23
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { apiClient } from '@/lib/api/client';
import {
    BuscarPersonaPayload,
    CreateUsuarioCompletoPayload,
    PersonaExistenteResponse,
    RolDisponible,
    UsuarioCompletoResponse,
    UsuariosListadoResponse,
} from '@/types/usuarios-gestion.types';

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICIO DE GESTIÓN DE USUARIOS
// ═══════════════════════════════════════════════════════════════════════════════

export const usuariosGestionService = {
  /**
   * Crea un usuario completo con todos sus datos en UNA transacción
   * 
   * El backend orquesta:
   *   - Identity Resolution (si persona ya existe)
   *   - Creación de Persona
   *   - Creación de Usuario
   *   - Creación de Empleado (si aplica)
   *   - Asignación de Roles
   * 
   * @param payload Datos del usuario completo
   * @returns Respuesta con IDs creados y password temporal si aplica
   */
  async crearUsuarioCompleto(
    payload: CreateUsuarioCompletoPayload,
  ): Promise<UsuarioCompletoResponse> {
    const response = await apiClient.post<UsuarioCompletoResponse>(
      '/usuarios/gestion-completa',
      payload,
    );
    return response.data;
  },

  /**
   * Busca si existe una persona antes de crear un usuario
   * Útil para Identity Resolution en formularios wizard
   * 
   * @param payload Criterios de búsqueda (cédula, email, o texto libre)
   * @returns Información de la persona y si tiene usuario/empleado asociado
   */
  async buscarPersonaExistente(
    payload: BuscarPersonaPayload,
  ): Promise<PersonaExistenteResponse> {
    const response = await apiClient.post<PersonaExistenteResponse>(
      '/usuarios/buscar-persona',
      payload,
    );
    return response.data;
  },

  /**
   * Lista usuarios con información completa
   * Incluye persona, roles y estado
   * 
   * @param opciones Filtros y paginación
   * @returns Lista de usuarios con paginación
   */
  async listarUsuarios(opciones?: {
    page?: number;
    limit?: number;
    estado?: string;
    busqueda?: string;
  }): Promise<UsuariosListadoResponse> {
    const params = new URLSearchParams();
    
    if (opciones?.page) params.append('page', opciones.page.toString());
    if (opciones?.limit) params.append('limit', opciones.limit.toString());
    if (opciones?.estado) params.append('estado', opciones.estado);
    if (opciones?.busqueda) params.append('busqueda', opciones.busqueda);

    const response = await apiClient.get<UsuariosListadoResponse>(
      `/usuarios/listado-completo?${params.toString()}`,
    );
    return response.data;
  },

  /**
   * Obtiene la lista de roles disponibles para asignar
   * 
   * @returns Lista de roles activos
   */
  async obtenerRolesDisponibles(): Promise<RolDisponible[]> {
    const response = await apiClient.get<RolDisponible[]>('/roles');
    return response.data;
  },

  /**
   * Valida si un username está disponible
   * 
   * @param username Username a verificar
   * @returns true si está disponible
   */
  async validarUsernameDisponible(username: string): Promise<boolean> {
    try {
      const response = await apiClient.get(`/usuarios/verificar-username/${username}`);
      return response.data?.disponible ?? true;
    } catch {
      // Si no existe endpoint, asumimos disponible (se validará en creación)
      return true;
    }
  },

  /**
   * Valida si un email está disponible
   * 
   * @param email Email a verificar
   * @returns true si está disponible
   */
  async validarEmailDisponible(email: string): Promise<boolean> {
    try {
      const response = await apiClient.get(`/usuarios/verificar-email/${email}`);
      return response.data?.disponible ?? true;
    } catch {
      return true;
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK PARA USAR CON REACT QUERY (Opcional)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Keys para React Query
 */
export const usuariosQueryKeys = {
  all: ['usuarios'] as const,
  lists: () => [...usuariosQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...usuariosQueryKeys.lists(), filters] as const,
  details: () => [...usuariosQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...usuariosQueryKeys.details(), id] as const,
  roles: ['roles'] as const,
  personaBusqueda: (query: BuscarPersonaPayload) =>
    ['persona-busqueda', query] as const,
};

export default usuariosGestionService;
